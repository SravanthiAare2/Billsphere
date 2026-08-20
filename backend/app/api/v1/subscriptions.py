"""
BillSphere Subscription API

Endpoints:
- Create subscription
- List subscriptions
- Get subscription
- Update subscription
- Activate subscription
- Cancel subscription
- Pause subscription
- Resume subscription
- Cancel at period end
- Change plan
- Subscription history
"""

from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
)

from sqlalchemy.orm import Session

from app.dependencies import (
    database_session,
    get_current_user_token,
)

from app.models.subscription_history import (
    SubscriptionHistory,
)

from app.schemas.subscription import (
    CancelAtPeriodEndRequest,
    PauseSubscriptionRequest,
    ResumeSubscriptionRequest,
    SubscriptionCancelRequest,
    SubscriptionCreate,
    SubscriptionPlanChangeRequest,
    SubscriptionHistoryListResponse,
    SubscriptionResponse,
    SubscriptionListResponse,
    SubscriptionUpdate,
)

from app.services.subscription_service import (
    activate_subscription,
    cancel_at_period_end,
    cancel_subscription,
    create_subscription,
    get_subscription_by_id,
    list_subscriptions,
    pause_subscription,
    resume_subscription,
    update_subscription,
    change_plan_with_proration,
)


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions"],
)


# ==========================================================
# Create Subscription
# ==========================================================


@router.post(
    "",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    subscription_data: SubscriptionCreate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Create a new customer subscription.

    The selected plan_id is validated against the plans table.
    """

    created_by = int(
        current_user["sub"],
    )

    return create_subscription(
        db=db,
        subscription_data=subscription_data,
        created_by=created_by,
    )


# ==========================================================
# List Subscriptions
# ==========================================================


@router.get(
    "",
    response_model=SubscriptionListResponse,
)
def list_all(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    status_filter: str | None = Query(
        default=None,
        description="Filter subscriptions by lifecycle status.",
    ),
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    List subscriptions.
    """

    created_by = int(
        current_user["sub"],
    )

    return list_subscriptions(
        db=db,
        created_by=created_by,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
    )


@router.get(
    "/me",
    response_model=SubscriptionListResponse,
)
def list_my_subscriptions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=100),
    status_filter: str | None = Query(default=None),
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """Return subscriptions belonging to the authenticated customer."""

    return list_subscriptions(
        db=db,
        created_by=int(current_user["sub"]),
        page=page,
        page_size=page_size,
        status_filter=status_filter,
    )


# ==========================================================
# Change Plan With Proration
# ==========================================================


@router.post(
    "/{subscription_id}/change-plan",
)
def change_plan(
    subscription_id: int,
    request: SubscriptionPlanChangeRequest,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Change an existing subscription to another active plan.

    The selected new_plan_id is validated before the
    proration calculation is performed.
    """

    created_by = int(
        current_user["sub"],
    )

    return change_plan_with_proration(
        db=db,
        subscription_id=subscription_id,
        new_plan_id=request.new_plan_id,
        created_by=created_by,
    )


# ==========================================================
# Get Subscription
# ==========================================================


@router.get(
    "/{subscription_id}",
    response_model=SubscriptionResponse,
)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Get subscription details.
    """

    created_by = int(
        current_user["sub"],
    )

    return get_subscription_by_id(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
    )


# ==========================================================
# Update Subscription
# ==========================================================


@router.put(
    "/{subscription_id}",
    response_model=SubscriptionResponse,
)
def update(
    subscription_id: int,
    subscription_data: SubscriptionUpdate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Update subscription.
    """

    created_by = int(
        current_user["sub"],
    )

    return update_subscription(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
        subscription_data=subscription_data,
    )


# ==========================================================
# Activate Subscription
# ==========================================================


@router.post(
    "/{subscription_id}/activate",
    response_model=SubscriptionResponse,
)
def activate(
    subscription_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Activate a trial or past_due subscription.
    """

    created_by = int(
        current_user["sub"],
    )

    return activate_subscription(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
    )


# ==========================================================
# Immediate Cancellation
# ==========================================================


@router.post(
    "/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
)
@router.put(
    "/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
)
def cancel(
    subscription_id: int,
    request: SubscriptionCancelRequest | None = None,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Immediately cancel a subscription.
    """

    created_by = int(
        current_user["sub"],
    )

    return cancel_subscription(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
        reason=request.reason if request else None,
    )


# ==========================================================
# Pause Subscription
# ==========================================================


@router.post(
    "/{subscription_id}/pause",
    response_model=SubscriptionResponse,
)
def pause(
    subscription_id: int,
    request: PauseSubscriptionRequest,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Pause an active subscription.
    """

    created_by = int(
        current_user["sub"],
    )

    return pause_subscription(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
        reason=request.reason,
    )


# ==========================================================
# Resume Subscription
# ==========================================================


@router.post(
    "/{subscription_id}/resume",
    response_model=SubscriptionResponse,
)
def resume(
    subscription_id: int,
    request: ResumeSubscriptionRequest,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Resume a paused subscription.
    """

    created_by = int(
        current_user["sub"],
    )

    return resume_subscription(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
        reason=request.reason,
    )


# ==========================================================
# Cancel At Period End
# ==========================================================


@router.post(
    "/{subscription_id}/cancel-at-period-end",
    response_model=SubscriptionResponse,
)
def cancel_at_billing_period_end(
    subscription_id: int,
    request: CancelAtPeriodEndRequest,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Schedule subscription cancellation at the end of
    the current billing period.
    """

    created_by = int(
        current_user["sub"],
    )

    return cancel_at_period_end(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
        reason=request.reason,
    )


# ==========================================================
# Subscription History
# ==========================================================


@router.get(
    "/{subscription_id}/history",
    response_model=SubscriptionHistoryListResponse,
)
def history(
    subscription_id: int,
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Get lifecycle history for a subscription.
    """

    created_by = int(
        current_user["sub"],
    )

    # ------------------------------------------------------
    # Verify subscription exists
    # ------------------------------------------------------

    get_subscription_by_id(
        db=db,
        subscription_id=subscription_id,
        created_by=created_by,
    )

    # ------------------------------------------------------
    # Query history
    # ------------------------------------------------------

    query = (
        db.query(SubscriptionHistory)
        .filter(
            SubscriptionHistory.subscription_id
            == subscription_id
        )
    )

    total = query.count()

    history_items = (
        query
        .order_by(
            SubscriptionHistory.id.desc()
        )
        .offset(
            (page - 1) * page_size
        )
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": history_items,
    }