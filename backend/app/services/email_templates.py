"""
BillSphere Email Templates

Reusable, branded HTML email templates.

Every template function returns a (subject, html_content) tuple.
All templates share one base shell (_base_template) so branding
stays consistent across every email BillSphere sends.
"""

from __future__ import annotations

from app.core.config import settings


# ==========================================================
# Base Shell
# ==========================================================


def _base_template(
    preheader: str,
    heading: str,
    body_html: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
    footnote: str | None = None,
) -> str:
    """
    Shared branded shell: dark header band with gold accent,
    white body, CTA button, footer with support info.
    """

    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
        <tr>
          <td align="center" style="padding: 28px 0 8px;">
            <a href="{cta_url}"
               style="background: linear-gradient(135deg, #e6c179, #8a7043);
                      color: #1a1305; text-decoration: none;
                      font-weight: 700; font-size: 14px;
                      padding: 13px 28px; border-radius: 6px;
                      display: inline-block; font-family: Arial, sans-serif;">
              {cta_label}
            </a>
          </td>
        </tr>
        """

    footnote_block = ""
    if footnote:
        footnote_block = f"""
        <tr>
          <td style="padding: 18px 36px 0; color: #8a8a8a;
                     font-size: 12px; font-family: Arial, sans-serif;
                     line-height: 1.6;">
            {footnote}
          </td>
        </tr>
        """

    return f"""
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{heading}</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f3f1;
               font-family: Arial, sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden;">
      {preheader}
    </span>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#f4f3f1; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                 style="background:#ffffff; border-radius: 12px; overflow:hidden;
                        box-shadow: 0 2px 12px rgba(0,0,0,0.06);">

            <!-- Header band -->
            <tr>
              <td style="background:#0a0a0b; padding: 26px 36px;">
                <span style="color:#e6c179; font-size: 20px; font-weight: 800;
                             letter-spacing: -0.02em; font-family: Arial, sans-serif;">
                  BillSphere
                </span>
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td style="padding: 32px 36px 4px;">
                <h1 style="margin:0; font-size: 20px; color:#141414;
                           font-family: Arial, sans-serif;">
                  {heading}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 12px 36px 0; color:#3d3d3d; font-size: 14px;
                         line-height: 1.65; font-family: Arial, sans-serif;">
                {body_html}
              </td>
            </tr>

            {cta_block}
            {footnote_block}

            <!-- Footer -->
            <tr>
              <td style="padding: 30px 36px 26px;">
                <hr style="border:none; border-top:1px solid #ececec; margin:0 0 16px;" />
                <p style="margin:0; color:#9a9a9a; font-size: 11.5px;
                          font-family: Arial, sans-serif; line-height:1.6;">
                  {settings.COMPANY_NAME} &middot;
                  Questions? Reach us at
                  <a href="mailto:{settings.COMPANY_EMAIL}" style="color:#8a7043;">
                    {settings.COMPANY_EMAIL}
                  </a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


# ==========================================================
# Customer: Registration Welcome
# ==========================================================


def welcome_customer_email(first_name: str) -> tuple[str, str]:
    login_url = f"{settings.FRONTEND_URL}/login"

    subject = "Welcome to BillSphere 🎉"

    body = f"""
    <p>Hi {first_name},</p>
    <p>Welcome to <strong>BillSphere</strong> -- your account has been
    created successfully.</p>
    <p>BillSphere helps you manage subscriptions, invoices, and payments
    all in one place. Your account is ready to go.</p>
    <p>Click below to log in and get started.</p>
    """

    html = _base_template(
        preheader="Your BillSphere account is ready.",
        heading="Welcome to BillSphere",
        body_html=body,
        cta_label="Login Now",
        cta_url=login_url,
        footnote="If you did not create this account, please contact support immediately.",
    )

    return subject, html


# ==========================================================
# Customer: Login
# ==========================================================


def login_customer_email(first_name: str) -> tuple[str, str]:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    plans_url = f"{settings.FRONTEND_URL}/plans"

    subject = "Welcome back to BillSphere 👋"

    body = f"""
    <p>Hi {first_name},</p>
    <p>You've successfully logged in to your BillSphere account.
    Thanks for coming back!</p>
    <p>Explore your dashboard, or browse available plans if you're
    looking to subscribe.</p>
    """

    html = _base_template(
        preheader="You've successfully logged in to BillSphere.",
        heading="Login Successful",
        body_html=body,
        cta_label="Go to Dashboard",
        cta_url=dashboard_url,
        footnote=(
            f'Looking to explore plans? <a href="{plans_url}" '
            'style="color:#8a7043;">View Plans</a>'
        ),
    )

    return subject, html


# ==========================================================
# Admin: Login
# ==========================================================


def login_admin_email(first_name: str) -> tuple[str, str]:
    dashboard_url = f"{settings.FRONTEND_URL}/"

    subject = "BillSphere Admin Login Successful"

    body = f"""
    <p>Hi {first_name},</p>
    <p>You've successfully logged in to the BillSphere admin dashboard.</p>
    <p>If this wasn't you, please secure your account immediately and
    contact support.</p>
    """

    html = _base_template(
        preheader="Admin login successful.",
        heading="Admin Login Successful",
        body_html=body,
        cta_label="Open Admin Dashboard",
        cta_url=dashboard_url,
    )

    return subject, html


# ==========================================================
# Admin: New Customer Registered
# ==========================================================


def admin_new_customer_email(
    customer_name: str,
    customer_email: str,
    registered_at: str,
) -> tuple[str, str]:
    dashboard_url = f"{settings.FRONTEND_URL}/customers"

    subject = "New customer registered"

    body = f"""
    <p>A new customer has registered on BillSphere.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="margin-top: 12px; font-size: 13.5px;">
      <tr>
        <td style="padding: 4px 0; color:#8a8a8a;">Name</td>
        <td style="padding: 4px 0; font-weight:600;">{customer_name}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color:#8a8a8a;">Email</td>
        <td style="padding: 4px 0; font-weight:600;">{customer_email}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color:#8a8a8a;">Registered</td>
        <td style="padding: 4px 0; font-weight:600;">{registered_at}</td>
      </tr>
    </table>
    """

    html = _base_template(
        preheader=f"New customer registered: {customer_name}",
        heading="New Customer Registered",
        body_html=body,
        cta_label="View Customers",
        cta_url=dashboard_url,
    )

    return subject, html


# ==========================================================
# Customer: Invoice Generated
# ==========================================================


def invoice_generated_email(
    customer_name: str,
    invoice_number: str,
    amount: str | None = None,
) -> tuple[str, str]:
    dashboard_url = f"{settings.FRONTEND_URL}/invoices"

    subject = "BillSphere Invoice Generated"

    amount_line = f"<p>Amount due: <strong>{amount}</strong></p>" if amount else ""

    body = f"""
    <p>Hi {customer_name},</p>
    <p>A new invoice has been generated for your account.</p>
    <p>Invoice number: <strong>{invoice_number}</strong></p>
    {amount_line}
    """

    html = _base_template(
        preheader=f"Invoice {invoice_number} has been generated.",
        heading="Invoice Generated",
        body_html=body,
        cta_label="View Invoice",
        cta_url=dashboard_url,
    )

    return subject, html


# ==========================================================
# Customer: Payment Successful
# ==========================================================


def payment_success_email(
    customer_name: str,
    payment_id: int,
    amount: str | None = None,
) -> tuple[str, str]:
    dashboard_url = f"{settings.FRONTEND_URL}/payments"

    subject = "Payment Successful — BillSphere"

    amount_line = f"<p>Amount: <strong>{amount}</strong></p>" if amount else ""

    body = f"""
    <p>Hi {customer_name},</p>
    <p>Your payment was completed successfully.</p>
    <p>Payment reference: <strong>#{payment_id}</strong></p>
    {amount_line}
    <p>Status: <strong style="color:#4caf7d;">Completed</strong></p>
    """

    html = _base_template(
        preheader="Your payment was successful.",
        heading="Payment Successful",
        body_html=body,
        cta_label="View Dashboard",
        cta_url=dashboard_url,
    )

    return subject, html


# ==========================================================
# Customer: Payment Failed
# ==========================================================


def payment_failed_email(
    customer_name: str,
    payment_id: int,
    reason: str | None = None,
) -> tuple[str, str]:
    retry_url = f"{settings.FRONTEND_URL}/payments"

    subject = "Payment Failed — Action Required"

    reason_line = (
        f"<p>Reason: <strong>{reason}</strong></p>" if reason else ""
    )

    body = f"""
    <p>Hi {customer_name},</p>
    <p>We were unable to process your payment.</p>
    <p>Payment reference: <strong>#{payment_id}</strong></p>
    {reason_line}
    <p>Please retry your payment to avoid service interruption.</p>
    """

    html = _base_template(
        preheader="Your payment could not be processed.",
        heading="Payment Failed",
        body_html=body,
        cta_label="Retry Payment",
        cta_url=retry_url,
    )

    return subject, html


# ==========================================================
# Customer: Payment Confirmation Required
# ==========================================================


def payment_confirmation_email(
    customer_name: str,
    plan_name: str,
    billing_cycle: str,
    amount: str,
    currency: str,
    payment_id: int,
    invoice_number: str,
    confirm_url: str,
    reject_url: str,
) -> tuple[str, str]:
    subject = "Payment Confirmation Required - BillSphere"
    body = f"""
    <p>Hi {customer_name},</p>
    <p>A payment confirmation is required for your BillSphere subscription.</p>
    <p>Plan: <strong>{plan_name}</strong></p>
    <p>Billing: <strong>{billing_cycle}</strong></p>
    <p>Amount: <strong>{currency} {amount}</strong></p>
    <p>Invoice: <strong>{invoice_number}</strong></p>
    <p>Payment reference: <strong>#{payment_id}</strong></p>
    <p>This payment is currently awaiting your confirmation.</p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:10px;">
          <a href="{confirm_url}" style="background:#4caf7d;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:6px;display:inline-block;">YES - CONFIRM PAYMENT</a>
        </td>
        <td>
          <a href="{reject_url}" style="background:#b34a4a;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:6px;display:inline-block;">NO - REJECT PAYMENT</a>
        </td>
      </tr>
    </table>
    <p>If you did not initiate this payment, reject it.</p>
    """
    html = _base_template(
        preheader="Your BillSphere payment is awaiting confirmation.",
        heading="Payment Confirmation Required",
        body_html=body,
        footnote="This confirmation link expires and can only be used once.",
    )
    return subject, html


# ==========================================================
# Customer: Invoice Overdue
# ==========================================================


def invoice_overdue_email(
    invoice_id: int,
    amount: str | None = None,
    due_date: str | None = None,
) -> tuple[str, str]:
    dashboard_url = f"{settings.FRONTEND_URL}/invoices"

    subject = "Invoice Overdue — BillSphere"

    amount_line = f"<p>Amount due: <strong>{amount}</strong></p>" if amount else ""
    due_line = f"<p>Due date: <strong>{due_date}</strong></p>" if due_date else ""

    body = f"""
    <p>Your invoice <strong>#{invoice_id}</strong> is now overdue.</p>
    {amount_line}
    {due_line}
    <p>Please make a payment as soon as possible to avoid disruption
    to your subscription.</p>
    """

    html = _base_template(
        preheader=f"Invoice #{invoice_id} is overdue.",
        heading="Invoice Overdue",
        body_html=body,
        cta_label="Pay Now",
        cta_url=dashboard_url,
    )

    return subject, html


# ==========================================================
# Customer: Subscription Expiring
# ==========================================================


def subscription_expiry_email(
    subscription_name: str,
    expiry_date: str,
) -> tuple[str, str]:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

    subject = "Your BillSphere Subscription Is Expiring"

    body = f"""
    <p>Your <strong>{subscription_name}</strong> subscription is set to
    expire on <strong>{expiry_date}</strong>.</p>
    <p>Renew now to keep uninterrupted access.</p>
    """

    html = _base_template(
        preheader=f"Your subscription expires on {expiry_date}.",
        heading="Subscription Expiring Soon",
        body_html=body,
        cta_label="Manage Subscription",
        cta_url=dashboard_url,
    )

    return subject, html


# ==========================================================
# Admin: Generic Event Notification
# ==========================================================


def admin_generic_event_email(
    title: str,
    message: str,
) -> tuple[str, str]:
    """
    Used for: payment received, payment failure requires attention,
    new invoice generated, new subscription created, subscription
    cancelled -- all admin-facing (not customer-facing) wording.
    """

    dashboard_url = f"{settings.FRONTEND_URL}/"

    body = f"<p>{message}</p>"

    html = _base_template(
        preheader=title,
        heading=title,
        body_html=body,
        cta_label="Open Admin Dashboard",
        cta_url=dashboard_url,
    )

    return title, html
