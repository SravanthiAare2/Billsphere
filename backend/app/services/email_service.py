"""
BillSphere Email Service

Handles:

- SMTP connection to Gmail
- HTML + plain-text email sending
- Centralized error handling and logging

This is the ONLY place SMTP code should live. Every other
service sends email by calling send_email() from here.

Uses Python's built-in smtplib/email libraries -- no extra
dependency required.
"""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.core.config import settings
from app.core.logging import app_logger


def send_email(
    recipient: str,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> bool:
    """
    Send an HTML email (with plain-text fallback) via Gmail SMTP.

    Returns True on success, False on any failure. NEVER raises --
    callers (registration, login, billing operations) must not be
    blocked by an email provider being unavailable.

    Never logs the SMTP password.
    """

    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        app_logger.warning(
            "Email not sent: MAIL_USERNAME/MAIL_PASSWORD not configured. "
            f"recipient={recipient}, subject='{subject}'"
        )
        return False

    if not recipient:
        app_logger.warning(
            f"Email not sent: no recipient address. subject='{subject}'"
        )
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = formataddr(
        (settings.MAIL_FROM_NAME, settings.MAIL_FROM)
    )
    message["To"] = recipient

    fallback_text = text_content or _strip_html(html_content)

    message.attach(MIMEText(fallback_text, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        if settings.MAIL_SSL_TLS:
            server = smtplib.SMTP_SSL(
                settings.MAIL_SERVER, settings.MAIL_PORT, timeout=10
            )
        else:
            server = smtplib.SMTP(
                settings.MAIL_SERVER, settings.MAIL_PORT, timeout=10
            )

        with server:
            if settings.MAIL_STARTTLS and not settings.MAIL_SSL_TLS:
                server.starttls()

            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(
                settings.MAIL_FROM, [recipient], message.as_string()
            )

        app_logger.info(
            f"Email sent successfully: recipient={recipient}, "
            f"subject='{subject}'"
        )
        return True

    except smtplib.SMTPAuthenticationError as exc:
        app_logger.error(
            "Email send failed (SMTP authentication error -- check "
            "MAIL_USERNAME and MAIL_PASSWORD / Gmail App Password): "
            f"recipient={recipient}, subject='{subject}', error={exc}"
        )
        return False

    except Exception as exc:
        app_logger.error(
            f"Email send failed: recipient={recipient}, "
            f"subject='{subject}', error={exc}"
        )
        return False


def _strip_html(html: str) -> str:
    """
    Very small HTML-to-text fallback for the plain-text part
    of the email. Not meant to be a full renderer.
    """

    import re

    text = re.sub(r"<br\s*/?>", "\n", html)
    text = re.sub(r"</p>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()
