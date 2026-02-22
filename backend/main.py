from __future__ import annotations

import base64
import json
import logging
import os
from datetime import datetime
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from database import (
    get_dashboard_data,
    get_emails_in_bin,
    get_recent_incidents,
    get_severity_stats,
    init_database,
    insert_detection,
)

from gmail_service import GmailService
from ml_service import ModelLoadError, analyze_email
from utils import (
    calculate_final_risk_score,
    calculate_url_risk_score,
    extract_urls,
    load_env,
    severity_from_confidence,
    severity_from_risk_score,
)

# Load environment variables
load_env()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aegisai")

init_database()

app = FastAPI(
    title="AegisAI Email Security Backend",
    version="1.0.0",
)

# ----------------------------
# PRODUCTION URLS
# ----------------------------
BACKEND_URL = "https://ageisai.onrender.com"
FRONTEND_URL = "https://ageis-pl0vmfsra-hima-parvathi-as-projects.vercel.app"

# ----------------------------
# CORS
# ----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Google ID Token Auth
# ----------------------------

class GoogleIdTokenRequest(BaseModel):
    id_token: str


@app.post("/auth/google")
async def auth_google(request: GoogleIdTokenRequest):
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    client_id = os.getenv("GOOGLE_CLIENT_ID")

    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not set")

    try:
        decoded = google_id_token.verify_oauth2_token(
            request.id_token,
            google_requests.Request(),
            client_id,
        )

        return {
            "success": True,
            "user_info": {
                "email": decoded.get("email"),
                "name": decoded.get("name"),
                "picture": decoded.get("picture"),
            },
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ----------------------------
# Gmail OAuth Flow
# ----------------------------

@app.get("/auth/gmail/url")
async def get_gmail_auth_url():
    gmail_service = GmailService()

    # IMPORTANT: production redirect URI
    gmail_service.redirect_uri = f"{BACKEND_URL}/auth/gmail/callback"

    auth_url = gmail_service.get_authorization_url()
    return {"auth_url": auth_url}


def _encode_token_for_redirect(token_data: dict) -> str:
    payload = json.dumps(token_data).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


@app.get("/auth/gmail/callback")
async def auth_gmail_callback(
    code: str = Query(...),
):
    try:
        gmail_service = GmailService()

        # IMPORTANT: production redirect URI
        gmail_service.redirect_uri = f"{BACKEND_URL}/auth/gmail/callback"

        token_data = gmail_service.exchange_code_for_token(code)
        gmail_service.set_credentials(token_data)

        encoded_token = _encode_token_for_redirect(token_data)

        redirect_url = f"{FRONTEND_URL}/dashboard?{urlencode({'token': encoded_token})}"

        return RedirectResponse(url=redirect_url)

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": "Gmail token exchange failed", "details": str(e)},
        )


# ----------------------------
# Fetch + Analyze Emails
# ----------------------------

@app.post("/auth/fetch-emails")
async def fetch_and_analyze_emails(token_data: dict):
    try:
        gmail_service = GmailService()
        gmail_service.set_credentials(token_data)

        user_info = gmail_service.get_user_info()
        user_email = user_info["email"]

        emails = gmail_service.fetch_emails(max_results=50)

        results = []

        for email in emails:
            content = f"{email['subject']} {email.get('snippet', '')}"

            ml_result = analyze_email(content)
            urls = extract_urls(content)

            url_risk = calculate_url_risk_score(urls)
            final_risk = calculate_final_risk_score(
                ml_result.confidence,
                url_risk,
            )

            severity = severity_from_risk_score(final_risk)

            timestamp = datetime.now().isoformat()

            insert_detection(
                user_email=user_email,
                sender=email["sender"],
                subject=email["subject"],
                ml_confidence=ml_result.confidence,
                url_risk_score=url_risk,
                final_risk_score=final_risk,
                severity=severity,
                timestamp=timestamp,
            )

            if severity == "CRITICAL":
                gmail_service.move_to_trash(email["id"])

            results.append({
                "subject": email["subject"],
                "sender": email["sender"],
                "severity": severity,
            })

        return {
            "user_email": user_email,
            "emails_analyzed": len(results),
            "results": results,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------
# Health Check
# ----------------------------

@app.get("/")
async def root():
    return {"status": "AegisAI backend running"}
