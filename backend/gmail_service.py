from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from utils import b64url_decode, strip_html

logger = logging.getLogger("aegisai")

# Defined exactly once; use only gmail.modify (not gmail.readonly).
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.modify",
]

# Must match Google Cloud Console "Authorized redirect URIs" exactly.
REDIRECT_URI = "http://127.0.0.1:8000/auth/gmail/callback"


def _redirect_uri() -> str:
    uri = (os.getenv("OAUTH_REDIRECT_URI") or REDIRECT_URI).strip()
    return uri.rstrip("/")


def _credentials_json_path() -> Path:
    return Path(__file__).parent / "credentials.json"


def _get_flow() -> Flow:
    """Build Flow from credentials.json if present, else from env (client_id/secret)."""
    redirect_uri = _redirect_uri()
    creds_path = _credentials_json_path()
    if creds_path.is_file():
        flow = Flow.from_client_secrets_file(
            str(creds_path),
            scopes=SCOPES,
            redirect_uri=redirect_uri,
        )
        flow.redirect_uri = redirect_uri
        return flow
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set (or provide credentials.json)")
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = redirect_uri
    return flow


class GmailService:
    """Service for interacting with Gmail API."""

    def __init__(self) -> None:
        self.credentials: Credentials | None = None

    def _get_oauth_config(self):
        """Fetch fresh environment variables at runtime."""
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = _redirect_uri()

        if not client_id or not client_secret:
            raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")

        return client_id, client_secret, redirect_uri

    def get_authorization_url(self) -> str:
        flow = _get_flow()
        authorization_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        return authorization_url

    def exchange_code_for_token(self, authorization_code: str) -> dict[str, Any]:
        flow = _get_flow()
        flow.fetch_token(code=authorization_code)
        credentials = flow.credentials
        return {
            "token": credentials.token,
            "refresh_token": getattr(credentials, "refresh_token", None),
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes) if credentials.scopes else list(SCOPES),
        }

    def set_credentials(self, token_data: dict[str, Any]) -> None:
        self.credentials = Credentials(
            token=token_data["token"],
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data["token_uri"],
            client_id=token_data["client_id"],
            client_secret=token_data["client_secret"],
            scopes=token_data["scopes"],
        )

    def refresh_credentials_if_needed(self) -> None:
        if not self.credentials:
            raise ValueError("Credentials not set")

        if self.credentials.expired and self.credentials.refresh_token:
            self.credentials.refresh(Request())

    def get_user_info(self) -> dict[str, Any]:
        """Return user email (and name if available) from Gmail profile."""
        self.refresh_credentials_if_needed()
        service = build("gmail", "v1", credentials=self.credentials)
        profile = service.users().getProfile(userId="me").execute()
        email = profile.get("emailAddress", "")
        return {"email": email, "name": email}

    def fetch_emails(self, max_results: int = 50) -> list[dict[str, Any]]:
        self.refresh_credentials_if_needed()
        service = build('gmail', 'v1', credentials=self.credentials)

        try:
            results = service.users().messages().list(
                userId='me',
                maxResults=max_results
            ).execute()

            messages = results.get('messages', [])
            emails = []

            for msg in messages:
                message = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()

                headers = message['payload'].get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), '')

                body = self._extract_body(message['payload'])
                snippet = message.get('snippet', '')

                emails.append({
                    "id": msg['id'],
                    "subject": subject,
                    "sender": sender,
                    "snippet": snippet,
                    "body": body,
                    "timestamp": date,
                })

            return emails

        except HttpError as error:
            logger.error(f"Gmail API error: {error}")
            raise

    def move_to_trash(self, message_id: str) -> None:
        """Move a message to Gmail Trash. Requires gmail.modify scope."""
        self.refresh_credentials_if_needed()
        service = build('gmail', 'v1', credentials=self.credentials)
        try:
            service.users().messages().trash(userId='me', id=message_id).execute()
            logger.info("Moved message %s to Trash", message_id)
        except HttpError as error:
            logger.error("Failed to move message %s to Trash: %s", message_id, error)
            raise

    def _extract_body(self, payload: dict[str, Any]) -> str:
        body = ""

        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part.get('body', {}).get('data')
                    if data:
                        body += b64url_decode(data).decode('utf-8', errors='ignore')
                elif part['mimeType'] == 'text/html':
                    data = part.get('body', {}).get('data')
                    if data:
                        html_body = b64url_decode(data).decode('utf-8', errors='ignore')
                        body += strip_html(html_body)
        else:
            data = payload.get('body', {}).get('data')
            if data:
                body = b64url_decode(data).decode('utf-8', errors='ignore')

        return body.strip()