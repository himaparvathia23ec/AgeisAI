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
    get_cors_origins,
    load_env,
    severity_from_confidence,
    severity_from_risk_score,
)

# --------------------------------------------------
# INITIAL SETUP
# --------------------------------------------------

load_env()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aegisai")

init_database()

app = FastAPI(
    title="AegisAI Backend",
    version="1.0.0",
)

# --------------------------------------------------
# CORS CONFIG (must allow frontend origin for preflight + requests)
# --------------------------------------------------

_DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ageis-ai-nine.vercel.app",
    "https://ageis-pl0vmfsra-hima-parvathi-as-projects.vercel.app",
]


def _cors_origins() -> list[str]:
    env_origins = get_cors_origins()
    if env_origins == ["*"]:
        return ["*"]
    combined = list(_DEFAULT_CORS_ORIGINS)
    for o in env_origins:
        if o and o not in combined:
            combined.append(o)
    return combined


_origins = _cors_origins()
logger.info("CORS allow_origins: %s", _origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return {"status": "AegisAI backend running"}


# --------------------------------------------------
# GOOGLE GMAIL OAUTH
# --------------------------------------------------

def encode_token(token_data: dict) -> str:
    payload = json.dumps(token_data).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("utf-8").rstrip("=")


@app.get("/auth/gmail/url")
async def get_gmail_auth_url():
    try:
        gmail = GmailService()
        url = gmail.get_authorization_url()
        return {"auth_url": url}
    except Exception as e:
        logger.exception("Failed generating Gmail auth URL")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/gmail/callback")
async def gmail_callback(code: str = Query(...)):
    try:
        gmail = GmailService()
        token_data = gmail.exchange_code_for_token(code)
        gmail.set_credentials(token_data)

        user_info = gmail.get_user_info()
        logger.info("Gmail connected for %s", user_info.get("email"))
        # Include user_info so frontend can set user state after redirect (login flow)
        payload = {
            "token_data": token_data,
            "user_info": {
                "email": user_info.get("email", ""),
                "name": user_info.get("name", user_info.get("email", "")),
            },
        }
        encoded = encode_token(payload)

        # ✅ IMPORTANT: Redirect to your Vercel frontend
        frontend_dashboard = (
            "https://ageis-pl0vmfsra-hima-parvathi-as-projects.vercel.app/dashboard"
        )

        redirect_url = f"{frontend_dashboard}?{urlencode({'token': encoded})}"

        return RedirectResponse(url=redirect_url, status_code=302)

    except Exception as e:
        logger.exception("Gmail OAuth failed")
        return JSONResponse(
            status_code=400,
            content={"error": "OAuth failed", "details": str(e)},
        )


# --------------------------------------------------
# FETCH + ANALYZE EMAILS
# --------------------------------------------------

@app.post("/auth/fetch-emails")
async def fetch_and_analyze(token_data: dict, max_results: int = 50):

    required = {"token", "token_uri", "client_id", "client_secret", "scopes"}

    if not all(k in token_data for k in required):
        raise HTTPException(status_code=400, detail="Invalid token data")

    try:
        gmail = GmailService()
        gmail.set_credentials(token_data)

        user_info = gmail.get_user_info()
        user_email = user_info["email"]

        emails = gmail.fetch_emails(max_results=max_results)

        results = []

        for email in emails:
            content = f"{email['subject']} {email['snippet']} {email.get('body','')}"

            ml_result = analyze_email(content)

            urls = extract_urls(content)
            url_risk = calculate_url_risk_score(urls)
            final_risk = calculate_final_risk_score(
                ml_result.confidence, url_risk
            )

            severity = severity_from_risk_score(final_risk)

            detection_id = insert_detection(
                user_email=user_email,
                sender=email["sender"],
                subject=email["subject"],
                ml_confidence=ml_result.confidence,
                url_risk_score=url_risk,
                final_risk_score=final_risk,
                severity=severity,
                timestamp=email.get("timestamp") or datetime.now().isoformat(),
                email_snippet=email.get("snippet"),
                urls_found=",".join(urls) if urls else None,
            )

            results.append({
                "id": email["id"],
                "subject": email["subject"],
                "sender": email["sender"],
                "severity": severity,
                "deleted": False,
            })

        return {
            "user_email": user_email,
            "emails_analyzed": len(results),
            "results": results,
        }

    except Exception as e:
        logger.exception("Email fetch failed")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------
# ANALYZE RAW CONTENT
# --------------------------------------------------

class AnalyzeRequest(BaseModel):
    content: str


@app.post("/analyze")
async def analyze_endpoint(payload: AnalyzeRequest):

    try:
        result = analyze_email(payload.content)
        severity = severity_from_confidence(result.confidence)

        return {
            "prediction": result.prediction,
            "confidence": round(float(result.confidence), 4),
            "risk_level": result.risk_level,
            "suspicious_words": result.suspicious_words,
            "severity": severity,
        }

    except ModelLoadError:
        raise HTTPException(status_code=500, detail="Model not available")


# --------------------------------------------------
# DASHBOARD ROUTES
# --------------------------------------------------

@app.get("/dashboard/{user_email}")
async def dashboard(user_email: str):
    return get_dashboard_data(user_email)


@app.get("/recent-incidents/{user_email}")
async def recent(user_email: str):
    return {"incidents": get_recent_incidents(user_email, 20)}


@app.get("/severity-stats/{user_email}")
async def stats(user_email: str):
    return get_severity_stats(user_email)


@app.get("/emails-in-bin/{user_email}")
async def bin_emails(user_email: str):
    emails = get_emails_in_bin(user_email)
    return {"emails": emails, "count": len(emails)}
