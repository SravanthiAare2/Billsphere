"""
BillSphere Analytics Service

Dashboard metrics for the React admin dashboard:
MRR, churn, trial conversion, revenue by plan, invoice status,
subscription lifecycle and failed payment queue.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.payment_retry import PaymentRetry
from app.models.plan import Plan
from app.models.subscription import Subscription


def _decimal(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def get_dashboard_analytics(db: Session) -> dict:
    total_customers = db.query(Customer).count()
    total_plans = db.query(Plan).count()
    total_invoices = db.query(Invoice).count()
    total_payments = db.query(Payment).count()

    active_subs = db.query(Subscription).filter(Subscription.status == "active").all()
    mrr = Decimal("0.00")
    for sub in active_subs:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if not plan:
            continue
        price = _decimal(plan.price)
        cycle = str(sub.billing_cycle or plan.billing_cycle).lower()
        if cycle in {"annual", "yearly"}:
            price = (price / Decimal("12")).quantize(Decimal("0.01"))
        elif cycle == "quarterly":
            price = (price / Decimal("3")).quantize(Decimal("0.01"))
        mrr += price

    paid_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.status == "completed"
    ).scalar()
    refunded = db.query(func.coalesce(func.sum(Payment.refunded_amount), 0)).filter(
        Payment.refunded_amount.is_not(None)
    ).scalar()

    cancelled = db.query(Subscription).filter(Subscription.status == "cancelled").count()
    total_started = db.query(Subscription).count()
    trials = db.query(Subscription).filter(Subscription.status == "trial").count()
    # Count subscriptions that have ever transitioned trial -> active.
    from app.models.subscription_history import SubscriptionHistory
    converted_trials = (
        db.query(SubscriptionHistory)
        .filter(
            SubscriptionHistory.previous_status == "trial",
            SubscriptionHistory.new_status == "active",
        )
        .count()
    )
    trial_total = (
        db.query(SubscriptionHistory.subscription_id)
        .filter(SubscriptionHistory.previous_status == "trial")
        .distinct()
        .count()
        + trials
    )
    trial_conversion = (
        round((converted_trials / trial_total) * 100, 2)
        if trial_total else 0.0
    )

    churn_rate = round((cancelled / total_started) * 100, 2) if total_started else 0.0

    invoice_status = {}
    for status_value, count in (
        db.query(Invoice.status, func.count(Invoice.id))
        .group_by(Invoice.status)
        .all()
    ):
        invoice_status[status_value] = count

    revenue_by_plan = []
    rows = (
        db.query(
            Plan.id,
            Plan.name,
            func.coalesce(func.sum(Payment.amount), 0),
        )
        .join(Subscription, Subscription.plan_id == Plan.id)
        .join(Invoice, Invoice.subscription_id == Subscription.id)
        .join(Payment, Payment.invoice_id == Invoice.id)
        .filter(Payment.status == "completed")
        .group_by(Plan.id, Plan.name)
        .order_by(Plan.id)
        .all()
    )
    for plan_id, name, revenue in rows:
        revenue_by_plan.append({
            "plan_id": plan_id,
            "plan_name": name,
            "revenue": _decimal(revenue),
        })

    failed_payment_queue = db.query(PaymentRetry).filter(
        PaymentRetry.status == "scheduled"
    ).count()

    return {
        "customers": total_customers,
        "plans": total_plans,
        "active_subscriptions": len(active_subs),
        "invoices": total_invoices,
        "payments": total_payments,
        "revenue": _decimal(paid_revenue),
        "refunded_revenue": _decimal(refunded),
        "mrr": _decimal(mrr),
        "churn_rate_percent": churn_rate,
        "trial_conversion_rate_percent": trial_conversion,
        "invoice_status": invoice_status,
        "failed_payment_queue": failed_payment_queue,
        "revenue_by_plan": revenue_by_plan,
        "subscription_lifecycle": {
            "trial": db.query(Subscription).filter(Subscription.status == "trial").count(),
            "active": db.query(Subscription).filter(Subscription.status == "active").count(),
            "paused": db.query(Subscription).filter(Subscription.status == "paused").count(),
            "past_due": db.query(Subscription).filter(Subscription.status == "past_due").count(),
            "cancelled": cancelled,
        },
    }
