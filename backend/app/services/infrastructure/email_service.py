"""
Email Service - sends OTP codes via SMTP (Gmail).
Falls back to console logging when SMTP is not configured.
"""
import smtplib
import random
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.utils.logger import logger

logger.info(f"MODULE LOAD: email_service.py - SMTP_USER is '{settings.SMTP_USER}'")


# ─── OTP store (Redis-backed in production, in-memory for dev) ────────────────

_otp_store: dict[str, dict] = {}   # { email: { code, expires_at } }


def _generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def store_otp(email: str, code: str, ttl_minutes: int = 10) -> None:
    _otp_store[email.lower()] = {
        "code": code,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
    }


def verify_otp(email: str, code: str) -> bool:
    entry = _otp_store.get(email.lower())
    if not entry:
        return False
    if datetime.now(timezone.utc) > entry["expires_at"]:
        _otp_store.pop(email.lower(), None)
        return False
    if entry["code"] != code:
        return False
    _otp_store.pop(email.lower(), None)   # one-time use
    return True


# ─── Email sender ─────────────────────────────────────────────────────────────

def _build_html(otp: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a; color: #fff; margin: 0; padding: 0; }}
    .container {{ max-width: 480px; margin: 40px auto; padding: 40px;
                  background: linear-gradient(135deg,#1a1a2e,#16213e);
                  border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); }}
    .logo {{ font-size: 24px; font-weight: 800;
             background: linear-gradient(90deg,#a855f7,#ec4899);
             -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
    h2 {{ font-size: 20px; margin: 24px 0 8px; }}
    p  {{ color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; }}
    .otp-box {{ margin: 32px 0; text-align: center;
                background: rgba(168,85,247,0.15);
                border: 2px solid rgba(168,85,247,0.4);
                border-radius: 16px; padding: 24px; }}
    .otp {{ font-size: 48px; font-weight: 900; letter-spacing: 12px;
             background: linear-gradient(90deg,#a855f7,#ec4899);
             -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
    .expire {{ font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 8px; }}
    .footer {{ margin-top: 32px; font-size: 12px; color: rgba(255,255,255,0.3);
               text-align: center; border-top: 1px solid rgba(255,255,255,0.08);
               padding-top: 20px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ ResumeAI</div>
    <h2>Password Reset Code</h2>
    <p>We received a request to reset your password. Use the code below — it expires in <strong>10 minutes</strong>.</p>
    <div class="otp-box">
      <div class="otp">{otp}</div>
      <div class="expire">Valid for 10 minutes · Do not share this code</div>
    </div>
    <p>If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    <div class="footer">© 2026 ResumeAI · AI-powered career intelligence</div>
  </div>
</body>
</html>
"""


def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send OTP via SMTP.
    Returns True on success, False on failure.
    Falls back to console log when SMTP is not configured.
    """
    logger.info(f"EXEC: send_otp_email to {to_email} with OTP {otp}")
    subject = f"🔐 Your ResumeAI reset code: {otp}"

    # ── Fallback: no SMTP configured ─────────────────────────────────────────
    logger.info(f"DEBUG: SMTP_USER='{settings.SMTP_USER}', SMTP_PASSWORD_LEN={len(settings.SMTP_PASSWORD)}")
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("DEBUG: Using Email Fallback (Console)")
        logger.warning(
            f"[EMAIL FALLBACK] SMTP not configured. "
            f"OTP for {to_email}: {otp}  (valid 10 min)"
        )
        return True   # pretend success so the flow continues in dev

    logger.info(f"DEBUG: Attempting REAL SMTP send to {to_email} via {settings.SMTP_HOST}...")
    # ── Real SMTP send ────────────────────────────────────────────────────────
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"]      = to_email

        msg.attach(MIMEText(_build_html(otp), "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"OTP email sent to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"DEBUG ERROR: Authentication failed (535). Check your App Password: {e}")
        return False
    except smtplib.SMTPConnectError as e:
        logger.error(f"DEBUG ERROR: Connection failed. Check host/port: {e}")
        return False
    except Exception as e:
        logger.exception(f"DEBUG ERROR: Unexpected error: {type(e).__name__}")
        logger.error(f"Failed to send OTP email: {e}")
        return False


def create_and_send_otp(email: str) -> tuple[bool, str]:
    """Generate OTP, store it, send email. Returns (success, otp)."""
    otp = _generate_otp()
    store_otp(email, otp)
    ok = send_otp_email(email, otp)
    return ok, otp
