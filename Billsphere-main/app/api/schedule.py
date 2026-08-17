from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app.database.database import SessionLocal
from app.models.subscription import Subscription
from app.schemas.subscription import SubscriptionResponse
from app.core.dependencies import require_role
from app.models.user import User

router = APIRouter(prefix="/schedule", tags=["Schedule"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/renewals", response_model=list[SubscriptionResponse])
def upcoming_renewals(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Subscriptions whose current period ends within the next `days` days."""
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(days=days)

    return (
        db.query(Subscription)
        .filter(
            Subscription.status == "active",
            Subscription.current_period_end >= now,
            Subscription.current_period_end <= window_end,
        )
        .all()
    )


@router.get("/past-due", response_model=list[SubscriptionResponse])
def past_due_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Subscriptions currently in past_due status, needing payment retry."""
    return db.query(Subscription).filter(Subscription.status == "past_due").all()