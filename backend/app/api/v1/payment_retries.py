"""
BillSphere Payment Retry API
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import database_session, get_current_user_token
from app.models.payment_retry import PaymentRetry

router = APIRouter(prefix="/payment-retries", tags=["Payment Retries"])


@router.get("")
def list_retries(
    status_filter: str | None = Query(default=None, alias="status"),
    payment_id: int | None = None,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    query = db.query(PaymentRetry)
    if status_filter:
        query = query.filter(PaymentRetry.status == status_filter)
    if payment_id:
        query = query.filter(PaymentRetry.payment_id == payment_id)
    items = query.order_by(PaymentRetry.retry_date.asc().nullslast(), PaymentRetry.id.asc()).all()
    return {
        "total": len(items),
        "retry_schedule_days": [1, 3, 7],
        "items": items,
    }
