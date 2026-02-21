from __future__ import annotations

import logging
from datetime import datetime

import secrets
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

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    google_id_token = None
    google_requests = None
from utils import (
    calculate_final_risk_score,
    calculate_url_risk_score,
    extract_urls,
    get_cors_origins,
    load_env,
    severity_from_confidence,
    severity_from_risk_score,
)

# Load environment variables
load_env()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aegisai")

# Initialize database
init_database()

app = FastAPI(
    title="AegisAI Email Security Backend",
    version="1.0.0",
    description="FastAPI service for phishing detection with Gmail integration.",
)

# CORS middleware - allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Short-lived store for Gmail token claim (state -> token_data) after callback redirect
_pending_gmail_tokens: dict[str, dict] = {}


# Request/Response models
class AnalyzeEmailRequest(BaseModel):
    user_email: str
    sender: str
    subject: str
    content: str
    snippet: str | None = None
    timestamp: str | None = None


class AnalyzeEmailResponse(BaseModel):
    detection_id: int
    ml_confidence: float
    url_risk_score: float
    final_risk_score: float
    severity: str
    urls_found: list[str]


class GoogleIdTokenRequest(BaseModel):
    id_token: str


# Google ID Token auth (no redirect, no code exchange)
@app.post("/auth/google")
async def auth_google(request: GoogleIdTokenRequest):
    """Verify Google ID token (JWT) and return user info. No redirect_uri or code exchange."""
    import os
    if not google_id_token or not google_requests:
        logger.error("Google auth: google.oauth2.id_token or transport not available")
        return JSONResponse(
            status_code=500,
            content={"error": "Google auth not configured", "details": "google-auth not installed"},
        )
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        logger.error("Google auth: GOOGLE_CLIENT_ID not set")
        return JSONResponse(
            status_code=500,
            content={"error": "Server misconfiguration", "details": "GOOGLE_CLIENT_ID not set"},
        )
    logger.info("Google auth: verifying ID token (audience=%s)", client_id[:20] + "...")
    try:
        decoded = google_id_token.verify_oauth2_token(
            request.id_token,
            google_requests.Request(),
            client_id,
        )
        email = decoded.get("email")
        name = decoded.get("name") or decoded.get("email") or "User"
        picture = decoded.get("picture")
        if not email:
            logger.warning("Google auth: token missing email claim")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid token", "details": "Missing email in token"},
            )
        logger.info("Google auth: success for email=%s", email)
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "user_info": {"email": email, "name": name, "picture": picture},
            },
        )
    except ValueError as e:
        err_msg = str(e)
        logger.warning("Google auth: token verification ValueError: %s", err_msg)
        return JSONResponse(
            status_code=400,
            content={"error": "OAuth token verification failed", "details": err_msg},
        )
    except Exception as e:
        err_msg = str(e)
        logger.exception("Google auth: unexpected error during verification")
        return JSONResponse(
            status_code=400,
            content={"error": "OAuth token verification failed", "details": err_msg},
        )


class GmailCodeRequest(BaseModel):
    code: str


# Gmail connect flow: redirect_uri = http://127.0.0.1:8000/auth/gmail/callback
@app.get("/auth/gmail/url")
async def get_gmail_auth_url() -> dict[str, str]:
    """Return Gmail OAuth URL. Uses access_type=offline, prompt=consent, redirect_uri=http://127.0.0.1:8000/auth/gmail/callback."""
    try:
        gmail_service = GmailService()
        auth_url = gmail_service.get_authorization_url()
        logger.info("Gmail auth URL generated (redirect_uri=http://127.0.0.1:8000/auth/gmail/callback)")
        return {"auth_url": auth_url}
    except Exception as e:
        logger.exception("Error generating Gmail auth URL")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/auth/gmail/callback", response_model=None)
async def auth_gmail_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str | None = Query(None),
    format: str | None = Query(None, alias="format"),
):
    """Receive code from Google, exchange for tokens. Returns JSON or redirects to frontend with state for claim."""
    try:
        gmail_service = GmailService()
        token_data = gmail_service.exchange_code_for_token(code)
        gmail_service.set_credentials(token_data)
        user_info = gmail_service.get_user_info()
        logger.info("Gmail callback: token exchange success for email=%s", user_info.get("email"))

        access_token = token_data.get("token")
        refresh_token = token_data.get("refresh_token")
        id_token = token_data.get("id_token")  # Gmail OAuth typically does not return id_token

        if format == "json":
            return JSONResponse(
                status_code=200,
                content={
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "id_token": id_token,
                },
            )

        # Default: redirect to frontend with state so it can claim full token_data
        claim_state = state or secrets.token_urlsafe(32)
        _pending_gmail_tokens[claim_state] = token_data
        frontend_url = "http://localhost:3000"
        return RedirectResponse(url=f"{frontend_url}/#gmail-state={claim_state}", status_code=302)
    except Exception as e:
        err_msg = str(e)
        logger.warning("Gmail callback exchange failed: %s", err_msg)
        return JSONResponse(
            status_code=400,
            content={"error": "Gmail token exchange failed", "details": err_msg},
        )


class GmailClaimRequest(BaseModel):
    state: str


@app.post("/auth/gmail/claim", response_model=None)
async def auth_gmail_claim(request: GmailClaimRequest):
    """Frontend claims token_data by state after redirect from callback."""
    token_data = _pending_gmail_tokens.pop(request.state, None)
    if not token_data:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid or expired state", "details": "Token already claimed or state not found"},
        )
    try:
        gmail_service = GmailService()
        gmail_service.set_credentials(token_data)
        user_info = gmail_service.get_user_info()
        return JSONResponse(
            status_code=200,
            content={"success": True, "token_data": token_data, "user_info": user_info},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to get user info", "details": str(e)},
        )


@app.post("/auth/gmail/token")
async def exchange_gmail_code(request: GmailCodeRequest):
    """Exchange Gmail OAuth code for tokens. redirect_uri must match auth URL (http://localhost:3000)."""
    try:
        gmail_service = GmailService()
        token_data = gmail_service.exchange_code_for_token(request.code)
        gmail_service.set_credentials(token_data)
        user_info = gmail_service.get_user_info()
        logger.info("Gmail token exchange success for email=%s", user_info.get("email"))
        return {"success": True, "token_data": token_data, "user_info": user_info}
    except Exception as e:
        err_msg = str(e)
        logger.warning("Gmail token exchange failed: %s", err_msg)
        return JSONResponse(
            status_code=400,
            content={"error": "Gmail token exchange failed", "details": err_msg},
        )


@app.post("/auth/fetch-emails")
async def fetch_and_analyze_emails(
    token_data: dict,
    max_results: int = Query(default=50, ge=1, le=100),
) -> dict:
    """Fetch emails from Gmail and analyze them."""
    required = {"token", "token_uri", "client_id", "client_secret", "scopes"}
    if not all(k in token_data for k in required):
        raise HTTPException(
            status_code=400,
            detail="Invalid token_data: missing required fields (token, token_uri, client_id, client_secret, scopes)",
        )
    try:
        gmail_service = GmailService()
        gmail_service.set_credentials(token_data)
        user_info = gmail_service.get_user_info()
        user_email = user_info["email"]
        
        # Fetch emails
        emails = gmail_service.fetch_emails(max_results=max_results)
        
        # Analyze each email
        results = []
        for email in emails:
            # Combine subject, snippet, and body for analysis
            content = f"{email['subject']} {email['snippet']} {email.get('body', '')}"
            
            # Run ML analysis
            ml_result = analyze_email(content)
            
            # Extract URLs
            urls = extract_urls(content)
            url_risk = calculate_url_risk_score(urls)
            
            # Calculate final risk
            final_risk = calculate_final_risk_score(ml_result.confidence, url_risk)
            severity = severity_from_risk_score(final_risk)
            
            # Store in database
            timestamp = email.get('timestamp') or datetime.now().isoformat()
            detection_id = insert_detection(
                user_email=user_email,
                sender=email['sender'],
                subject=email['subject'],
                ml_confidence=ml_result.confidence,
                url_risk_score=url_risk,
                final_risk_score=final_risk,
                severity=severity,
                timestamp=timestamp,
                email_snippet=email.get('snippet'),
                urls_found=','.join(urls) if urls else None,
            )
            
            results.append({
                "detection_id": detection_id,
                "subject": email['subject'],
                "sender": email['sender'],
                "severity": severity,
                "final_risk_score": final_risk,
            })
        
        return {
            "user_email": user_email,
            "emails_analyzed": len(results),
            "results": results,
        }
    except Exception as e:
        logger.exception("Error fetching/analyzing emails")
        raise HTTPException(status_code=500, detail=str(e)) from e


# Analysis endpoint
@app.post("/analyze-email", response_model=AnalyzeEmailResponse)
async def analyze_email_endpoint(request: AnalyzeEmailRequest) -> AnalyzeEmailResponse:
    """Analyze a single email."""
    try:
        # Combine content for analysis
        content = f"{request.subject} {request.snippet or ''} {request.content}"
        
        # Run ML analysis
        ml_result = analyze_email(content)
        
        # Extract URLs
        urls = extract_urls(content)
        url_risk = calculate_url_risk_score(urls)
        
        # Calculate final risk
        final_risk = calculate_final_risk_score(ml_result.confidence, url_risk)
        severity = severity_from_risk_score(final_risk)
        
        # Store in database
        timestamp = request.timestamp or datetime.now().isoformat()
        detection_id = insert_detection(
            user_email=request.user_email,
            sender=request.sender,
            subject=request.subject,
            ml_confidence=ml_result.confidence,
            url_risk_score=url_risk,
            final_risk_score=final_risk,
            severity=severity,
            timestamp=timestamp,
            email_snippet=request.snippet,
            urls_found=','.join(urls) if urls else None,
        )
        
        return AnalyzeEmailResponse(
            detection_id=detection_id,
            ml_confidence=ml_result.confidence,
            url_risk_score=url_risk,
            final_risk_score=final_risk,
            severity=severity,
            urls_found=urls,
        )
    except ModelLoadError as exc:
        logger.exception("Failed to load or use ML model.")
        raise HTTPException(status_code=500, detail="Model is not available") from exc
    except Exception as exc:
        logger.exception("Unexpected error during analysis.")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


# Dashboard endpoints
@app.get("/dashboard/{user_email}")
async def get_dashboard(user_email: str) -> dict:
    """Get dashboard data for a user."""
    try:
        return get_dashboard_data(user_email)
    except Exception as e:
        logger.exception(f"Error getting dashboard data for {user_email}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/recent-incidents/{user_email}")
async def get_recent_incidents_endpoint(
    user_email: str,
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """Get recent incidents for a user."""
    try:
        incidents = get_recent_incidents(user_email, limit)
        return {"incidents": incidents}
    except Exception as e:
        logger.exception(f"Error getting recent incidents for {user_email}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/severity-stats/{user_email}")
async def get_severity_stats_endpoint(user_email: str) -> dict:
    """Get severity statistics for a user."""
    try:
        return get_severity_stats(user_email)
    except Exception as e:
        logger.exception(f"Error getting severity stats for {user_email}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/emails-in-bin/{user_email}")
async def get_emails_in_bin_endpoint(user_email: str) -> dict:
    """Get emails in bin (threats) for a user."""
    try:
        emails = get_emails_in_bin(user_email)
        return {"emails": emails, "count": len(emails)}
    except Exception as e:
        logger.exception(f"Error getting emails in bin for {user_email}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# Simple analyze endpoint (raw content) - used by frontend
class AnalyzeRequest(BaseModel):
    content: str


class AnalyzeResponse(BaseModel):
    prediction: int
    confidence: float
    risk_level: str
    suspicious_words: list[str]
    severity: str
    explanation: str


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(payload: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze raw email/text content. Returns prediction, confidence, risk_level, suspicious_words, severity, explanation."""
    try:
        content = payload.content or ""
        result = analyze_email(content)
        severity = severity_from_confidence(result.confidence)
        # Build human-readable explanation
        parts = []
        if result.prediction == 1:
            parts.append("This content was classified as likely phishing.")
        else:
            parts.append("This content was classified as likely safe.")
        parts.append(f"Confidence: {result.confidence:.0%}.")
        if result.suspicious_words:
            parts.append(f"Suspicious keywords found: {', '.join(result.suspicious_words)}.")
        explanation = " ".join(parts)
        return AnalyzeResponse(
            prediction=result.prediction,
            confidence=round(float(result.confidence), 4),
            risk_level=result.risk_level,
            suspicious_words=result.suspicious_words,
            severity=severity,
            explanation=explanation.strip(),
        )
    except ModelLoadError as exc:
        logger.exception("Failed to load or use ML model.")
        raise HTTPException(status_code=500, detail="Model is not available") from exc
    except Exception as exc:
        logger.exception("Unexpected error during analysis.")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@app.get("/", include_in_schema=False)
async def root_health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "AegisAI backend running"}
