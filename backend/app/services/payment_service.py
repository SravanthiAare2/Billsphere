"""
BillSphere Payment Service

Handles:

- Payment creation
- Payment retrieval
- Payment updates
- Successful payments
- Failed payments
- Failed-payment dunning
- Day 1 / Day 3 / Day 7 retries
- Invoice state changes
- Subscription lifecycle integration
- Renewal completion
- Refunds
- Audit logs
- Payment idempotency
- Renewal idempotency
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import app_logger

from app.models.audit_log import AuditLog
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.payment import Payment
from app.models.payment_retry import PaymentRetry
from app.models.subscription import Subscription

from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
)

from app.services.subscription_state_machine import (
    SubscriptionLifecycleException,
    SubscriptionStatus,
    activate_subscription,
    mark_past_due,
)

from app.services.billing_cycle_service import (
    complete_successful_renewal,
    get_billing_cycle_by_invoice,
)


# ==========================================================
# Constants
# ==========================================================

RETRY_SCHEDULE_DAYS = (
    1,
    3,
    7,
)

PAYMENT_PENDING = "pending"
PAYMENT_COMPLETED = "completed"
PAYMENT_FAILED = "failed"
PAYMENT_REFUNDED = "refunded"
PAYMENT_PARTIALLY_REFUNDED = "partially_refunded"

INVOICE_PENDING = "pending"
INVOICE_PAID = "paid"
INVOICE_VOID = "void"


# ==========================================================
# Internal Helpers
# ==========================================================


def _now() -> datetime:
    """
    Return the current UTC datetime.
    """
    return datetime.now(timezone.utc)


def _as_utc(
    value: datetime | None,
) -> datetime | None:
    """
    Normalize a datetime to timezone-aware UTC.

    Handles both naive and timezone-aware datetimes.
    """

    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _money(
    value: Decimal | int | float | str | None,
) -> Decimal:
    """
    Safely normalize a monetary value to two decimal places.
    """

    try:
        return Decimal(
            str(value if value is not None else 0)
        ).quantize(
            Decimal("0.01")
        )
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid monetary amount.",
        )


def _get_invoice_for_payment(
    db: Session,
    payment: Payment,
) -> Invoice:
    """
    Return the invoice associated with a payment.
    """

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == payment.invoice_id
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice associated with payment not found.",
        )

    return invoice


def _get_subscription_for_invoice(
    db: Session,
    invoice: Invoice,
) -> Subscription | None:
    """
    Return the subscription associated with an invoice.
    """

    if not invoice.subscription_id:
        return None

    return (
        db.query(Subscription)
        .filter(
            Subscription.id
            == invoice.subscription_id
        )
        .first()
    )


# ==========================================================
# Audit Helper
# ==========================================================


def _audit(
    db: Session,
    action: str,
    description: str,
    entity_id: int,
) -> None:
    """
    Create payment audit-log entry.

    Audit records are added to the current transaction and
    committed together with the payment operation.
    """

    db.add(
        AuditLog(
            user_id=None,
            action=action,
            module="payments",
            description=description,
            entity_id=entity_id,
            entity_type="payment",
        )
    )


# ==========================================================
# Payment Retrieval
# ==========================================================


def get_payment_by_id(
    db: Session,
    payment_id: int,
) -> Payment | None:
    """
    Return payment by ID.
    """

    return (
        db.query(Payment)
        .filter(
            Payment.id == payment_id
        )
        .first()
    )


# ==========================================================
# Create Payment
# ==========================================================


def create_payment(
    db: Session,
    payment_data: PaymentCreate,
) -> Payment:
    """
    Create a payment record.

    The payment initially represents a payment attempt.

    The dedicated success/failed functions should then be
    used to finalize its lifecycle.
    """

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id
            == payment_data.invoice_id
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    invoice_status = str(
        invoice.status or ""
    ).strip().lower()

    if invoice_status == INVOICE_PAID:
        raise HTTPException(
            status_code=400,
            detail="Invoice is already paid.",
        )

    if invoice_status == INVOICE_VOID:
        raise HTTPException(
            status_code=400,
            detail="Cannot create payment for a void invoice.",
        )

    amount = _money(
        payment_data.amount
    )

    invoice_total = _money(
        invoice.total_amount
    )

    if amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero.",
        )

    if amount > invoice_total:
        raise HTTPException(
            status_code=400,
            detail="Payment amount cannot exceed invoice total.",
        )

    requested_status = str(
        payment_data.status or PAYMENT_PENDING
    ).strip().lower()

    allowed_statuses = {
        PAYMENT_PENDING,
        PAYMENT_COMPLETED,
        PAYMENT_FAILED,
    }

    if requested_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid payment status. "
                "Allowed values: pending, completed, failed."
            ),
        )

    payment = Payment(
        invoice_id=payment_data.invoice_id,
        amount=amount,
        payment_method=payment_data.payment_method,
        transaction_id=payment_data.transaction_id,
        status=requested_status,
    )

    db.add(payment)
    db.flush()

    _audit(
        db,
        "payment_created",
        (
            f"Payment {payment.id} created for "
            f"invoice {invoice.id}."
        ),
        payment.id,
    )

    db.commit()
    db.refresh(payment)

    return payment


# ==========================================================
# List Payments
# ==========================================================


def list_payments(
    db: Session,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """
    Return paginated payments.
    """

    if (
        page < 1
        or page_size < 1
        or page_size > 100
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid pagination values.",
        )

    query = db.query(Payment)

    total = query.count()

    items = (
        query
        .order_by(
            Payment.id.desc()
        )
        .offset(
            (page - 1) * page_size
        )
        .limit(page_size)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ==========================================================
# Update Payment
# ==========================================================


def update_payment(
    db: Session,
    payment_id: int,
    payment_data: PaymentUpdate,
) -> Payment:
    """
    Generic payment update.

    Lifecycle transitions should preferably use the dedicated
    success/failed/refund functions.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    update_data = payment_data.model_dump(
        exclude_unset=True
    )

    if "amount" in update_data:
        new_amount = _money(
            update_data["amount"]
        )

        if new_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=400,
                detail="Payment amount must be greater than zero.",
            )

        if new_amount != _money(payment.amount):
            refunded_amount = _money(
                getattr(
                    payment,
                    "refunded_amount",
                    0,
                )
            )

            if refunded_amount > new_amount:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Payment amount cannot be lower "
                        "than the already refunded amount."
                    ),
                )

        update_data["amount"] = new_amount

    if "status" in update_data:
        requested_status = str(
            update_data["status"] or ""
        ).strip().lower()

        allowed_statuses = {
            PAYMENT_PENDING,
            PAYMENT_COMPLETED,
            PAYMENT_FAILED,
            PAYMENT_REFUNDED,
            PAYMENT_PARTIALLY_REFUNDED,
        }

        if requested_status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid payment status.",
            )

        update_data["status"] = requested_status

    for key, value in update_data.items():
        setattr(
            payment,
            key,
            value,
        )

    db.commit()
    db.refresh(payment)

    return payment


# ==========================================================
# Clear Open Retry Records
# ==========================================================


def _clear_open_retries(
    db: Session,
    payment_id: int,
) -> None:
    """
    Cancel scheduled retries after successful payment.

    Only open retry records are changed.
    Historical completed/failed/cancelled retry records
    remain untouched.
    """

    db.query(PaymentRetry).filter(
        PaymentRetry.payment_id == payment_id,
        PaymentRetry.status.in_(
            [
                "scheduled",
                "pending",
                "processing",
            ]
        ),
    ).update(
        {
            "status": "cancelled",
        },
        synchronize_session=False,
    )


# ==========================================================
# Schedule Payment Retries
# ==========================================================


def _schedule_payment_retries(
    db: Session,
    payment_id: int,
    failure_time: datetime,
) -> list[PaymentRetry]:
    """
    Schedule Day 1, Day 3 and Day 7 retries.

    Idempotent.

    retry_count stores the retry day:
        1
        3
        7
    """

    failure_time = (
        _as_utc(failure_time)
        or _now()
    )

    retries: list[PaymentRetry] = []

    for retry_day in RETRY_SCHEDULE_DAYS:

        existing_retry = (
            db.query(PaymentRetry)
            .filter(
                PaymentRetry.payment_id
                == payment_id,
                PaymentRetry.retry_count
                == retry_day,
            )
            .order_by(
                PaymentRetry.id.desc()
            )
            .first()
        )

        if existing_retry:
            retries.append(
                existing_retry
            )
            continue

        retry = PaymentRetry(
            payment_id=payment_id,
            retry_count=retry_day,
            retry_date=(
                failure_time
                + timedelta(days=retry_day)
            ),
            status="scheduled",
            error_message=None,
        )

        db.add(retry)
        retries.append(retry)

    db.flush()

    return retries


# ==========================================================
# Complete Renewal If Required
# ==========================================================


def _complete_renewal_if_required(
    db: Session,
    invoice: Invoice,
    subscription: Subscription,
) -> bool:
    """
    If the paid invoice belongs to a billing-cycle renewal,
    complete the renewal.

    Returns:

        True
            Renewal was completed or was already completed.

        False
            Invoice is not a billing-cycle renewal invoice.

    Normal first/trial subscription invoices do not need
    renewal completion.
    """

    billing_cycle = get_billing_cycle_by_invoice(
        db,
        invoice.id,
    )

    if not billing_cycle:
        return False

    # ------------------------------------------------------
    # Only invoices attached to an invoiced/renewed cycle
    # are renewal invoices.
    # ------------------------------------------------------

    if billing_cycle.status not in {
        "invoiced",
        "renewed",
    }:
        return False

    # ------------------------------------------------------
    # Already renewed
    # ------------------------------------------------------

    if billing_cycle.status == "renewed":
        return True

    complete_successful_renewal(
        db=db,
        subscription=subscription,
        invoice=invoice,
    )

    return True


# ==========================================================
# Mark Payment Successful
# ==========================================================


def mark_payment_success(
    db: Session,
    payment_id: int,
    transaction_id: str,
) -> Payment:
    """
    Mark payment successful.

    Flow:

        Payment
            ↓
        completed
            ↓
        Invoice
            ↓
        paid
            ↓
        Renewal?
          /   \
        yes    no
        ↓       ↓
    advance   activate
    cycle     subscription

    The entire operation is handled as one database
    transaction.

    Repeating the same success operation is idempotent.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    # ------------------------------------------------------
    # Already completed
    # ------------------------------------------------------

    if str(
        payment.status or ""
    ).strip().lower() == PAYMENT_COMPLETED:

        if transaction_id:
            payment.transaction_id = transaction_id

        db.commit()
        db.refresh(payment)

        return payment

    # ------------------------------------------------------
    # Do not allow a refunded payment to become completed
    # again.
    # ------------------------------------------------------

    if str(
        payment.status or ""
    ).strip().lower() in {
        PAYMENT_REFUNDED,
        PAYMENT_PARTIALLY_REFUNDED,
    }:
        raise HTTPException(
            status_code=400,
            detail="A refunded payment cannot be marked successful.",
        )

    now = _now()

    try:

        # --------------------------------------------------
        # Payment
        # --------------------------------------------------

        payment.status = PAYMENT_COMPLETED
        payment.transaction_id = transaction_id
        payment.payment_date = now

        # --------------------------------------------------
        # Cancel future retries
        # --------------------------------------------------

        _clear_open_retries(
            db,
            payment.id,
        )

        # --------------------------------------------------
        # Invoice
        # --------------------------------------------------

        invoice = _get_invoice_for_payment(
            db,
            payment,
        )

        invoice_status = str(
            invoice.status or ""
        ).strip().lower()

        if invoice_status == INVOICE_VOID:
            raise HTTPException(
                status_code=400,
                detail="Cannot complete payment for a void invoice.",
            )

        if invoice_status == INVOICE_PAID:
            invoice.paid_at = (
                invoice.paid_at or now
            )
        else:
            invoice.status = INVOICE_PAID
            invoice.paid_at = now

        # --------------------------------------------------
        # Subscription
        # --------------------------------------------------

        subscription = _get_subscription_for_invoice(
            db,
            invoice,
        )

        renewal_completed = False

        if subscription:

            # ----------------------------------------------
            # Renewal payment
            # ----------------------------------------------

            renewal_completed = (
                _complete_renewal_if_required(
                    db=db,
                    invoice=invoice,
                    subscription=subscription,
                )
            )

            # ----------------------------------------------
            # Normal activation
            # ----------------------------------------------

            if not renewal_completed:

                subscription_status = str(
                    subscription.status or ""
                ).strip().lower()

                if subscription_status in {
                    SubscriptionStatus.TRIAL.value,
                    SubscriptionStatus.PAST_DUE.value,
                }:

                    try:

                        activate_subscription(
                            db=db,
                            subscription=subscription,
                            user_id=None,
                        )

                    except SubscriptionLifecycleException:

                        # Payment has succeeded, so do not turn
                        # it into a failed payment simply because
                        # a lifecycle transition was unavailable.
                        #
                        # The subscription can be reconciled later
                        # by lifecycle/scheduler processing.
                        app_logger.warning(
                            (
                                "Payment %s succeeded but "
                                "subscription %s could not be "
                                "activated automatically."
                            ),
                            payment.id,
                            subscription.id,
                        )

        # --------------------------------------------------
        # Audit
        # --------------------------------------------------

        _audit(
            db,
            "payment_received",
            (
                f"Payment {payment.id} completed successfully "
                f"for invoice {invoice.id}."
            ),
            payment.id,
        )

        db.commit()
        db.refresh(payment)

        return payment

    except HTTPException:
        db.rollback()
        raise

    except SubscriptionLifecycleException:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Payment succeeded, but the subscription "
                "renewal could not be completed."
            ),
        )

    except Exception as exc:
        db.rollback()

        app_logger.exception(
            "Unexpected error while completing payment %s.",
            payment_id,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Payment could not be completed because "
                "an internal processing error occurred."
            ),
        ) from exc


# ==========================================================
# Mark Payment Failed
# ==========================================================


def mark_payment_failed(
    db: Session,
    payment_id: int,
) -> Payment:
    """
    Mark payment failed.

    Flow:

        Payment failed
              ↓
        Invoice pending
              ↓
        Subscription past_due
              ↓
        Day 1
              ↓
        Day 3
              ↓
        Day 7

    Failure processing is idempotent.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    current_status = str(
        payment.status or ""
    ).strip().lower()

    # ------------------------------------------------------
    # Already refunded
    # ------------------------------------------------------

    if current_status in {
        PAYMENT_REFUNDED,
        PAYMENT_PARTIALLY_REFUNDED,
    }:
        raise HTTPException(
            status_code=400,
            detail="A refunded payment cannot be marked failed.",
        )

    # ------------------------------------------------------
    # Already failed
    # ------------------------------------------------------

    if current_status == PAYMENT_FAILED:

        existing_retries = (
            db.query(PaymentRetry)
            .filter(
                PaymentRetry.payment_id
                == payment.id
            )
            .count()
        )

        # If retry records already exist, the operation has
        # already been processed.
        if existing_retries > 0:

            db.refresh(payment)

            return payment

    failure_time = _now()

    try:

        # --------------------------------------------------
        # Payment
        # --------------------------------------------------

        payment.status = PAYMENT_FAILED

        # --------------------------------------------------
        # Invoice
        # --------------------------------------------------

        invoice = _get_invoice_for_payment(
            db,
            payment,
        )

        invoice.status = INVOICE_PENDING
        invoice.paid_at = None

        # --------------------------------------------------
        # Subscription
        # --------------------------------------------------

        subscription = _get_subscription_for_invoice(
            db,
            invoice,
        )

        if subscription:

            subscription_status = str(
                subscription.status or ""
            ).strip().lower()

            if subscription_status in {
                SubscriptionStatus.ACTIVE.value,
                SubscriptionStatus.TRIAL.value,
            }:

                try:

                    mark_past_due(
                        db=db,
                        subscription=subscription,
                        user_id=None,
                    )

                except SubscriptionLifecycleException:

                    # Payment failure must still be recorded.
                    app_logger.warning(
                        (
                            "Payment %s failed but "
                            "subscription %s could not be "
                            "transitioned to past_due."
                        ),
                        payment.id,
                        subscription.id,
                    )

        # --------------------------------------------------
        # Dunning
        # --------------------------------------------------

        scheduled_retries = (
            _schedule_payment_retries(
                db=db,
                payment_id=payment.id,
                failure_time=failure_time,
            )
        )

        app_logger.info(
            (
                "Payment %s failed. "
                "Scheduled %s retry attempts."
            ),
            payment.id,
            len(scheduled_retries),
        )

        # --------------------------------------------------
        # Audit
        # --------------------------------------------------

        _audit(
            db,
            "payment_failed",
            (
                f"Payment {payment.id} failed; "
                f"{len(scheduled_retries)} retry attempts "
                f"scheduled."
            ),
            payment.id,
        )

        db.commit()
        db.refresh(payment)

        return payment

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        app_logger.exception(
            "Unexpected error while failing payment %s.",
            payment_id,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Payment failure processing could not be completed."
            ),
        ) from exc


# ==========================================================
# Retry Management Helpers
# ==========================================================


def get_payment_retries(
    db: Session,
    payment_id: int,
) -> list[PaymentRetry]:
    """
    Return all retry records associated with a payment.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    return (
        db.query(PaymentRetry)
        .filter(
            PaymentRetry.payment_id
            == payment_id
        )
        .order_by(
            PaymentRetry.retry_count.asc(),
            PaymentRetry.id.asc(),
        )
        .all()
    )


def get_due_payment_retries(
    db: Session,
    limit: int = 100,
) -> list[PaymentRetry]:
    """
    Return scheduled payment retries whose retry date
    has arrived.

    Only scheduled/pending retries are returned.
    """

    if limit < 1:
        limit = 1

    if limit > 1000:
        limit = 1000

    now = _now()

    return (
        db.query(PaymentRetry)
        .filter(
            PaymentRetry.retry_date <= now,
            PaymentRetry.status.in_(
                [
                    "scheduled",
                    "pending",
                ]
            ),
        )
        .order_by(
            PaymentRetry.retry_date.asc(),
            PaymentRetry.id.asc(),
        )
        .limit(limit)
        .all()
    )


# ==========================================================
# Mark Retry Processing
# ==========================================================


def mark_retry_processing(
    db: Session,
    retry_id: int,
) -> PaymentRetry:
    """
    Mark a scheduled retry as processing.

    Prevents the same retry from being picked up repeatedly
    by concurrent scheduler runs.
    """

    retry = (
        db.query(PaymentRetry)
        .filter(
            PaymentRetry.id == retry_id
        )
        .first()
    )

    if not retry:
        raise HTTPException(
            status_code=404,
            detail="Payment retry not found.",
        )

    retry_status = str(
        retry.status or ""
    ).strip().lower()

    if retry_status in {
        "completed",
        "failed",
        "cancelled",
    }:
        return retry

    retry.status = "processing"

    db.commit()
    db.refresh(retry)

    return retry


# ==========================================================
# Mark Retry Completed
# ==========================================================


def mark_retry_completed(
    db: Session,
    retry_id: int,
) -> PaymentRetry:
    """
    Mark a payment retry as completed.
    """

    retry = (
        db.query(PaymentRetry)
        .filter(
            PaymentRetry.id == retry_id
        )
        .first()
    )

    if not retry:
        raise HTTPException(
            status_code=404,
            detail="Payment retry not found.",
        )

    retry.status = "completed"

    db.commit()
    db.refresh(retry)

    return retry


# ==========================================================
# Mark Retry Failed
# ==========================================================


def mark_retry_failed(
    db: Session,
    retry_id: int,
    error_message: str | None = None,
) -> PaymentRetry:
    """
    Mark a payment retry as failed.

    The payment itself remains failed and can continue through
    the configured dunning lifecycle.
    """

    retry = (
        db.query(PaymentRetry)
        .filter(
            PaymentRetry.id == retry_id
        )
        .first()
    )

    if not retry:
        raise HTTPException(
            status_code=404,
            detail="Payment retry not found.",
        )

    retry.status = "failed"
    retry.error_message = error_message

    db.commit()
    db.refresh(retry)

    return retry


# ==========================================================
# Refund Payment
# ==========================================================


def refund_payment(
    db: Session,
    payment_id: int,
    amount: Decimal | None = None,
    reason: str | None = None,
) -> Payment:
    """
    Refund a completed payment fully or partially.

    Rules:

    - Only completed/refundable payments can be refunded.
    - Refund amount cannot exceed the remaining amount.
    - Multiple partial refunds are supported.
    - Full refund changes payment to refunded.
    - Partial refund changes payment to partially_refunded.
    - A fully refunded invoice is voided.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    payment_status = str(
        payment.status or ""
    ).strip().lower()

    if payment_status not in {
        PAYMENT_COMPLETED,
        PAYMENT_REFUNDED,
        PAYMENT_PARTIALLY_REFUNDED,
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only completed or previously refunded "
                "payments can be refunded. "
                f"Current status: '{payment.status}'."
            ),
        )

    # ------------------------------------------------------
    # Payment amount
    # ------------------------------------------------------

    payment_amount = _money(
        payment.amount
    )

    already_refunded = _money(
        getattr(
            payment,
            "refunded_amount",
            0,
        )
    )

    remaining = (
        payment_amount
        - already_refunded
    ).quantize(
        Decimal("0.01")
    )

    if remaining <= Decimal("0.00"):
        raise HTTPException(
            status_code=400,
            detail="Payment has already been fully refunded.",
        )

    # ------------------------------------------------------
    # Requested refund amount
    # ------------------------------------------------------

    if amount is None:

        refund_amount = remaining

    else:

        refund_amount = _money(
            amount
        )

    if refund_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=400,
            detail="Refund amount must be greater than zero.",
        )

    if refund_amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=(
                "Refund amount exceeds the remaining "
                "refundable amount."
            ),
        )

    try:

        # --------------------------------------------------
        # Update payment
        # --------------------------------------------------

        new_refunded_amount = (
            already_refunded
            + refund_amount
        ).quantize(
            Decimal("0.01")
        )

        payment.refunded_amount = (
            new_refunded_amount
        )

        payment.refunded_at = _now()
        payment.refund_reason = reason

        if new_refunded_amount >= payment_amount:

            payment.refunded_amount = payment_amount
            payment.status = PAYMENT_REFUNDED

        else:

            payment.status = (
                PAYMENT_PARTIALLY_REFUNDED
            )

        # --------------------------------------------------
        # Invoice
        # --------------------------------------------------

        invoice = (
            db.query(Invoice)
            .filter(
                Invoice.id
                == payment.invoice_id
            )
            .first()
        )

        if invoice:

            if payment.status == PAYMENT_REFUNDED:
                invoice.status = INVOICE_VOID

            db.add(
                InvoiceLineItem(
                    invoice_id=invoice.id,
                    description=(
                        "Refund: "
                        f"{reason or 'Payment refund'}"
                    ),
                    item_type="refund",
                    amount=-refund_amount,
                )
            )

        # --------------------------------------------------
        # Audit
        # --------------------------------------------------

        _audit(
            db,
            "refund_issued",
            (
                f"Refund of {refund_amount:.2f} "
                f"issued for payment {payment.id}."
            ),
            payment.id,
        )

        db.commit()
        db.refresh(payment)

        return payment

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        app_logger.exception(
            "Refund failed for payment %s.",
            payment_id,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Refund could not be completed because "
                "an internal processing error occurred."
            ),
        ) from exc


# ==========================================================
# Payment Summary
# ==========================================================


def get_payment_summary(
    db: Session,
    payment_id: int,
) -> dict:
    """
    Return payment details together with invoice,
    subscription and retry information.

    Useful for admin/customer payment views.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == payment.invoice_id
        )
        .first()
    )

    subscription = None

    if invoice and invoice.subscription_id:

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.id
                == invoice.subscription_id
            )
            .first()
        )

    retries = (
        db.query(PaymentRetry)
        .filter(
            PaymentRetry.payment_id
            == payment.id
        )
        .order_by(
            PaymentRetry.retry_count.asc()
        )
        .all()
    )

    billing_cycle = None

    if invoice:

        billing_cycle = (
            get_billing_cycle_by_invoice(
                db,
                invoice.id,
            )
        )

    return {
        "payment": payment,
        "invoice": invoice,
        "subscription": subscription,
        "billing_cycle": billing_cycle,
        "retries": retries,
    }