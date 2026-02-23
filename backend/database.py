from __future__ import annotations

import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger("aegisai")

DB_PATH = Path(__file__).parent / "aegisai.db"


def get_db_connection() -> sqlite3.Connection:
    """Get a database connection."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    return conn


def init_database() -> None:
    """Initialize the database schema."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS detections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            sender TEXT NOT NULL,
            subject TEXT NOT NULL,
            ml_confidence REAL NOT NULL,
            url_risk_score REAL NOT NULL,
            final_risk_score REAL NOT NULL,
            severity TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            email_snippet TEXT,
            urls_found TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_email ON detections(user_email)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_timestamp ON detections(timestamp)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_severity ON detections(severity)
    """)
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")


def insert_detection(
    user_email: str,
    sender: str,
    subject: str,
    ml_confidence: float,
    url_risk_score: float,
    final_risk_score: float,
    severity: str,
    timestamp: str,
    email_snippet: str | None = None,
    urls_found: str | None = None,
) -> int:
    """Insert a detection record and return the ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO detections 
        (user_email, sender, subject, ml_confidence, url_risk_score, 
         final_risk_score, severity, timestamp, email_snippet, urls_found)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_email, sender, subject, ml_confidence, url_risk_score,
        final_risk_score, severity, timestamp, email_snippet, urls_found
    ))
    
    detection_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return detection_id


def get_dashboard_data(user_email: str) -> dict[str, Any]:
    """Get dashboard statistics for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Total scanned
    cursor.execute("""
        SELECT COUNT(*) as count FROM detections WHERE user_email = ?
    """, (user_email,))
    total_scanned = cursor.fetchone()["count"]
    
    # Total phishing (where prediction = 1 or high risk)
    cursor.execute("""
        SELECT COUNT(*) as count FROM detections 
        WHERE user_email = ? AND (final_risk_score >= 0.5 OR severity IN ('CRITICAL', 'WARNING'))
    """, (user_email,))
    total_phishing = cursor.fetchone()["count"]
    
    # Severity counts
    cursor.execute("""
        SELECT severity, COUNT(*) as count 
        FROM detections 
        WHERE user_email = ?
        GROUP BY severity
    """, (user_email,))
    severity_rows = cursor.fetchall()
    severity_counts = {row["severity"]: row["count"] for row in severity_rows}
    
    # Weekly trend (last 7 days)
    cursor.execute("""
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM detections
        WHERE user_email = ? 
        AND timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
    """, (user_email,))
    weekly_trend = [
        {"date": row["date"], "count": row["count"]}
        for row in cursor.fetchall()
    ]
    
    # Recent incidents: fetch more then deduplicate by (sender, subject) so each threat shows once
    cursor.execute("""
        SELECT id, sender, subject, severity, timestamp, final_risk_score
        FROM detections
        WHERE user_email = ?
        ORDER BY timestamp DESC
        LIMIT 100
    """, (user_email,))
    seen_keys: set[tuple[str, str]] = set()
    recent_incidents = []
    for row in cursor.fetchall():
        key = (row["sender"] or "", row["subject"] or "")
        if key in seen_keys:
            continue
        seen_keys.add(key)
        recent_incidents.append({
            "id": str(row["id"]),
            "sender": row["sender"],
            "subject": row["subject"],
            "severity": row["severity"],
            "timestamp": row["timestamp"],
            "risk_score": row["final_risk_score"],
        })
        if len(recent_incidents) >= 10:
            break
    
    conn.close()
    
    return {
        "total_scanned": total_scanned,
        "total_phishing": total_phishing,
        "severity_counts": {
            "CRITICAL": severity_counts.get("CRITICAL", 0),
            "WARNING": severity_counts.get("WARNING", 0),
            "LOW": severity_counts.get("LOW", 0),
        },
        "weekly_trend": weekly_trend,
        "recent_incidents": recent_incidents,
    }


def get_recent_incidents(user_email: str, limit: int = 20) -> list[dict[str, Any]]:
    """Get recent incidents for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, sender, subject, severity, timestamp, final_risk_score, email_snippet
        FROM detections
        WHERE user_email = ?
        ORDER BY timestamp DESC
        LIMIT ?
    """, (user_email, limit * 5))
    
    seen_keys: set[tuple[str, str]] = set()
    incidents = []
    for row in cursor.fetchall():
        key = (row["sender"] or "", row["subject"] or "")
        if key in seen_keys:
            continue
        seen_keys.add(key)
        incidents.append({
            "id": str(row["id"]),
            "sender": row["sender"],
            "subject": row["subject"],
            "severity": row["severity"],
            "timestamp": row["timestamp"],
            "risk_score": row["final_risk_score"],
            "snippet": row["email_snippet"],
        })
        if len(incidents) >= limit:
            break
    
    conn.close()
    return incidents


def get_severity_stats(user_email: str) -> dict[str, Any]:
    """Get severity statistics for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT severity, COUNT(*) as count, AVG(final_risk_score) as avg_risk
        FROM detections
        WHERE user_email = ?
        GROUP BY severity
    """, (user_email,))
    
    stats = {}
    for row in cursor.fetchall():
        stats[row["severity"]] = {
            "count": row["count"],
            "avg_risk": round(row["avg_risk"] or 0.0, 2),
        }
    
    conn.close()
    return stats


def get_emails_in_bin(user_email: str) -> list[dict[str, Any]]:
    """Get emails marked as phishing/threats (in bin)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, sender, subject, severity, timestamp, final_risk_score, email_snippet
        FROM detections
        WHERE user_email = ? 
        AND (final_risk_score >= 0.5 OR severity IN ('CRITICAL', 'WARNING'))
        ORDER BY timestamp DESC
    """, (user_email,))
    
    emails = [
        {
            "id": str(row["id"]),
            "sender": row["sender"],
            "subject": row["subject"],
            "severity": row["severity"],
            "timestamp": row["timestamp"],
            "risk_score": row["final_risk_score"],
            "snippet": row["email_snippet"],
        }
        for row in cursor.fetchall()
    ]
    
    conn.close()
    return emails
