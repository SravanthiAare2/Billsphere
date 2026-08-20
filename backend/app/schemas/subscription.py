"""
BillSphere Subscription Schemas

Handles:

- Subscription creation
- Subscription updates
- Subscription cancellation
- Pause / Resume
- Cancel at period end
- Subscription lifecycle transitions
- Subscription history
- Subscription responses
- Paginated subscription responses
"""

from datetime import datetime
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


# ==========================================================
# Base Subscription
# ==========================================================


class SubscriptionBase(BaseModel):
    """
    Common subscription fields.
    """

    customer_id: int = Field(
        ...,
        gt=0,
        description="Customer ID.",
    )

    plan_id: int = Field(
        ...,
        gt=0,
        description="Selected subscription plan ID.",
    )


# ==========================================================
# Create Subscription
# ==========================================================


class SubscriptionCreate(SubscriptionBase):
    """
    Create subscription request.

    The selected plan_id is the source of truth for:

    - Billing cycle
    - Trial duration
    - Plan pricing
    - Plan entitlements

    The backend loads the selected plan from the database.
    """

    billing_cycle: str | None = Field(
        default=None,
        description=(
            "Optional billing cycle override. "
            "If omitted, the selected plan's billing cycle is used."
        ),
    )

    status: str = Field(
        default="trial",
        description=(
            "Initial subscription status. "
            "Allowed values: trial or active."
        ),
    )

    start_date: datetime = Field(
        ...,
        description="Subscription start date.",
    )

    end_date: datetime | None = Field(
        default=None,
        description=(
            "Optional subscription end date. "
            "For trial subscriptions, the plan trial_days "
            "is used when this is not provided."
        ),
    )


# ==========================================================
# Plan Change
# ==========================================================


class SubscriptionPlanChangeRequest(BaseModel):
    """
    Request to change an existing subscription to another plan.
    """

    new_plan_id: int = Field(
        ...,
        gt=0,
        description="ID of the new active subscription plan.",
    )


# ==========================================================
# Update Subscription
# ==========================================================


class SubscriptionUpdate(BaseModel):
    """
    Update subscription request.

    Lifecycle status changes are validated by the
    subscription state machine.
    """

    plan_id: int | None = Field(
        default=None,
        gt=0,
        description="New plan ID.",
    )

    billing_cycle: str | None = Field(
        default=None,
        description="New billing cycle.",
    )

    status: str | None = Field(
        default=None,
        description="Requested subscription status.",
    )

    end_date: datetime | None = Field(
        default=None,
        description="Subscription end date.",
    )


# ==========================================================
# Cancel Subscription
# ==========================================================


class SubscriptionCancelRequest(BaseModel):
    """
    Immediate subscription cancellation request.
    """

    reason: str | None = Field(
        default=None,
        max_length=500,
        description="Optional cancellation reason.",
    )


# ==========================================================
# Pause Subscription
# ==========================================================


class PauseSubscriptionRequest(BaseModel):
    """
    Pause subscription request.
    """

    reason: str | None = Field(
        default=None,
        max_length=500,
        description="Optional reason for pausing.",
    )


# ==========================================================
# Resume Subscription
# ==========================================================


class ResumeSubscriptionRequest(BaseModel):
    """
    Resume subscription request.
    """

    reason: str | None = Field(
        default=None,
        max_length=500,
        description="Optional reason for resuming.",
    )


# ==========================================================
# Cancel At Period End
# ==========================================================


class CancelAtPeriodEndRequest(BaseModel):
    """
    Schedule subscription cancellation at the end of
    the current billing period.
    """

    reason: str | None = Field(
        default=None,
        max_length=500,
        description=(
            "Optional reason for scheduling cancellation."
        ),
    )


# ==========================================================
# Lifecycle Transition Response
# ==========================================================


class SubscriptionTransitionResponse(BaseModel):
    """
    Response returned after a successful subscription
    lifecycle transition.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    previous_status: str = Field(
        ...,
        description="Status before the transition.",
    )

    new_status: str = Field(
        ...,
        description="Status after the transition.",
    )

    action: str = Field(
        ...,
        description="Lifecycle action performed.",
    )

    changed_at: datetime = Field(
        ...,
        description="UTC timestamp of the transition.",
    )

    message: str = Field(
        ...,
        description="Human-readable transition result.",
    )


# ==========================================================
# Subscription History Response
# ==========================================================


class SubscriptionHistoryResponse(BaseModel):
    """
    Subscription lifecycle history response.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int = Field(
        ...,
        description="History record ID.",
    )

    subscription_id: int = Field(
        ...,
        description="Subscription ID.",
    )

    user_id: int | None = Field(
        default=None,
        description="User who performed the action.",
    )

    previous_status: str = Field(
        ...,
        description="Previous subscription status.",
    )

    new_status: str = Field(
        ...,
        description="New subscription status.",
    )

    action: str = Field(
        ...,
        description="Lifecycle action.",
    )

    reason: str | None = Field(
        default=None,
        description="Optional lifecycle reason.",
    )

    created_at: datetime = Field(
        ...,
        description="Timestamp of the history record.",
    )


# ==========================================================
# Subscription Response
# ==========================================================


class SubscriptionResponse(SubscriptionBase):
    """
    Complete subscription response.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    billing_cycle: str = Field(
        ...,
        description="Billing cycle inherited from the selected plan.",
    )

    status: str = Field(
        ...,
        description="Current subscription lifecycle status.",
    )

    start_date: datetime

    end_date: datetime | None = None

    paused_at: datetime | None = None

    resumed_at: datetime | None = None

    current_period_start: datetime | None = None

    current_period_end: datetime | None = None

    next_billing_date: datetime | None = None

    cancel_at_period_end: bool = False

    cancelled_at: datetime | None = None

    lifecycle_metadata: dict[str, Any] | None = None


# ==========================================================
# Subscription List Response
# ==========================================================


class SubscriptionListResponse(BaseModel):
    """
    Paginated subscription list response.
    """

    total: int = Field(
        ...,
        description="Total number of subscriptions.",
    )

    page: int = Field(
        ...,
        description="Current page number.",
    )

    page_size: int = Field(
        ...,
        description="Number of records per page.",
    )

    items: list[SubscriptionResponse] = Field(
        default_factory=list,
        description="Subscription records.",
    )


# ==========================================================
# Subscription History List Response
# ==========================================================


class SubscriptionHistoryListResponse(BaseModel):
    """
    Paginated subscription history response.
    """

    total: int = Field(
        ...,
        description="Total number of history records.",
    )

    page: int = Field(
        ...,
        description="Current page number.",
    )

    page_size: int = Field(
        ...,
        description="Number of records per page.",
    )

    items: list[SubscriptionHistoryResponse] = Field(
        default_factory=list,
        description="Lifecycle history records.",
    )