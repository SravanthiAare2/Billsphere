"""
BillSphere Subscription State Machine

Production-ready subscription lifecycle management.

Responsibilities:
- Validate subscription lifecycle transitions
- Execute lifecycle transitions
- Pause / resume subscriptions
- Activate subscriptions
- Handle payment failure / recovery
- Cancel subscriptions
- Schedule period-end cancellation
- Process period-end cancellation
- Persist subscription history
- Create audit logs
- Maintain lifecycle metadata
- Provide subscription status helpers

Lifecycle:

    trial
      |
    active
    /    \
paused   past_due
   |        |
   |        |
   +--------+
      |
  cancelled

Important:
- This module owns subscription lifecycle state.
- Billing, invoices, payments, retries and billing cycles
  remain in their respective services.
- This module does NOT commit or rollback transactions.
- The calling service owns transaction management.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.subscription import Subscription
from app.models.subscription_history import SubscriptionHistory


# ==========================================================
# Subscription Status
# ==========================================================


class SubscriptionStatus(str, Enum):
    """
    Supported subscription lifecycle statuses.
    """

    TRIAL = "trial"
    ACTIVE = "active"
    PAUSED = "paused"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"


# ==========================================================
# Subscription Actions
# ==========================================================


class SubscriptionAction(str, Enum):
    """
    Business actions that can affect subscription lifecycle.
    """

    CREATE = "create"
    ACTIVATE = "activate"
    PAUSE = "pause"
    RESUME = "resume"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_SUCCESS = "payment_success"
    CANCEL = "cancel"
    CANCEL_AT_PERIOD_END = "cancel_at_period_end"
    EXPIRE = "expire"
    RENEW = "renew"


# ==========================================================
# Exceptions
# ==========================================================


class SubscriptionLifecycleException(Exception):
    """
    Base exception for subscription lifecycle errors.
    """


class InvalidSubscriptionTransition(
    SubscriptionLifecycleException
):
    """
    Raised when an invalid lifecycle transition is requested.
    """


class SubscriptionAlreadyPaused(
    SubscriptionLifecycleException
):
    """
    Raised when an already paused subscription is paused again.
    """


class SubscriptionNotPaused(
    SubscriptionLifecycleException
):
    """
    Raised when resume is requested for a subscription
    that is not paused.
    """


class SubscriptionAlreadyCancelled(
    SubscriptionLifecycleException
):
    """
    Raised when an already cancelled subscription is used
    for another lifecycle operation.
    """


class SubscriptionAlreadyScheduledForCancellation(
    SubscriptionLifecycleException
):
    """
    Raised when period-end cancellation is already scheduled.
    """


class SubscriptionCancellationNotDue(
    SubscriptionLifecycleException
):
    """
    Raised when period-end cancellation is attempted before
    the billing period has ended.
    """


# ==========================================================
# Transition Result
# ==========================================================


@dataclass(slots=True)
class TransitionResult:
    """
    Result returned after a successful lifecycle operation.
    """

    previous_status: str
    new_status: str
    action: str
    changed_at: datetime
    message: str


# ==========================================================
# Allowed Transition Map
# ==========================================================

_ALLOWED_TRANSITIONS: dict[
    SubscriptionStatus,
    set[SubscriptionStatus],
] = {
    SubscriptionStatus.TRIAL: {
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CANCELLED,
    },
    SubscriptionStatus.ACTIVE: {
        SubscriptionStatus.PAUSED,
        SubscriptionStatus.PAST_DUE,
        SubscriptionStatus.CANCELLED,
    },
    SubscriptionStatus.PAUSED: {
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CANCELLED,
    },
    SubscriptionStatus.PAST_DUE: {
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CANCELLED,
    },
    SubscriptionStatus.CANCELLED: set(),
}


# ==========================================================
# Date Helpers
# ==========================================================


def utc_now() -> datetime:
    """
    Return the current timezone-aware UTC timestamp.
    """

    return datetime.now(timezone.utc)


def normalize_datetime(
    value: datetime | None,
) -> datetime | None:
    """
    Normalize a datetime to timezone-aware UTC.

    Naive datetime values are treated as UTC.
    """

    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


# ==========================================================
# Status Helpers
# ==========================================================


def normalize_status(
    value: str | SubscriptionStatus,
) -> SubscriptionStatus:
    """
    Convert a status string or enum into SubscriptionStatus.

    Raises:
        InvalidSubscriptionTransition:
            When the supplied status is invalid.
    """

    if isinstance(value, SubscriptionStatus):
        return value

    if not isinstance(value, str):
        raise InvalidSubscriptionTransition(
            "Invalid subscription status type: "
            f"{type(value).__name__}."
        )

    normalized_value = value.strip().lower()

    try:
        return SubscriptionStatus(normalized_value)
    except ValueError as error:
        raise InvalidSubscriptionTransition(
            f"Unknown subscription status: '{value}'."
        ) from error


def normalize_action(
    value: str | SubscriptionAction,
) -> str:
    """
    Normalize a lifecycle action into a string.
    """

    if isinstance(value, SubscriptionAction):
        return value.value

    if not isinstance(value, str):
        raise SubscriptionLifecycleException(
            "Invalid subscription action type: "
            f"{type(value).__name__}."
        )

    action = value.strip().lower()

    if not action:
        raise SubscriptionLifecycleException(
            "Subscription lifecycle action cannot be empty."
        )

    return action


# ==========================================================
# Transition Validation
# ==========================================================


def can_transition(
    current: str | SubscriptionStatus,
    target: str | SubscriptionStatus,
) -> bool:
    """
    Return True if the requested transition is allowed.
    """

    current_status = normalize_status(current)
    target_status = normalize_status(target)

    return target_status in _ALLOWED_TRANSITIONS.get(
        current_status,
        set(),
    )


def validate_transition(
    current: str | SubscriptionStatus,
    target: str | SubscriptionStatus,
) -> None:
    """
    Validate a requested lifecycle transition.

    Raises:
        InvalidSubscriptionTransition:
            If the transition is not allowed.
    """

    current_status = normalize_status(current)
    target_status = normalize_status(target)

    if not can_transition(
        current_status,
        target_status,
    ):
        raise InvalidSubscriptionTransition(
            "Cannot transition subscription "
            f"from '{current_status.value}' "
            f"to '{target_status.value}'."
        )


# ==========================================================
# Audit Log
# ==========================================================


def create_audit_log(
    db: Session,
    *,
    user_id: int | None,
    subscription: Subscription,
    action: str,
    description: str,
) -> AuditLog:
    """
    Create an audit-log entry.

    The caller owns the transaction.
    """

    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        module="subscriptions",
        description=description,
        entity_id=subscription.id,
        entity_type="subscription",
    )

    db.add(audit_log)

    return audit_log


# ==========================================================
# Subscription History
# ==========================================================


def create_subscription_history(
    db: Session,
    *,
    subscription: Subscription,
    previous_status: str,
    new_status: str,
    action: str,
    user_id: int | None,
    reason: str | None = None,
) -> SubscriptionHistory:
    """
    Create a persistent subscription history record.

    The caller owns the transaction.
    """

    history = SubscriptionHistory(
        subscription_id=subscription.id,
        user_id=user_id,
        previous_status=previous_status,
        new_status=new_status,
        action=action,
        reason=reason,
    )

    db.add(history)

    return history


def build_history_entry(
    *,
    old_status: str,
    new_status: str,
    action: str,
    user_id: int | None,
) -> dict[str, Any]:
    """
    Build an in-memory lifecycle history object.

    This does not write to the database.
    """

    return {
        "previous_status": old_status,
        "new_status": new_status,
        "action": action,
        "performed_by": user_id,
        "performed_at": utc_now().isoformat(),
    }


# ==========================================================
# Lifecycle Metadata
# ==========================================================


def _update_lifecycle_metadata(
    subscription: Subscription,
    *,
    previous_status: SubscriptionStatus,
    new_status: SubscriptionStatus,
    action: str,
    reason: str | None,
    changed_at: datetime,
) -> None:
    """
    Update subscription lifecycle metadata.

    Existing metadata is preserved.
    """

    metadata = dict(
        subscription.lifecycle_metadata or {}
    )

    metadata.update(
        {
            "last_transition": {
                "previous_status": previous_status.value,
                "new_status": new_status.value,
                "action": action,
                "changed_at": changed_at.isoformat(),
                "reason": reason,
            },
            "last_status_change_at": changed_at.isoformat(),
        }
    )

    subscription.lifecycle_metadata = metadata


# ==========================================================
# Main Transition Engine
# ==========================================================


def transition(
    db: Session,
    *,
    subscription: Subscription,
    target_status: str | SubscriptionStatus,
    action: str | SubscriptionAction,
    user_id: int | None = None,
    description: str | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Execute a validated subscription lifecycle transition.

    Steps:

    1. Validate persisted subscription.
    2. Normalize current status.
    3. Normalize target status.
    4. Validate transition.
    5. Update subscription.
    6. Update lifecycle metadata.
    7. Create subscription history.
    8. Create audit log.
    9. Flush transaction.
    10. Return result.

    Commit/rollback is intentionally NOT performed here.
    """

    if subscription.id is None:
        raise SubscriptionLifecycleException(
            "Subscription must be persisted before "
            "performing a lifecycle transition."
        )

    old_status = normalize_status(
        subscription.status
    )

    new_status = normalize_status(
        target_status
    )

    action_value = normalize_action(action)

    validate_transition(
        old_status,
        new_status,
    )

    now = utc_now()

    # ------------------------------------------------------
    # Update status
    # ------------------------------------------------------

    subscription.status = new_status.value

    # ------------------------------------------------------
    # Update lifecycle timestamps
    # ------------------------------------------------------

    if new_status == SubscriptionStatus.PAUSED:
        subscription.paused_at = now

    elif new_status == SubscriptionStatus.ACTIVE:
        if (
            action_value
            == SubscriptionAction.RESUME.value
        ):
            subscription.resumed_at = now

    elif new_status == SubscriptionStatus.CANCELLED:
        subscription.cancelled_at = now
        subscription.end_date = now
        subscription.cancel_at_period_end = False

    # ------------------------------------------------------
    # Lifecycle metadata
    # ------------------------------------------------------

    _update_lifecycle_metadata(
        subscription,
        previous_status=old_status,
        new_status=new_status,
        action=action_value,
        reason=reason,
        changed_at=now,
    )

    # ------------------------------------------------------
    # Subscription history
    # ------------------------------------------------------

    create_subscription_history(
        db,
        subscription=subscription,
        previous_status=old_status.value,
        new_status=new_status.value,
        action=action_value,
        user_id=user_id,
        reason=reason,
    )

    # ------------------------------------------------------
    # Audit log
    # ------------------------------------------------------

    audit_description = (
        description
        or (
            "Subscription transitioned "
            f"from '{old_status.value}' "
            f"to '{new_status.value}'."
        )
    )

    create_audit_log(
        db,
        user_id=user_id,
        subscription=subscription,
        action=action_value,
        description=audit_description,
    )

    # ------------------------------------------------------
    # Flush
    # ------------------------------------------------------

    db.flush()

    return TransitionResult(
        previous_status=old_status.value,
        new_status=new_status.value,
        action=action_value,
        changed_at=now,
        message=(
            "Subscription transition completed "
            "successfully."
        ),
    )


# ==========================================================
# Create / Initial Lifecycle
# ==========================================================


def record_subscription_creation(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> SubscriptionHistory:
    """
    Record the creation of a new subscription.

    This function does not perform a status transition.

    It is useful when the subscription is initially created
    with status='trial' or status='active'.
    """

    if subscription.id is None:
        raise SubscriptionLifecycleException(
            "Subscription must be persisted before "
            "creating lifecycle history."
        )

    current_status = normalize_status(
        subscription.status
    )

    history = create_subscription_history(
        db,
        subscription=subscription,
        previous_status=current_status.value,
        new_status=current_status.value,
        action=SubscriptionAction.CREATE.value,
        user_id=user_id,
        reason=reason,
    )

    create_audit_log(
        db,
        user_id=user_id,
        subscription=subscription,
        action=SubscriptionAction.CREATE.value,
        description=(
            "Subscription created with status "
            f"'{current_status.value}'."
        ),
    )

    metadata = dict(
        subscription.lifecycle_metadata or {}
    )

    metadata["created_status"] = current_status.value
    metadata["created_at"] = utc_now().isoformat()

    subscription.lifecycle_metadata = metadata

    db.flush()

    return history


# ==========================================================
# Pause Subscription
# ==========================================================


def pause_subscription(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Pause an active subscription.
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.PAUSED:
        raise SubscriptionAlreadyPaused(
            "Subscription is already paused."
        )

    if current_status != SubscriptionStatus.ACTIVE:
        raise InvalidSubscriptionTransition(
            "Only an active subscription can be paused."
        )

    return transition(
        db=db,
        subscription=subscription,
        target_status=SubscriptionStatus.PAUSED,
        action=SubscriptionAction.PAUSE,
        user_id=user_id,
        reason=reason,
        description="Subscription paused.",
    )


# ==========================================================
# Resume Subscription
# ==========================================================


def resume_subscription(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Resume a paused subscription.
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status != SubscriptionStatus.PAUSED:
        raise SubscriptionNotPaused(
            "Subscription is not paused."
        )

    return transition(
        db=db,
        subscription=subscription,
        target_status=SubscriptionStatus.ACTIVE,
        action=SubscriptionAction.RESUME,
        user_id=user_id,
        reason=reason,
        description="Subscription resumed.",
    )


# ==========================================================
# Activate Subscription
# ==========================================================


def activate_subscription(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Activate a trial subscription.

    Supported transition:

        trial -> active

    Payment recovery should use mark_payment_success()
    instead of this function.
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.ACTIVE:
        raise InvalidSubscriptionTransition(
            "Subscription is already active."
        )

    if current_status != SubscriptionStatus.TRIAL:
        raise InvalidSubscriptionTransition(
            "Only a trial subscription can be activated "
            "using activate_subscription()."
        )

    return transition(
        db=db,
        subscription=subscription,
        target_status=SubscriptionStatus.ACTIVE,
        action=SubscriptionAction.ACTIVATE,
        user_id=user_id,
        reason=reason,
        description="Trial subscription activated.",
    )


# ==========================================================
# Mark Payment Failed
# ==========================================================


def mark_past_due(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Mark an active subscription as past_due after
    a payment failure.
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.PAST_DUE:
        raise InvalidSubscriptionTransition(
            "Subscription is already past_due."
        )

    if current_status != SubscriptionStatus.ACTIVE:
        raise InvalidSubscriptionTransition(
            "Only an active subscription can be marked "
            "as past_due."
        )

    return transition(
        db=db,
        subscription=subscription,
        target_status=SubscriptionStatus.PAST_DUE,
        action=SubscriptionAction.PAYMENT_FAILED,
        user_id=user_id,
        reason=reason,
        description=(
            "Payment failed. "
            "Subscription marked as past_due."
        ),
    )


# ==========================================================
# Mark Payment Success
# ==========================================================


def mark_payment_success(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Restore a past_due subscription after successful
    payment recovery.

    Supported transition:

        past_due -> active
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.ACTIVE:
        raise InvalidSubscriptionTransition(
            "Subscription is already active."
        )

    if current_status != SubscriptionStatus.PAST_DUE:
        raise InvalidSubscriptionTransition(
            "Payment recovery can only restore a "
            "past_due subscription."
        )

    return transition(
        db=db,
        subscription=subscription,
        target_status=SubscriptionStatus.ACTIVE,
        action=SubscriptionAction.PAYMENT_SUCCESS,
        user_id=user_id,
        reason=reason,
        description=(
            "Payment succeeded. "
            "Subscription restored to active status."
        ),
    )


# ==========================================================
# Immediate Cancellation
# ==========================================================


def cancel_subscription(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Immediately cancel a subscription.

    Supported transitions:

        trial -> cancelled
        active -> cancelled
        paused -> cancelled
        past_due -> cancelled
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.CANCELLED:
        raise SubscriptionAlreadyCancelled(
            "Subscription has already been cancelled."
        )

    return transition(
        db=db,
        subscription=subscription,
        target_status=SubscriptionStatus.CANCELLED,
        action=SubscriptionAction.CANCEL,
        user_id=user_id,
        reason=reason,
        description=(
            "Subscription cancelled immediately."
        ),
    )


# ==========================================================
# Schedule Period-End Cancellation
# ==========================================================


def schedule_cancel_at_period_end(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    reason: str | None = None,
) -> TransitionResult:
    """
    Schedule subscription cancellation at the end of
    the current billing period.

    The subscription status does NOT change immediately.

    Example:

        active
          |
          | cancel_at_period_end = True
          |
        active
          |
          | period ends
          v
        cancelled
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.CANCELLED:
        raise SubscriptionAlreadyCancelled(
            "Cancelled subscription cannot be scheduled "
            "for cancellation."
        )

    if subscription.cancel_at_period_end:
        raise SubscriptionAlreadyScheduledForCancellation(
            "Subscription is already scheduled "
            "for cancellation."
        )

    if subscription.current_period_end is None:
        raise SubscriptionLifecycleException(
            "Cannot schedule period-end cancellation because "
            "current_period_end is not available."
        )

    now = utc_now()
    current_status_value = current_status.value

    subscription.cancel_at_period_end = True

    # ------------------------------------------------------
    # Lifecycle metadata
    # ------------------------------------------------------

    metadata = dict(
        subscription.lifecycle_metadata or {}
    )

    metadata["cancellation"] = {
        "scheduled": True,
        "scheduled_at": now.isoformat(),
        "scheduled_for": normalize_datetime(
            subscription.current_period_end
        ).isoformat(),
        "reason": reason,
    }

    subscription.lifecycle_metadata = metadata

    # ------------------------------------------------------
    # History
    # ------------------------------------------------------

    create_subscription_history(
        db,
        subscription=subscription,
        previous_status=current_status_value,
        new_status=current_status_value,
        action=(
            SubscriptionAction
            .CANCEL_AT_PERIOD_END
            .value
        ),
        user_id=user_id,
        reason=reason,
    )

    # ------------------------------------------------------
    # Audit
    # ------------------------------------------------------

    create_audit_log(
        db,
        user_id=user_id,
        subscription=subscription,
        action=(
            SubscriptionAction
            .CANCEL_AT_PERIOD_END
            .value
        ),
        description=(
            "Subscription scheduled for cancellation "
            "at the end of the current billing period."
        ),
    )

    db.flush()

    return TransitionResult(
        previous_status=current_status_value,
        new_status=current_status_value,
        action=(
            SubscriptionAction
            .CANCEL_AT_PERIOD_END
            .value
        ),
        changed_at=now,
        message=(
            "Subscription cancellation scheduled "
            "for the end of the billing period."
        ),
    )


# ==========================================================
# Process Period End
# ==========================================================


def process_period_end(
    db: Session,
    *,
    subscription: Subscription,
    user_id: int | None = None,
    now: datetime | None = None,
) -> TransitionResult | None:
    """
    Process a subscription whose cancellation is scheduled
    for the end of its billing period.

    Returns:
        TransitionResult:
            When cancellation occurs.

        None:
            When cancellation is not scheduled.

    Raises:
        SubscriptionCancellationNotDue:
            When the billing period has not ended yet.
    """

    if not subscription.cancel_at_period_end:
        return None

    current_time = (
        normalize_datetime(now)
        or utc_now()
    )

    period_end = normalize_datetime(
        subscription.current_period_end
    )

    if period_end is None:
        raise SubscriptionCancellationNotDue(
            "Subscription has cancellation scheduled "
            "at period end, but current_period_end "
            "is not available."
        )

    if period_end > current_time:
        raise SubscriptionCancellationNotDue(
            "Subscription cancellation is scheduled "
            "for period end, but the current billing "
            "period has not ended yet."
        )

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.CANCELLED:
        return TransitionResult(
            previous_status=SubscriptionStatus.CANCELLED.value,
            new_status=SubscriptionStatus.CANCELLED.value,
            action=SubscriptionAction.EXPIRE.value,
            changed_at=current_time,
            message=(
                "Subscription was already cancelled "
                "at period end."
            ),
        )

    return transition(
        db=db,
        subscription=subscription,
        target_status=SubscriptionStatus.CANCELLED,
        action=SubscriptionAction.EXPIRE,
        user_id=user_id,
        reason="Billing period ended.",
        description=(
            "Subscription cancelled because the billing "
            "period ended."
        ),
    )


# ==========================================================
# Renewal Helper
# ==========================================================


def validate_renewal(
    subscription: Subscription,
) -> None:
    """
    Validate whether a subscription can be renewed.

    Renewal itself belongs to the billing service.

    This function only validates lifecycle eligibility.
    """

    current_status = normalize_status(
        subscription.status
    )

    if current_status == SubscriptionStatus.CANCELLED:
        raise SubscriptionAlreadyCancelled(
            "Cancelled subscription cannot be renewed."
        )

    if subscription.cancel_at_period_end:
        raise SubscriptionLifecycleException(
            "Subscription is scheduled for cancellation "
            "and cannot be renewed without first removing "
            "the cancellation schedule."
        )

    if current_status not in {
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PAST_DUE,
    }:
        raise InvalidSubscriptionTransition(
            "Subscription cannot be renewed while in "
            f"'{current_status.value}' status."
        )


# ==========================================================
# Status Helpers
# ==========================================================


def is_trial(
    subscription: Subscription,
) -> bool:
    """
    Return True when subscription is in trial.
    """

    try:
        return (
            normalize_status(subscription.status)
            == SubscriptionStatus.TRIAL
        )
    except InvalidSubscriptionTransition:
        return False


def is_active(
    subscription: Subscription,
) -> bool:
    """
    Return True when subscription is active.
    """

    try:
        return (
            normalize_status(subscription.status)
            == SubscriptionStatus.ACTIVE
        )
    except InvalidSubscriptionTransition:
        return False


def is_paused(
    subscription: Subscription,
) -> bool:
    """
    Return True when subscription is paused.
    """

    try:
        return (
            normalize_status(subscription.status)
            == SubscriptionStatus.PAUSED
        )
    except InvalidSubscriptionTransition:
        return False


def is_past_due(
    subscription: Subscription,
) -> bool:
    """
    Return True when subscription is past_due.
    """

    try:
        return (
            normalize_status(subscription.status)
            == SubscriptionStatus.PAST_DUE
        )
    except InvalidSubscriptionTransition:
        return False


def is_cancelled(
    subscription: Subscription,
) -> bool:
    """
    Return True when subscription is cancelled.
    """

    try:
        return (
            normalize_status(subscription.status)
            == SubscriptionStatus.CANCELLED
        )
    except InvalidSubscriptionTransition:
        return False


def ensure_not_cancelled(
    subscription: Subscription,
) -> None:
    """
    Ensure the subscription has not been cancelled.
    """

    if is_cancelled(subscription):
        raise SubscriptionAlreadyCancelled(
            "Subscription has already been cancelled."
        )


def is_cancellation_scheduled(
    subscription: Subscription,
) -> bool:
    """
    Return True when cancellation is scheduled for
    the end of the current billing period.
    """

    return bool(
        subscription.cancel_at_period_end
    )


def is_billing_period_ended(
    subscription: Subscription,
    *,
    now: datetime | None = None,
) -> bool:
    """
    Return True when the current billing period has ended.

    Missing current_period_end returns False.
    """

    period_end = normalize_datetime(
        subscription.current_period_end
    )

    if period_end is None:
        return False

    current_time = (
        normalize_datetime(now)
        or utc_now()
    )

    return period_end <= current_time


def get_subscription_status(
    subscription: Subscription,
) -> SubscriptionStatus:
    """
    Return the normalized subscription status.
    """

    return normalize_status(
        subscription.status
    )


# ==========================================================
# Transition Map
# ==========================================================


def allowed_transitions() -> dict[
    SubscriptionStatus,
    set[SubscriptionStatus],
]:
    """
    Return a safe copy of the lifecycle transition map.
    """

    return {
        status: transitions.copy()
        for status, transitions
        in _ALLOWED_TRANSITIONS.items()
    }


# ==========================================================
# Transition Inspection
# ==========================================================


def available_transitions(
    subscription: Subscription,
) -> set[SubscriptionStatus]:
    """
    Return all statuses the subscription can transition to
    from its current status.
    """

    current_status = normalize_status(
        subscription.status
    )

    return _ALLOWED_TRANSITIONS.get(
        current_status,
        set(),
    ).copy()


def can_pause(
    subscription: Subscription,
) -> bool:
    """
    Return True when the subscription can be paused.
    """

    return (
        normalize_status(subscription.status)
        == SubscriptionStatus.ACTIVE
    )


def can_resume(
    subscription: Subscription,
) -> bool:
    """
    Return True when the subscription can be resumed.
    """

    return (
        normalize_status(subscription.status)
        == SubscriptionStatus.PAUSED
    )


def can_cancel(
    subscription: Subscription,
) -> bool:
    """
    Return True when the subscription can be cancelled.
    """

    return not is_cancelled(subscription)


def can_mark_past_due(
    subscription: Subscription,
) -> bool:
    """
    Return True when the subscription can be marked past_due.
    """

    return (
        normalize_status(subscription.status)
        == SubscriptionStatus.ACTIVE
    )


def can_recover_payment(
    subscription: Subscription,
) -> bool:
    """
    Return True when successful payment recovery can restore
    the subscription to active.
    """

    return (
        normalize_status(subscription.status)
        == SubscriptionStatus.PAST_DUE
    )