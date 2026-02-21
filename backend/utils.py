from __future__ import annotations

import base64
import logging
import os
import re
from typing import Iterable

from dotenv import load_dotenv
from pathlib import Path

logger = logging.getLogger("aegisai")


SUSPICIOUS_KEYWORDS: list[str] = [
    "urgent",
    "verify",
    "password",
    "click",
    "bank",
    "account",
    "login",
]


def load_env() -> None:
    """
    Load .env from current directory first, then backend directory (overrides).
    """
    load_dotenv(override=False)
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path, override=True)

def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000").strip()
    if not raw:
        return ["http://localhost:3000"]
    if raw == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


def find_suspicious_words(text: str, keywords: Iterable[str] | None = None) -> list[str]:
    haystack = (text or "").lower()
    words = keywords or SUSPICIOUS_KEYWORDS
    found: list[str] = []
    for kw in words:
        if kw.lower() in haystack:
            found.append(kw.lower())
    return sorted(set(found))


def risk_level_from_confidence(confidence: float) -> str:
    if confidence < 0.5:
        return "Low"
    if confidence <= 0.8:
        return "Medium"
    return "High"


def severity_from_confidence(confidence: float) -> str:
    """Map confidence to severity: LOW, MEDIUM, HIGH, CRITICAL."""
    if confidence < 0.4:
        return "LOW"
    if confidence < 0.6:
        return "MEDIUM"
    if confidence < 0.85:
        return "HIGH"
    return "CRITICAL"


_TAG_RE = re.compile(r"<[^>]+>")


def strip_html(html: str) -> str:
    if not html:
        return ""
    return _TAG_RE.sub(" ", html).replace("\u00a0", " ").strip()


def b64url_decode(data: str) -> bytes:
    if not data:
        return b""
    # Gmail uses URL-safe base64 without padding
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def safe_get_env(name: str, default: str | None = None) -> str | None:
    v = os.getenv(name)
    if v is None:
        return default
    v = v.strip()
    return v if v else default


# URL extraction and risk scoring
_URL_PATTERN = re.compile(
    r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
)


def extract_urls(text: str) -> list[str]:
    """Extract all URLs from text."""
    if not text:
        return []
    urls = _URL_PATTERN.findall(text)
    return list(set(urls))  # Remove duplicates


_SUSPICIOUS_DOMAINS = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly',
    'short.link', 'rebrand.ly', 'cutt.ly', 'is.gd'
]

_SUSPICIOUS_PATTERNS = [
    r'login[^a-zA-Z]', r'verify[^a-zA-Z]', r'secure[^a-zA-Z]',
    r'account[^a-zA-Z]', r'update[^a-zA-Z]', r'confirm[^a-zA-Z]',
    r'password[^a-zA-Z]', r'bank[^a-zA-Z]', r'paypal[^a-zA-Z]',
    r'urgent[^a-zA-Z]', r'click[^a-zA-Z]', r'verify-your',
]


def calculate_url_risk_score(urls: list[str]) -> float:
    """
    Calculate risk score for URLs (0.0 to 1.0).
    Higher score = more suspicious.
    """
    if not urls:
        return 0.0
    
    total_score = 0.0
    for url in urls:
        url_lower = url.lower()
        score = 0.0
        
        # Check for suspicious domains
        for domain in _SUSPICIOUS_DOMAINS:
            if domain in url_lower:
                score += 0.3
                break
        
        # Check for suspicious patterns
        for pattern in _SUSPICIOUS_PATTERNS:
            if re.search(pattern, url_lower):
                score += 0.2
        
        # Check for IP addresses (often suspicious)
        if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
            score += 0.25
        
        # Check for excessive path length (phishing sites often have long paths)
        parsed = url.split('?')[0]  # Remove query params
        if len(parsed) > 100:
            score += 0.15
        
        total_score += min(score, 1.0)  # Cap at 1.0 per URL
    
    # Average score across all URLs, but boost if multiple URLs
    avg_score = total_score / len(urls)
    if len(urls) > 1:
        avg_score = min(avg_score * 1.2, 1.0)
    
    return float(min(avg_score, 1.0))


def calculate_final_risk_score(ml_confidence: float, url_risk_score: float) -> float:
    """
    Combine ML confidence and URL risk into final risk score.
    ml_confidence: 0.0-1.0 (probability of phishing)
    url_risk_score: 0.0-1.0 (suspiciousness of URLs)
    Returns: 0.0-1.0
    """
    # Weighted combination: 70% ML, 30% URL risk
    final = (ml_confidence * 0.7) + (url_risk_score * 0.3)
    return float(min(final, 1.0))


def severity_from_risk_score(risk_score: float) -> str:
    """Convert risk score to severity level."""
    if risk_score >= 0.8:
        return "CRITICAL"
    elif risk_score >= 0.5:
        return "WARNING"
    else:
        return "LOW"

