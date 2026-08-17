"""
BillSphere Report Service

Handles:
- Revenue reports
- Subscription reports
- Customer reports
- Tax summary reports
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.payment import Payment
from app.models.subscription import Subscription



# ==========================================================
# Revenue Report
# ==========================================================

def generate_revenue_report(
    db: Session,
):
    """
    Generate revenue summary.
    """

    total_invoice_amount = (
        db.query(
            func.coalesce(
                func.sum(
                    Invoice.total_amount
                ),
                0,
            )
        )
        .scalar()
    )


    total_paid_amount = (
        db.query(
            func.coalesce(
                func.sum(
                    Payment.amount
                ),
                0,
            )
        )
        .filter(
            Payment.status == "completed"
        )
        .scalar()
    )


    total_refunded_amount = (
        db.query(
            func.coalesce(
                func.sum(
                    Payment.refunded_amount
                ),
                0,
            )
        )
        .filter(
            Payment.status == "refunded"
        )
        .scalar()
    )


    return {
        "generated_at": datetime.now(
            timezone.utc
        ),
        "total_invoice_amount":
            total_invoice_amount,
        "total_paid_amount":
            total_paid_amount,
        "total_refunded_amount":
            total_refunded_amount,
    }



# ==========================================================
# Customer Report
# ==========================================================

def generate_customer_report(
    db: Session,
):
    """
    Customer analytics.
    """

    total_customers = (
        db.query(Customer)
        .count()
    )


    return {
        "total_customers":
            total_customers,
    }



# ==========================================================
# Subscription Report
# ==========================================================

def generate_subscription_report(
    db: Session,
):
    """
    Subscription analytics.
    """

    active = (
        db.query(Subscription)
        .filter(
            Subscription.status == "active"
        )
        .count()
    )


    cancelled = (
        db.query(Subscription)
        .filter(
            Subscription.status == "cancelled"
        )
        .count()
    )


    past_due = (
        db.query(Subscription)
        .filter(
            Subscription.status == "past_due"
        )
        .count()
    )


    return {
        "active_subscriptions":
            active,

        "cancelled_subscriptions":
            cancelled,

        "past_due_subscriptions":
            past_due,
    }



# ==========================================================
# Tax Summary Report
# ==========================================================

def generate_tax_summary_report(
    db: Session,
):
    """
    Summarize tax collected across all invoices, broken
    down by tax line item type (CGST / SGST / IGST).
    """

    total_tax_collected = (
        db.query(
            func.coalesce(
                func.sum(Invoice.tax_amount),
                0,
            )
        )
        .scalar()
    )

    cgst_total = (
        db.query(
            func.coalesce(func.sum(InvoiceLineItem.amount), 0)
        )
        .filter(InvoiceLineItem.description.like("CGST%"))
        .scalar()
    )

    sgst_total = (
        db.query(
            func.coalesce(func.sum(InvoiceLineItem.amount), 0)
        )
        .filter(InvoiceLineItem.description.like("SGST%"))
        .scalar()
    )

    igst_total = (
        db.query(
            func.coalesce(func.sum(InvoiceLineItem.amount), 0)
        )
        .filter(InvoiceLineItem.description.like("IGST%"))
        .scalar()
    )

    invoice_count = db.query(Invoice).count()

    return {
        "generated_at": datetime.now(timezone.utc),
        "total_tax_collected": total_tax_collected,
        "cgst_total": cgst_total,
        "sgst_total": sgst_total,
        "igst_total": igst_total,
        "invoice_count": invoice_count,
    }