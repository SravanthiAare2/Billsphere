from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from datetime import datetime, timedelta, timezone
from app.database.database import SessionLocal
from app.models.subscription import Subscription
from app.models.customer import Customer
from app.models.plan import Plan
from app.models.audit_log import AuditLog
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionCancelRequest,
    SubscriptionResponse,
)
from app.core.dependencies import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_customer(db: Session, user: User) -> Customer:
    """Find the Customer record matching this logged-in user, or create one."""
    customer = db.query(Customer).filter(Customer.email == user.email).first()
    if customer:
        return customer

    new_customer = Customer(
        name=user.email.split("@")[0],
        email=user.email,
        billing_country="IN",
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer


def log_event(db: Session, entity_id: int, event: str, actor: str):
    """Write a row to audit_logs for a subscription state change."""
    entry = AuditLog(
        entity_type="subscription",
        entity_id=entity_id,
        event=event,
        actor=actor,
    )
    db.add(entry)
    db.commit()


def get_owned_subscription(db: Session, sub_id: int, current_user: User) -> Subscription:
    """Fetch a subscription, enforcing that only its owner or an admin can access it."""
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if current_user.role == "admin":
        return sub

    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer or sub.customer_id != customer.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this subscription")

    return sub


def period_length_days(plan: Plan) -> int:
    return 365 if plan.billing_interval == "yearly" else 30


# ---------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------
@router.post("/", response_model=SubscriptionResponse)
def subscribe(
    sub: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    customer = get_or_create_customer(db, current_user)

    now = datetime.now(timezone.utc)

    if plan.trial_period_days and plan.trial_period_days > 0:
        # Start in trial: the trial period counts as the first "current period"
        status_value = "trial"
        trial_ends_at = now + timedelta(days=plan.trial_period_days)
        period_end = trial_ends_at
    else:
        status_value = "active"
        trial_ends_at = None
        period_end = now + timedelta(days=period_length_days(plan))

    new_sub = Subscription(
        customer_id=customer.id,
        plan_id=plan.id,
        status=status_value,
        trial_ends_at=trial_ends_at,
        current_period_start=now,
        current_period_end=period_end,
        cancel_at_period_end=False,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    log_event(db, new_sub.id, f"subscription.created:{status_value}", current_user.email)
    return new_sub


# ---------------------------------------------------------------------
# LIST MINE
# ---------------------------------------------------------------------
@router.get("/me", response_model=list[SubscriptionResponse])
def my_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.email == current_user.email).first()
    if not customer:
        return []
    return db.query(Subscription).filter(Subscription.customer_id == customer.id).all()


# ---------------------------------------------------------------------
# STATS (admin)
# ---------------------------------------------------------------------
@router.get("/stats")
def subscription_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    rows = (
        db.query(Subscription.status, sql_func.count(Subscription.id))
        .group_by(Subscription.status)
        .all()
    )
    stats = {status: count for status, count in rows}
    for s in ["trial", "active", "past_due", "cancelled"]:
        stats.setdefault(s, 0)
    return stats


# ---------------------------------------------------------------------
# GET single subscription
# ---------------------------------------------------------------------
@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_owned_subscription(db, subscription_id, current_user)


# ---------------------------------------------------------------------
# UPDATE subscription (change plan / toggle cancel_at_period_end)
# ---------------------------------------------------------------------
@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    update: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = get_owned_subscription(db, subscription_id, current_user)

    if sub.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot update a cancelled subscription")

    if update.plan_id is not None:
        new_plan = db.query(Plan).filter(Plan.id == update.plan_id).first()
        if not new_plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        sub.plan_id = new_plan.id
        log_event(db, sub.id, f"subscription.plan_changed:{new_plan.id}", current_user.email)

    if update.cancel_at_period_end is not None:
        sub.cancel_at_period_end = update.cancel_at_period_end

    db.commit()
    db.refresh(sub)
    return sub


# ---------------------------------------------------------------------
# CANCEL (immediate or end-of-cycle)
# ---------------------------------------------------------------------
@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    subscription_id: int,
    cancel: SubscriptionCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = get_owned_subscription(db, subscription_id, current_user)

    if sub.status == "cancelled":
        raise HTTPException(status_code=400, detail="Subscription is already cancelled")

    if cancel.immediate:
        sub.status = "cancelled"
        sub.cancel_at_period_end = False
        sub.current_period_end = datetime.now(timezone.utc)
        log_event(db, sub.id, "subscription.cancelled_immediately", current_user.email)
    else:
        sub.cancel_at_period_end = True
        log_event(db, sub.id, "subscription.cancel_scheduled_at_period_end", current_user.email)

    db.commit()
    db.refresh(sub)
    return sub


# ---------------------------------------------------------------------
# RENEW (start a fresh billing period)
# ---------------------------------------------------------------------
@router.post("/{subscription_id}/renew", response_model=SubscriptionResponse)
def renew_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = get_owned_subscription(db, subscription_id, current_user)

    if sub.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot renew a cancelled subscription")

    plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    now = datetime.now(timezone.utc)
    sub.current_period_start = now
    sub.current_period_end = now + timedelta(days=period_length_days(plan))
    sub.status = "active"
    sub.cancel_at_period_end = False

    db.commit()
    db.refresh(sub)

    log_event(db, sub.id, "subscription.renewed", current_user.email)
    return sub


# ---------------------------------------------------------------------
# EXPIRE (period ended with no successful renewal)
# ---------------------------------------------------------------------
@router.post("/{subscription_id}/expire", response_model=SubscriptionResponse)
def expire_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.status == "cancelled":
        raise HTTPException(status_code=400, detail="Subscription is already cancelled")

    if sub.cancel_at_period_end:
        sub.status = "cancelled"
        log_event(db, sub.id, "subscription.expired_to_cancelled", current_user.email)
    else:
        sub.status = "past_due"
        log_event(db, sub.id, "subscription.expired_to_past_due", current_user.email)

    db.commit()
    db.refresh(sub)
    return sub