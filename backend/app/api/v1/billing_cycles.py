"""
BillSphere Billing Cycle API

Operational endpoints for:
- viewing billing cycles
- starting a subscription cycle
- manually processing a due subscription
- running all due billing cycles
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import database_session, get_current_user_token
from app.models.billing_cycle import BillingCycle
from app.services.billing_cycle_service import (
    process_due_subscriptions,
    process_subscription_billing_period,
    start_subscription_billing_cycle,
)

router = APIRouter(prefix="/billing-cycles", tags=["Billing Cycles"])


@router.get("/subscription/{subscription_id}")
def list_subscription_cycles(
    subscription_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    items = (
        db.query(BillingCycle)
        .filter(BillingCycle.subscription_id == subscription_id)
        .order_by(BillingCycle.id.desc())
        .all()
    )
    return {
        "total": len(items),
        "items": items,
    }


@router.post("/subscription/{subscription_id}/start")
def start_cycle(
    subscription_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    from app.models.subscription import Subscription
    subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    cycle = start_subscription_billing_cycle(db, subscription)
    db.commit()
    db.refresh(cycle)
    return cycle


@router.post("/subscription/{subscription_id}/process")
def process_cycle(
    subscription_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    return process_subscription_billing_period(db, subscription_id)


@router.post("/process-due")
def process_due(
    limit: int = 100,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    if limit < 1 or limit > 500:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 500.")
    return process_due_subscriptions(db, limit=limit)
