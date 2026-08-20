"""
BillSphere Database Models

Central SQLAlchemy model registry.

Importing this package registers all BillSphere database
models with the shared SQLAlchemy Base metadata.
"""

# ==========================================================
# Core Models
# ==========================================================

from app.models.user import User
from app.models.customer import Customer
from app.models.plan import Plan


# ==========================================================
# Subscription Models
# ==========================================================

from app.models.subscription import Subscription
from app.models.subscription_history import SubscriptionHistory
from app.models.billing_cycle import BillingCycle


# ==========================================================
# Invoice Models
# ==========================================================

from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem


# ==========================================================
# Payment Models
# ==========================================================

from app.models.payment import Payment
from app.models.payment_retry import PaymentRetry
from app.models.payment_confirmation import PaymentConfirmation


# ==========================================================
# Notification / Audit Models
# ==========================================================

from app.models.notification import Notification
from app.models.audit_log import AuditLog


# ==========================================================
# Usage Models
# ==========================================================

from app.models.usage_record import UsageRecord


# ==========================================================
# Public Model Registry
# ==========================================================

__all__ = [
    # Core
    "User",
    "Customer",
    "Plan",

    # Subscription
    "Subscription",
    "SubscriptionHistory",
    "BillingCycle",

    # Invoice
    "Invoice",
    "InvoiceLineItem",

    # Payment
    "Payment",
    "PaymentRetry",
    "PaymentConfirmation",

    # Notifications / Audit
    "Notification",
    "AuditLog",

    # Usage
    "UsageRecord",
]