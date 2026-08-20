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
import hashlib
import secrets
from urllib.parse import quote

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import app_logger

from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.payment import Payment
from app.models.payment_confirmation import PaymentConfirmation
from app.models.payment_retry import PaymentRetry
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User

from app.schemas.payment import (
    CheckoutRequest,
    PaymentCreate,
    PaymentUpdate,
)
from app.schemas.invoice import InvoiceCreate
from app.schemas.subscription import SubscriptionCreate
from app.services.invoice_service import create_invoice
from app.services.subscription_service import create_subscription
from app.services.notification_service import (
    send_payment_confirmation_notification,
    send_payment_failed_notification,
    send_payment_success_notification,
)
from app.core.config import settings

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
    owner_id: int | None = None,
) -> Payment | None:
    """
    Return payment by ID.
    """

    query = (
        db.query(Payment)
        .join(Invoice, Invoice.id == Payment.invoice_id)
        .join(Customer, Customer.id == Invoice.customer_id)
        .filter(Payment.id == payment_id)
    )

    if owner_id is not None:
        query = query.filter(Customer.owner_id == owner_id)

    return query.first()


# ==========================================================
# Create Payment
# ==========================================================


def create_payment(
    db: Session,
    payment_data: PaymentCreate,
    commit: bool = True,
    owner_id: int | None = None,
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

    if owner_id is not None:
        owned_invoice = (
            db.query(Invoice)
            .join(Customer, Customer.id == Invoice.customer_id)
            .filter(
                Invoice.id == invoice.id,
                Customer.owner_id == owner_id,
            )
            .first()
        )
        if not owned_invoice:
            raise HTTPException(status_code=404, detail="Invoice not found.")

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

    if commit:
        db.commit()
        db.refresh(payment)

    return payment


def checkout(
    db: Session,
    checkout_data: CheckoutRequest,
    owner_id: int,
) -> dict:
    """Run the complete explicit mock checkout lifecycle."""

    customer = (
        db.query(Customer)
        .filter(
            Customer.owner_id == owner_id,
            Customer.is_active.is_(True),
        )
        .order_by(Customer.id.asc())
        .first()
    )
    if not customer:
        user = db.query(User).filter(User.id == owner_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=404, detail="Customer not found.")

        customer = Customer(
            owner_id=user.id,
            company_name=(
                f"{user.first_name} {user.last_name}".strip()
                or user.email
            ),
            contact_name=(
                f"{user.first_name} {user.last_name}".strip()
                or user.email
            ),
            email=user.email,
            phone=user.phone,
            country="IN",
            is_active=True,
        )
        db.add(customer)
        db.flush()

    plan = (
        db.query(Plan)
        .filter(
            Plan.id == checkout_data.plan_id,
            Plan.is_active.is_(True),
        )
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    existing = (
        db.query(Subscription)
        .filter(
            Subscription.customer_id == customer.id,
            Subscription.plan_id == plan.id,
            Subscription.status.in_(("trial", "active", "paused", "past_due")),
        )
        .order_by(Subscription.id.desc())
        .first()
    )
    if existing:
        invoice = (
            db.query(Invoice)
            .filter(Invoice.subscription_id == existing.id)
            .order_by(Invoice.id.desc())
            .first()
        )
        payment = (
            db.query(Payment)
            .filter(
                Payment.invoice_id == invoice.id
                if invoice
                else Payment.id == -1,
            )
            .order_by(Payment.id.desc())
            .first()
        )
        if payment and payment.status == PAYMENT_COMPLETED and invoice:
            return _checkout_result(
                payment,
                invoice,
                existing,
                "already_completed",
                confirmation_url=None,
            )
        raise HTTPException(
            status_code=409,
            detail="A checkout already exists for this customer and plan.",
        )

    try:
        subscription = create_subscription(
            db,
            SubscriptionCreate(
                customer_id=customer.id,
                plan_id=plan.id,
                billing_cycle=plan.billing_cycle,
                status="trial",
                start_date=_now(),
            ),
            created_by=owner_id,
            commit=False,
        )
        invoice = create_invoice(
            db,
            InvoiceCreate(
                customer_id=customer.id,
                subscription_id=subscription.id,
                amount=_money(plan.price),
                total_amount=_money(plan.price),
                status=INVOICE_PENDING,
            ),
            owner_id=owner_id,
            commit=False,
        )
        payment = create_payment(
            db,
            PaymentCreate(
                invoice_id=invoice.id,
                amount=_money(invoice.total_amount),
                payment_method=checkout_data.payment_method,
                status=PAYMENT_PENDING,
            ),
            commit=False,
        )
        raw_token = secrets.token_urlsafe(48)
        expires_at = _now() + timedelta(
            minutes=settings.PAYMENT_CONFIRMATION_EXPIRE_MINUTES
        )
        db.add(
            PaymentConfirmation(
                payment_id=payment.id,
                token_hash=_confirmation_token_hash(raw_token),
                expires_at=expires_at,
            )
        )
        db.commit()
        db.refresh(payment)
        db.refresh(invoice)
        db.refresh(subscription)

        confirm_url = (
            f"{settings.FRONTEND_URL}/payment-confirmation?token="
            f"{quote(raw_token)}&decision=confirm"
        )
        reject_url = (
            f"{settings.FRONTEND_URL}/payment-confirmation?token="
            f"{quote(raw_token)}&decision=reject"
        )
        send_payment_confirmation_notification(
            db=db,
            payment_id=payment.id,
            user_id=owner_id,
            customer_id=customer.id,
            customer_name=customer.contact_name,
            plan_name=plan.name,
            billing_cycle=plan.billing_cycle,
            amount=str(payment.amount),
            currency=plan.currency or "INR",
            invoice_number=invoice.invoice_number,
            confirm_url=confirm_url,
            reject_url=reject_url,
        )
        return _checkout_result(
            payment,
            invoice,
            subscription,
            "confirmation_required",
            confirmation_expires_at=expires_at,
            confirmation_url=confirm_url,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Checkout failed.") from exc


def _checkout_result(
    payment: Payment,
    invoice: Invoice,
    subscription: Subscription,
    checkout_status: str,
    confirmation_expires_at: datetime | None = None,
    confirmation_url: str | None = None,
) -> dict:
    return {
        "checkout_status": checkout_status,
        "payment_id": payment.id,
        "payment_status": payment.status,
        "invoice_id": invoice.id,
        "invoice_status": invoice.status,
        "subscription_id": subscription.id,
        "subscription_status": subscription.status,
        "plan_id": subscription.plan_id,
        "amount": payment.amount,
        "currency": subscription.plan.currency if subscription.plan else "INR",
        "confirmation_expires_at": confirmation_expires_at,
        "confirmation_url": confirmation_url,
        "mock_mode": True,
    }


def _confirmation_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _confirmation_context(
    db: Session,
    raw_token: str,
) -> tuple[PaymentConfirmation, Payment, Invoice, Subscription, Plan]:
    confirmation = (
        db.query(PaymentConfirmation)
        .filter(PaymentConfirmation.token_hash == _confirmation_token_hash(raw_token))
        .with_for_update()
        .first()
    )
    if not confirmation:
        raise HTTPException(status_code=404, detail="Confirmation token is invalid.")
    if confirmation.used_at is not None:
        raise HTTPException(status_code=409, detail="Confirmation token has already been used.")
    if _as_utc(confirmation.expires_at) < _now():
        raise HTTPException(status_code=410, detail="Confirmation token has expired.")

    payment = get_payment_by_id(db, confirmation.payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    if payment.status != PAYMENT_PENDING:
        raise HTTPException(status_code=409, detail="Payment is no longer pending.")
    invoice = _get_invoice_for_payment(db, payment)
    subscription = _get_subscription_for_invoice(db, invoice)
    if not subscription:
        raise HTTPException(status_code=409, detail="Payment subscription is missing.")
    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")
    return confirmation, payment, invoice, subscription, plan


def get_payment_confirmation(db: Session, raw_token: str) -> dict:
    _, payment, invoice, subscription, plan = _confirmation_context(db, raw_token)
    return _confirmation_result(
        payment,
        invoice,
        subscription,
        plan,
        "pending",
    )


def confirm_payment_from_token(
    db: Session,
    raw_token: str,
    decision: str,
) -> dict:
    confirmation, payment, invoice, subscription, plan = _confirmation_context(
        db, raw_token
    )
    confirmation.used_at = _now()
    confirmation.decision = decision

    if decision == "confirm":
        payment = mark_payment_success(db, payment.id, f"confirmed_{payment.id}")
        result = "confirmed"
        send_payment_success_notification(
            db,
            payment.id,
            user_id=subscription.customer.owner_id,
            customer_id=subscription.customer_id,
            amount=str(payment.amount),
        )
    else:
        payment = mark_payment_failed(db, payment.id)
        result = "rejected"
        send_payment_failed_notification(
            db,
            payment.id,
            user_id=subscription.customer.owner_id,
            customer_id=subscription.customer_id,
            reason="Payment rejected by customer.",
        )

    db.refresh(invoice)
    db.refresh(subscription)
    return _confirmation_result(payment, invoice, subscription, plan, result)


def _confirmation_result(
    payment: Payment,
    invoice: Invoice,
    subscription: Subscription,
    plan: Plan,
    result: str,
) -> dict:
    return {
        "result": result,
        "payment_id": payment.id,
        "payment_status": payment.status,
        "invoice_id": invoice.id,
        "invoice_status": invoice.status,
        "subscription_id": subscription.id,
        "subscription_status": subscription.status,
        "plan_id": plan.id,
        "plan_name": plan.name,
        "amount": payment.amount,
        "currency": plan.currency or "INR",
        "billing_cycle": subscription.billing_cycle,
        "next_billing_date": subscription.next_billing_date,
    }


# ==========================================================
# List Payments
# ==========================================================


def list_payments(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    owner_id: int | None = None,
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

    query = (
        db.query(Payment)
        .join(Invoice, Invoice.id == Payment.invoice_id)
        .join(Customer, Customer.id == Invoice.customer_id)
    )

    if owner_id is not None:
        query = query.filter(Customer.owner_id == owner_id)

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
    owner_id: int | None = None,
) -> Payment:
    """
    Generic payment update.

    Lifecycle transitions should preferably use the dedicated
    success/failed/refund functions.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
        owner_id=owner_id,
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
    owner_id: int | None = None,
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
        owner_id=owner_id,
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
    owner_id: int | None = None,
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
        owner_id=owner_id,
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
    owner_id: int | None = None,
    commit: bool = True,
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
        owner_id=owner_id,
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

        db.flush()

        if commit:
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