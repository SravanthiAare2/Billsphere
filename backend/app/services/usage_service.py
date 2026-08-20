"""
BillSphere Usage Service

Handles:
- Recording metered usage against a subscription
- Listing usage records
- Aggregating unbilled usage for invoice generation
"""

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.usage_record import UsageRecord
from app.schemas.usage_record import UsageRecordCreate


def record_usage(db: Session, usage_data: UsageRecordCreate) -> UsageRecord:
    """
    Record a metered usage charge for a subscription.
    """

    subscription = (
        db.query(Subscription)
        .filter(Subscription.id == usage_data.subscription_id)
        .first()
    )

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    amount = usage_data.quantity * usage_data.unit_price

    usage = UsageRecord(
        subscription_id=usage_data.subscription_id,
        description=usage_data.description,
        quantity=usage_data.quantity,
        unit_price=usage_data.unit_price,
        amount=amount,
    )

    db.add(usage)
    db.commit()
    db.refresh(usage)

    return usage


def list_usage_for_subscription(db: Session, subscription_id: int) -> dict:
    """
    List all usage records for a subscription.
    """

    items = (
        db.query(UsageRecord)
        .filter(UsageRecord.subscription_id == subscription_id)
        .order_by(UsageRecord.id.desc())
        .all()
    )

    return {"total": len(items), "items": items}


def get_unbilled_usage(db: Session, subscription_id: int) -> list[UsageRecord]:
    """
    Return usage records not yet attached to an invoice.
    """

    return (
        db.query(UsageRecord)
        .filter(
            UsageRecord.subscription_id == subscription_id,
            UsageRecord.invoiced.is_(False),
        )
        .all()
    )


def mark_usage_invoiced(
    db: Session, usage_records: list[UsageRecord], invoice_id: int
) -> None:
    """
    Mark a batch of usage records as billed against an invoice.
    """

    for record in usage_records:
        record.invoiced = True
        record.invoice_id = invoice_id

    db.commit()


def total_unbilled_amount(usage_records: list[UsageRecord]) -> Decimal:
    """
    Sum the amount across a list of usage records.
    """

    return sum((r.amount for r in usage_records), Decimal("0.00"))