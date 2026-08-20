"""
BillSphere Usage API

Endpoints:
    POST /usage
    GET  /usage/subscription/{subscription_id}

Purpose:
    API endpoints for recording and retrieving metered usage
    associated with subscriptions.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import (
    database_session,
    get_current_user_token,
)

# ----------------------------------------------------------
# Schemas
# ----------------------------------------------------------

from app.schemas.usage_record import (
    UsageRecordCreate,
    UsageRecordListResponse,
    UsageRecordResponse,
)

# ----------------------------------------------------------
# Services
# ----------------------------------------------------------

from app.services.usage_service import (
    record_usage,
    list_usage_for_subscription,
)


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/usage",
    tags=["Usage"],
)


# ==========================================================
# Create Usage Record
# ==========================================================

@router.post(
    "",
    response_model=UsageRecordResponse,
    status_code=201,
)
def create_usage(
    usage_data: UsageRecordCreate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Record a metered usage charge for a subscription.
    """

    return record_usage(
        db=db,
        usage_data=usage_data,
    )


# ==========================================================
# Get Usage For Subscription
# ==========================================================

@router.get(
    "/subscription/{subscription_id}",
    response_model=UsageRecordListResponse,
)
def get_usage(
    subscription_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Return all usage records associated with a subscription.
    """

    return list_usage_for_subscription(
        db=db,
        subscription_id=subscription_id,
    )