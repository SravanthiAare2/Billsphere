"""
BillSphere Email Utility

Handles sending emails.

Features:
- SMTP configuration
- Send generic email
- Send invoice email
- Send payment confirmation email
"""

import smtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


from app.core.config import settings



# ==========================================================
# Send Email
# ==========================================================

def send_email(
    recipient: str,
    subject: str,
    body: str,
) -> bool:
    """
    Sends email using SMTP.

    Returns:
        True  -> success
        False -> failed
    """

    try:

        message = MIMEMultipart()

        message["From"] = settings.EMAIL_FROM

        message["To"] = recipient

        message["Subject"] = subject


        message.attach(
            MIMEText(
                body,
                "html",
            )
        )


        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
        ) as server:


            server.starttls()


            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )


            server.sendmail(
                settings.EMAIL_FROM,
                recipient,
                message.as_string(),
            )


        return True


    except Exception as error:

        print(
            f"Email sending failed: {error}"
        )

        return False



# ==========================================================
# Invoice Email
# ==========================================================

def send_invoice_email(
    customer_email: str,
    invoice_number: str,
    amount: float,
) -> bool:
    """
    Sends invoice notification email.
    """

    subject = (
        f"BillSphere Invoice {invoice_number}"
    )


    body = f"""
    <html>

    <body>

        <h2>
            BillSphere Invoice Generated
        </h2>


        <p>
            Your invoice
            <b>{invoice_number}</b>
            has been generated.
        </p>


        <p>
            Amount:
            <b>₹ {amount}</b>
        </p>


        <p>
            Thank you for using BillSphere.
        </p>


    </body>

    </html>
    """


    return send_email(
        customer_email,
        subject,
        body,
    )



# ==========================================================
# Payment Success Email
# ==========================================================

def send_payment_success_email(
    customer_email: str,
    invoice_number: str,
    amount: float,
) -> bool:
    """
    Sends payment confirmation email.
    """

    subject = (
        "Payment Successful - BillSphere"
    )


    body = f"""
    <html>

    <body>

        <h2>
            Payment Received Successfully
        </h2>


        <p>
            Invoice:
            <b>{invoice_number}</b>
        </p>


        <p>
            Amount Paid:
            <b>₹ {amount}</b>
        </p>


        <p>
            Your subscription is active.
        </p>


    </body>

    </html>
    """


    return send_email(
        customer_email,
        subject,
        body,
    )