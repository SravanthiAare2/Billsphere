"""
BillSphere Subscription Service

Business logic for:

- Creating subscriptions
- Fetching subscriptions
- Listing subscriptions
- Updating subscriptions
- Immediate cancellation with unused-period refund
- Subscription lifecycle management
- Pause / Resume
- Cancel at period end
- Plan change with proration
- Subscription history
- State-machine integration
- Audit logging
- Payment recovery
- Billing-period expiration
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.subscription import Subscription

from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
)

from app.services.billing_cycle_service import (
    start_subscription_billing_cycle,
)

from app.services.invoice_service import (
    generate_invoice_number,
)

from app.services.proration_service import (
    calculate_proration,
)

from app.services.subscription_state_machine import (
    SubscriptionLifecycleException,
    SubscriptionStatus,
    activate_subscription as state_machine_activate,
    cancel_subscription as state_machine_cancel,
    mark_payment_success as state_machine_payment_success,
    mark_past_due as state_machine_mark_past_due,
    pause_subscription as state_machine_pause,
    process_period_end as state_machine_process_period_end,
    resume_subscription as state_machine_resume,
    schedule_cancel_at_period_end as state_machine_schedule_cancel,
)

from app.services.tax_service import calculate_tax


# ==========================================================
# Internal Helpers
# ==========================================================


def _commit_and_refresh(
    db: Session,
    subscription: Subscription,
) -> Subscription:
    """
    Commit the current transaction and refresh the subscription.
    """

    db.commit()
    db.refresh(subscription)

    return subscription


def _rollback(db: Session) -> None:
    """
    Safely rollback the current database transaction.
    """

    try:
        db.rollback()
    except Exception:
        pass


def _raise_lifecycle_error(
    error: SubscriptionLifecycleException,
) -> None:
    """
    Convert a lifecycle exception into an HTTP 400 response.
    """

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(error),
    ) from error


def _normalize_datetime(
    value: datetime | None,
) -> datetime | None:
    """
    Normalize datetime values to timezone-aware UTC.

    Naive datetimes from PostgreSQL are treated as UTC.
    """

    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc,
        )

    return value.astimezone(timezone.utc)


def _now() -> datetime:
    """
    Return the current timezone-aware UTC timestamp.
    """

    return datetime.now(timezone.utc)


# ==========================================================
# Plan Validation
# ==========================================================


def _get_active_plan(
    db: Session,
    plan_id: int,
) -> Plan:
    """
    Fetch an active subscription plan.

    The backend remains the source of truth for:

    - Price
    - Currency
    - Billing cycle
    - Trial duration
    - Features
    """

    if not plan_id or plan_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid plan_id is required.",
        )

    plan = (
        db.query(Plan)
        .filter(
            Plan.id == plan_id,
            Plan.is_active.is_(True),
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active plan with ID {plan_id} not found.",
        )

    return plan


# ==========================================================
# Customer Validation
# ==========================================================


def _get_customer(
    db: Session,
    customer_id: int,
) -> Customer:
    """
    Fetch a customer by ID.
    """

    if not customer_id or customer_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid customer_id is required.",
        )

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found.",
        )

    return customer


# ==========================================================
# Remaining Billing Period
# ==========================================================


def _remaining_days_ratio(
    subscription: Subscription,
) -> tuple[int, int]:
    """
    Return:

        (remaining_days, total_days)

    for the current billing period.
    """

    now = _now()

    period_start = _normalize_datetime(
        subscription.current_period_start,
    )

    period_end = _normalize_datetime(
        subscription.current_period_end,
    )

    if not period_start or not period_end:
        return 0, 1

    if period_end <= now:
        return 0, 1

    if period_end <= period_start:
        return 0, 1

    total_seconds = (
        period_end - period_start
    ).total_seconds()

    remaining_seconds = (
        period_end - now
    ).total_seconds()

    total_days = max(
        int(total_seconds / 86400),
        1,
    )

    remaining_days = max(
        int(remaining_seconds / 86400),
        0,
    )

    return remaining_days, total_days


# ==========================================================
# Unused Period Refund
# ==========================================================


def _issue_unused_period_refund(
    db: Session,
    subscription: Subscription,
    reason: str,
) -> Decimal:
    """
    Refund the unused portion of the current billing period.

    Returns the actual refund amount.

    Important:
    This function does not commit the transaction itself.
    """

    plan = (
        db.query(Plan)
        .filter(
            Plan.id == subscription.plan_id,
        )
        .first()
    )

    if not plan:
        return Decimal("0.00")

    remaining_days, total_days = (
        _remaining_days_ratio(subscription)
    )

    if remaining_days <= 0:
        return Decimal("0.00")

    plan_price = Decimal(
        str(plan.price)
    )

    unused_amount = (
        plan_price
        * Decimal(remaining_days)
        / Decimal(total_days)
    ).quantize(
        Decimal("0.01"),
    )

    if unused_amount <= 0:
        return Decimal("0.00")

    latest_paid_invoice = (
        db.query(Invoice)
        .filter(
            Invoice.subscription_id == subscription.id,
            Invoice.status == "paid",
        )
        .order_by(
            Invoice.id.desc(),
        )
        .first()
    )

    if not latest_paid_invoice:
        return Decimal("0.00")

    payment = (
        db.query(Payment)
        .filter(
            Payment.invoice_id == latest_paid_invoice.id,
            Payment.status == "completed",
        )
        .order_by(
            Payment.id.desc(),
        )
        .first()
    )

    if not payment:
        return Decimal("0.00")

    payment_amount = Decimal(
        str(payment.amount)
    )

    refund_amount = min(
        unused_amount,
        payment_amount,
    )

    if refund_amount <= 0:
        return Decimal("0.00")

    from app.services.payment_service import refund_payment

    refund_payment(
        db,
        payment.id,
        amount=refund_amount,
        reason=reason,
    )

    return refund_amount


# ==========================================================
# Create Subscription
# ==========================================================


def create_subscription(
    db: Session,
    subscription_data: SubscriptionCreate,
    created_by: int | None = None,
) -> Subscription:
    """
    Create a new subscription.

    The selected backend plan controls:

    - Price
    - Currency
    - Billing cycle
    - Trial period
    - Feature entitlements

    The subscription stores only the plan relationship.
    """

    try:
        # --------------------------------------------------
        # Validate customer
        # --------------------------------------------------

        customer = _get_customer(
            db,
            subscription_data.customer_id,
        )

        if not customer.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Customer is inactive.",
            )

        # --------------------------------------------------
        # Validate plan
        # --------------------------------------------------

        plan = _get_active_plan(
            db,
            subscription_data.plan_id,
        )

        # --------------------------------------------------
        # Validate requested starting status
        # --------------------------------------------------

        status_value = (
            subscription_data.status
            .strip()
            .lower()
        )

        if status_value not in {
            SubscriptionStatus.TRIAL.value,
            SubscriptionStatus.ACTIVE.value,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "New subscriptions must start as "
                    "'trial' or 'active'."
                ),
            )

        # --------------------------------------------------
        # Normalize start date
        # --------------------------------------------------

        start = _normalize_datetime(
            subscription_data.start_date,
        )

        if start is None:
            start = _now()

        # --------------------------------------------------
        # Billing cycle
        # --------------------------------------------------

        selected_billing_cycle = (
            subscription_data.billing_cycle
            or plan.billing_cycle
        )

        selected_billing_cycle = (
            str(selected_billing_cycle)
            .strip()
            .lower()
        )

        plan_billing_cycle = (
            str(plan.billing_cycle)
            .strip()
            .lower()
        )

        if (
            subscription_data.billing_cycle
            and selected_billing_cycle
            != plan_billing_cycle
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Billing cycle "
                    f"'{subscription_data.billing_cycle}' "
                    f"does not match the selected plan's "
                    f"billing cycle "
                    f"'{plan.billing_cycle}'."
                ),
            )

        # --------------------------------------------------
        # Trial / end date
        # --------------------------------------------------

        end = _normalize_datetime(
            subscription_data.end_date,
        )

        if (
            end is None
            and status_value
            == SubscriptionStatus.TRIAL.value
            and getattr(plan, "trial_days", 0)
        ):
            end = start + timedelta(
                days=plan.trial_days,
            )

        # --------------------------------------------------
        # Prevent duplicate active/trial subscriptions
        # for the same customer and plan
        # --------------------------------------------------

        existing_subscription = (
            db.query(Subscription)
            .filter(
                Subscription.customer_id
                == customer.id,
                Subscription.plan_id
                == plan.id,
                Subscription.status.in_(
                    [
                        SubscriptionStatus.TRIAL.value,
                        SubscriptionStatus.ACTIVE.value,
                        SubscriptionStatus.PAUSED.value,
                        SubscriptionStatus.PAST_DUE.value,
                    ]
                ),
            )
            .first()
        )

        if existing_subscription:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Customer already has an active "
                    "subscription for this plan."
                ),
            )

        # --------------------------------------------------
        # Create subscription
        # --------------------------------------------------

        subscription = Subscription(
            customer_id=customer.id,
            plan_id=plan.id,
            start_date=start,
            end_date=end,
            status=status_value,
            billing_cycle=selected_billing_cycle,
            cancel_at_period_end=False,
        )

        db.add(subscription)
        db.flush()

        # --------------------------------------------------
        # Start billing cycle
        # --------------------------------------------------

        start_subscription_billing_cycle(
            db,
            subscription,
        )

        db.commit()
        db.refresh(subscription)

        return subscription

    except HTTPException:
        _rollback(db)
        raise

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Get Subscription
# ==========================================================


def get_subscription_by_id(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
) -> Subscription:
    """
    Fetch a subscription by ID.

    created_by is retained for compatibility with existing
    API/service callers.
    """

    if not subscription_id or subscription_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid subscription_id is required.",
        )

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.id == subscription_id,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    return subscription


# ==========================================================
# List Subscriptions
# ==========================================================


def list_subscriptions(
    db: Session,
    created_by: int | None = None,
    page: int = 1,
    page_size: int = 10,
    status_filter: str | None = None,
):
    """
    Return paginated subscriptions.
    """

    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be greater than or equal to 1.",
        )

    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page size must be between 1 and 100.",
        )

    query = db.query(Subscription)

    if status_filter:
        normalized_filter = (
            status_filter
            .strip()
            .lower()
        )

        try:
            SubscriptionStatus(
                normalized_filter,
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Invalid subscription status "
                    f"'{status_filter}'."
                ),
            )

        query = query.filter(
            Subscription.status
            == normalized_filter,
        )

    total = query.count()

    subscriptions = (
        query
        .order_by(
            Subscription.id.desc(),
        )
        .offset(
            (page - 1) * page_size,
        )
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": subscriptions,
    }


# ==========================================================
# Update Subscription
# ==========================================================


def update_subscription(
    db: Session,
    subscription_id: int,
    created_by: int | None,
    subscription_data: SubscriptionUpdate,
) -> Subscription:
    """
    Update subscription fields.

    Lifecycle status changes are always delegated to the
    subscription state machine.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    update_data = subscription_data.model_dump(
        exclude_unset=True,
    )

    requested_status = update_data.pop(
        "status",
        None,
    )

    try:
        # --------------------------------------------------
        # Plan change
        # --------------------------------------------------

        if "plan_id" in update_data:

            new_plan_id = update_data["plan_id"]

            new_plan = _get_active_plan(
                db,
                new_plan_id,
            )

            update_data["billing_cycle"] = (
                new_plan.billing_cycle
            )

        # --------------------------------------------------
        # Lifecycle state change
        # --------------------------------------------------

        if requested_status is not None:

            requested_status = (
                requested_status
                .strip()
                .lower()
            )

            current_status = (
                subscription.status
                .strip()
                .lower()
            )

            if requested_status != current_status:

                if (
                    requested_status
                    == SubscriptionStatus.ACTIVE.value
                ):
                    state_machine_activate(
                        db=db,
                        subscription=subscription,
                        user_id=created_by,
                    )

                elif (
                    requested_status
                    == SubscriptionStatus.PAST_DUE.value
                ):
                    state_machine_mark_past_due(
                        db=db,
                        subscription=subscription,
                        user_id=created_by,
                    )

                elif (
                    requested_status
                    == SubscriptionStatus.PAUSED.value
                ):
                    state_machine_pause(
                        db=db,
                        subscription=subscription,
                        user_id=created_by,
                    )

                elif (
                    requested_status
                    == SubscriptionStatus.CANCELLED.value
                ):
                    state_machine_cancel(
                        db=db,
                        subscription=subscription,
                        user_id=created_by,
                    )

                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Unsupported subscription status "
                            f"'{requested_status}'. "
                            "Use the dedicated lifecycle "
                            "operations for state changes."
                        ),
                    )

        # --------------------------------------------------
        # Apply normal fields
        # --------------------------------------------------

        for field, value in update_data.items():

            if hasattr(
                subscription,
                field,
            ):
                setattr(
                    subscription,
                    field,
                    value,
                )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except HTTPException:
        _rollback(db)
        raise

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Immediate Cancellation
# ==========================================================


def cancel_subscription(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
    reason: str | None = None,
) -> Subscription:
    """
    Immediately cancel a subscription.

    The state machine performs the lifecycle transition.

    An unused-period refund is attempted before committing so
    the lifecycle change and refund remain part of the same
    transaction where supported by the payment service.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        state_machine_cancel(
            db=db,
            subscription=subscription,
            user_id=created_by,
            reason=reason,
        )

        _issue_unused_period_refund(
            db,
            subscription,
            reason
            or "Unused period refund on cancellation.",
        )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except HTTPException:
        _rollback(db)
        raise

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Activate Subscription
# ==========================================================


def activate_subscription(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
) -> Subscription:
    """
    Activate a trial or past-due subscription.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        state_machine_activate(
            db=db,
            subscription=subscription,
            user_id=created_by,
        )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Pause Subscription
# ==========================================================


def pause_subscription(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
    reason: str | None = None,
) -> Subscription:
    """
    Pause an active subscription.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        state_machine_pause(
            db=db,
            subscription=subscription,
            user_id=created_by,
            reason=reason,
        )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Resume Subscription
# ==========================================================


def resume_subscription(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
    reason: str | None = None,
) -> Subscription:
    """
    Resume a paused subscription.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        state_machine_resume(
            db=db,
            subscription=subscription,
            user_id=created_by,
            reason=reason,
        )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Mark Subscription Past Due
# ==========================================================


def mark_subscription_past_due(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
    reason: str | None = None,
) -> Subscription:
    """
    Mark an active subscription as past_due after payment
    failure.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        state_machine_mark_past_due(
            db=db,
            subscription=subscription,
            user_id=created_by,
            reason=reason,
        )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Payment Recovery
# ==========================================================


def mark_subscription_payment_success(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
    reason: str | None = None,
) -> Subscription:
    """
    Restore a past_due subscription after successful payment.

    Valid lifecycle transition:

        past_due -> active
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        state_machine_payment_success(
            db=db,
            subscription=subscription,
            user_id=created_by,
            reason=reason,
        )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Cancel At Period End
# ==========================================================


def cancel_at_period_end(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
    reason: str | None = None,
) -> Subscription:
    """
    Schedule cancellation at the end of the current
    billing period.

    The subscription remains active until the billing
    period actually ends.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        state_machine_schedule_cancel(
            db=db,
            subscription=subscription,
            user_id=created_by,
            reason=reason,
        )

        return _commit_and_refresh(
            db,
            subscription,
        )

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Process Billing Period End
# ==========================================================


def process_subscription_period_end(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
) -> Subscription:
    """
    Process scheduled period-end cancellation.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        result = state_machine_process_period_end(
            db=db,
            subscription=subscription,
            user_id=created_by,
        )

        if result is None:
            return subscription

        return _commit_and_refresh(
            db,
            subscription,
        )

    except SubscriptionLifecycleException as error:
        _rollback(db)
        _raise_lifecycle_error(error)

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Change Plan With Proration
# ==========================================================


def change_plan_with_proration(
    db: Session,
    subscription_id: int,
    new_plan_id: int,
    created_by: int | None = None,
) -> dict:
    """
    Change a subscription to another active plan.

    Handles:

    - Old plan
    - New plan
    - Remaining billing period
    - Prorated credit
    - Prorated charge
    - Tax
    - Upgrade invoice
    - Downgrade refund
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    # ------------------------------------------------------
    # Validate subscription state
    # ------------------------------------------------------

    if subscription.status == (
        SubscriptionStatus.CANCELLED.value
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cancelled subscriptions cannot "
                "change plans."
            ),
        )

    # ------------------------------------------------------
    # Existing plan
    # ------------------------------------------------------

    old_plan = (
        db.query(Plan)
        .filter(
            Plan.id == subscription.plan_id,
        )
        .first()
    )

    if not old_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current subscription plan not found.",
        )

    # ------------------------------------------------------
    # New plan
    # ------------------------------------------------------

    new_plan = _get_active_plan(
        db,
        new_plan_id,
    )

    # ------------------------------------------------------
    # Same plan
    # ------------------------------------------------------

    if old_plan.id == new_plan.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The subscription is already using "
                "this plan."
            ),
        )

    # ------------------------------------------------------
    # Billing cycle compatibility
    # ------------------------------------------------------

    old_cycle = (
        str(old_plan.billing_cycle)
        .strip()
        .lower()
    )

    new_cycle = (
        str(new_plan.billing_cycle)
        .strip()
        .lower()
    )

    # The plan change is allowed, but the subscription's
    # billing cycle must always follow the new plan.
    #
    # Proration is still calculated using the current
    # billing period.

    old_plan_id = subscription.plan_id

    remaining_days, total_days = (
        _remaining_days_ratio(
            subscription,
        )
    )

    proration_invoice = None

    net_amount = Decimal("0.00")
    old_credit = Decimal("0.00")
    new_charge = Decimal("0.00")

    try:
        # --------------------------------------------------
        # Calculate proration
        # --------------------------------------------------

        if remaining_days > 0:

            proration = calculate_proration(
                old_plan_price=Decimal(
                    str(old_plan.price),
                ),
                new_plan_price=Decimal(
                    str(new_plan.price),
                ),
                remaining_days=remaining_days,
                total_days=total_days,
            )

            old_credit = Decimal(
                str(
                    proration["old_credit"],
                )
            )

            new_charge = Decimal(
                str(
                    proration["new_charge"],
                )
            )

            net_amount = Decimal(
                str(
                    proration["net_amount"],
                )
            )

            # --------------------------------------------------
            # Upgrade
            # --------------------------------------------------

            if net_amount > 0:

                customer = (
                    db.query(Customer)
                    .filter(
                        Customer.id
                        == subscription.customer_id,
                    )
                    .first()
                )

                country_code = (
                    customer.country
                    if customer
                    and customer.country
                    else "IN"
                )

                company_country = str(
                    getattr(
                        settings,
                        "COMPANY_COUNTRY",
                        "IN",
                    )
                ).strip().upper()

                company_state = str(
                    getattr(
                        settings,
                        "COMPANY_STATE",
                        "",
                    )
                ).strip().lower()

                customer_state = (
                    (
                        customer.state
                        if customer
                        else ""
                    )
                    or ""
                ).strip().lower()

                same_state = (
                    str(country_code)
                    .strip()
                    .upper()
                    == company_country
                    and customer_state
                    == company_state
                )

                breakdown = calculate_tax(
                    amount=net_amount,
                    country_code=country_code,
                    tax_rate_percent=None,
                    same_state=same_state,
                )

                proration_invoice = Invoice(
                    invoice_number=generate_invoice_number(
                        db,
                    ),
                    customer_id=subscription.customer_id,
                    subscription_id=subscription.id,
                    amount=breakdown.taxable_amount,
                    tax_amount=breakdown.total_tax,
                    total_amount=breakdown.total_amount,
                    status="pending",
                    created_at=_now(),
                )

                db.add(
                    proration_invoice,
                )

                db.flush()

                # --------------------------------------------------
                # Proration debit
                # --------------------------------------------------

                db.add(
                    InvoiceLineItem(
                        invoice_id=proration_invoice.id,
                        description=(
                            f"Prorated charge: "
                            f"{new_plan.name} "
                            f"({remaining_days} days)"
                        ),
                        item_type="proration_debit",
                        amount=new_charge,
                    )
                )

                # --------------------------------------------------
                # Existing-plan credit
                # --------------------------------------------------

                if old_credit > 0:

                    db.add(
                        InvoiceLineItem(
                            invoice_id=proration_invoice.id,
                            description=(
                                f"Unused credit: "
                                f"{old_plan.name} "
                                f"({remaining_days} days)"
                            ),
                            item_type="proration_credit",
                            amount=-old_credit,
                        )
                    )

                # --------------------------------------------------
                # CGST
                # --------------------------------------------------

                if breakdown.cgst > 0:

                    db.add(
                        InvoiceLineItem(
                            invoice_id=proration_invoice.id,
                            description=(
                                "CGST "
                                f"({breakdown.tax_rate_percent / 2}%)"
                            ),
                            item_type="tax_cgst",
                            amount=breakdown.cgst,
                        )
                    )

                # --------------------------------------------------
                # SGST
                # --------------------------------------------------

                if breakdown.sgst > 0:

                    db.add(
                        InvoiceLineItem(
                            invoice_id=proration_invoice.id,
                            description=(
                                "SGST "
                                f"({breakdown.tax_rate_percent / 2}%)"
                            ),
                            item_type="tax_sgst",
                            amount=breakdown.sgst,
                        )
                    )

                # --------------------------------------------------
                # IGST
                # --------------------------------------------------

                if breakdown.igst > 0:

                    db.add(
                        InvoiceLineItem(
                            invoice_id=proration_invoice.id,
                            description=(
                                "IGST "
                                f"({breakdown.tax_rate_percent}%)"
                            ),
                            item_type="tax_igst",
                            amount=breakdown.igst,
                        )
                    )

                db.flush()

            # --------------------------------------------------
            # Downgrade
            # --------------------------------------------------

            elif net_amount < 0:

                latest_invoice = (
                    db.query(Invoice)
                    .filter(
                        Invoice.subscription_id
                        == subscription.id,
                        Invoice.status
                        == "paid",
                    )
                    .order_by(
                        Invoice.id.desc(),
                    )
                    .first()
                )

                if latest_invoice:

                    latest_payment = (
                        db.query(Payment)
                        .filter(
                            Payment.invoice_id
                            == latest_invoice.id,
                            Payment.status
                            == "completed",
                        )
                        .order_by(
                            Payment.id.desc(),
                        )
                        .first()
                    )

                    if latest_payment:

                        refund_value = min(
                            abs(net_amount),
                            Decimal(
                                str(
                                    latest_payment.amount,
                                )
                            ),
                        )

                        from app.services.payment_service import (
                            refund_payment,
                        )

                        refund_payment(
                            db,
                            latest_payment.id,
                            amount=refund_value,
                            reason=(
                                "Proration credit for "
                                f"downgrade to "
                                f"{new_plan.name}."
                            ),
                        )

        # --------------------------------------------------
        # Update subscription plan
        # --------------------------------------------------

        subscription.plan_id = new_plan.id

        subscription.billing_cycle = (
            new_plan.billing_cycle
        )

        # --------------------------------------------------
        # Commit
        # --------------------------------------------------

        db.commit()
        db.refresh(subscription)

        return {
            "subscription": subscription,
            "previous_plan_id": old_plan_id,
            "new_plan_id": new_plan.id,
            "previous_billing_cycle": old_cycle,
            "new_billing_cycle": new_cycle,
            "old_plan_credit": old_credit,
            "new_plan_charge": new_charge,
            "net_amount": net_amount,
            "proration_invoice_id": (
                proration_invoice.id
                if proration_invoice
                else None
            ),
        }

    except HTTPException:
        _rollback(db)
        raise

    except Exception:
        _rollback(db)
        raise


# ==========================================================
# Delete Subscription
# ==========================================================


def delete_subscription(
    db: Session,
    subscription_id: int,
    created_by: int | None = None,
) -> bool:
    """
    Permanently delete a subscription record.

    This is a database operation, not a lifecycle cancellation.
    """

    subscription = get_subscription_by_id(
        db,
        subscription_id,
        created_by,
    )

    try:
        db.delete(subscription)
        db.commit()

        return True

    except Exception:
        _rollback(db)
        raise