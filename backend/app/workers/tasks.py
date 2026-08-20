"""
BillSphere Celery Tasks

Scheduled automation:
- subscription renewals
- failed-payment dunning (day 1 / 3 / 7)
- async notification placeholder

The payment service is the source of truth for creating the Day 1,
Day 3 and Day 7 retry records.  This worker only executes retry records
that are actually due; it does not create duplicate retry attempts.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import app_logger
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.payment_retry import PaymentRetry
from app.models.subscription import Subscription
from app.services.billing_cycle_service import renew_subscription_billing_period
from app.services.payment_service import mark_payment_success
from app.services.subscription_state_machine import cancel_subscription
from app.workers.celery_app import celery_app


RETRY_SCHEDULE_DAYS = (1, 3, 7)
MAX_RETRY_DAY = RETRY_SCHEDULE_DAYS[-1]


@celery_app.task(name="process_subscription_renewals")
def process_subscription_renewals() -> dict:
    """
    Process every due trial/active subscription.

    The billing-cycle service remains the single source of truth for:
    period calculation, invoice generation, usage charges and tax.

    Creating a renewal invoice does not mean that the subscription has
    renewed. The subscription advances only after payment succeeds.
    """

    db = SessionLocal()
    renewed = cancelled = skipped = errors = invoices_created = 0

    try:
        subscriptions = db.execute(
            select(Subscription).where(
                Subscription.status.in_(["trial", "active"])
            )
        ).scalars().all()

        now = datetime.now(timezone.utc)

        for subscription in subscriptions:
            due = (
                subscription.next_billing_date
                or subscription.current_period_end
            )

            if due is None:
                skipped += 1
                continue

            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)

            if due > now:
                skipped += 1
                continue

            try:
                result = renew_subscription_billing_period(
                    db,
                    subscription.id,
                )

                invoice = result.get("invoice")

                if invoice is not None:
                    invoices_created += 1

                if result.get("cancelled"):
                    cancelled += 1
                elif result.get("renewed"):
                    renewed += 1

            except Exception as exc:
                db.rollback()
                errors += 1
                app_logger.exception(
                    "Subscription renewal failed for %s: %s",
                    subscription.id,
                    exc,
                )

        return {
            "status": "completed",
            "renewed": renewed,
            "cancelled": cancelled,
            "skipped": skipped,
            "errors": errors,
            "invoices_created": invoices_created,
        }

    finally:
        db.close()


def _schedule_first_retry(
    db,
    payment: Payment,
    now: datetime,
) -> None:
    """
    Backward-compatible safety helper.

    Normally mark_payment_failed() creates all Day 1/3/7 records.
    This helper only creates Day 1 when a legacy failed payment has
    no retry records at all.
    """

    existing = (
        db.query(PaymentRetry)
        .filter(PaymentRetry.payment_id == payment.id)
        .first()
    )

    if existing:
        return

    db.add(
        PaymentRetry(
            payment_id=payment.id,
            retry_count=RETRY_SCHEDULE_DAYS[0],
            retry_date=now + timedelta(days=RETRY_SCHEDULE_DAYS[0]),
            status="scheduled",
            error_message=(
                "Initial failure. Retry 1 scheduled for day 1."
            ),
        )
    )
    db.flush()


@celery_app.task(name="process_payment_retries")
def process_payment_retries() -> dict:
    """
    Execute due failed-payment retries.

    Retry records are created by payment_service.py with retry_count:

        1 -> Day 1
        3 -> Day 3
        7 -> Day 7

    Important:
    - Process the earliest due retry first.
    - Never treat retry_count as a sequential index.
    - Never create Day 2, Day 4, Day 5, or Day 6 records.
    - On success, mark_payment_success() cancels remaining scheduled
      retries for that payment.
    - On Day 7 failure, cancel the subscription.
    """

    db = SessionLocal()
    attempted = succeeded = failed = cancelled = scheduled = 0

    try:
        now = datetime.now(timezone.utc)

        failed_payments = (
            db.query(Payment)
            .filter(Payment.status == "failed")
            .order_by(Payment.id.asc())
            .all()
        )

        for payment in failed_payments:
            # The payment service normally creates all three records.
            # If an old payment has none, create only the first retry.
            scheduled_retries = (
                db.query(PaymentRetry)
                .filter(
                    PaymentRetry.payment_id == payment.id,
                    PaymentRetry.status == "scheduled",
                )
                .order_by(
                    PaymentRetry.retry_count.asc(),
                    PaymentRetry.id.asc(),
                )
                .all()
            )

            if not scheduled_retries:
                all_retries = (
                    db.query(PaymentRetry)
                    .filter(PaymentRetry.payment_id == payment.id)
                    .order_by(PaymentRetry.retry_count.desc())
                    .all()
                )

                if not all_retries:
                    _schedule_first_retry(db, payment, now)
                    db.commit()
                    scheduled += 1
                    continue

                # There are historical retries but no open retry.
                # If Day 7 already failed, the payment is exhausted.
                latest = all_retries[0]
                if latest.retry_count >= MAX_RETRY_DAY:
                    invoice = (
                        db.query(Invoice)
                        .filter(Invoice.id == payment.invoice_id)
                        .first()
                    )
                    if invoice and invoice.subscription_id:
                        subscription = (
                            db.query(Subscription)
                            .filter(
                                Subscription.id
                                == invoice.subscription_id
                            )
                            .first()
                        )
                        if (
                            subscription
                            and subscription.status != "cancelled"
                        ):
                            try:
                                cancel_subscription(
                                    db=db,
                                    subscription=subscription,
                                    user_id=None,
                                    reason=(
                                        "Payment retries exhausted "
                                        "after day 1, 3 and 7 attempts."
                                    ),
                                )
                                cancelled += 1
                            except Exception as exc:
                                app_logger.warning(
                                    "Retry exhaustion cancellation failed: %s",
                                    exc,
                                )
                    db.commit()
                continue

            # Only one retry is executed for a payment per worker run.
            # The remaining retries stay scheduled for their own dates.
            retry = scheduled_retries[0]

            retry_date = retry.retry_date
            if retry_date is None:
                retry_date = now
            elif retry_date.tzinfo is None:
                retry_date = retry_date.replace(tzinfo=timezone.utc)

            if retry_date > now:
                continue

            # Guard against malformed retry rows.  Only the supported
            # Day 1 / Day 3 / Day 7 values are executable.
            if retry.retry_count not in RETRY_SCHEDULE_DAYS:
                retry.status = "cancelled"
                retry.error_message = (
                    "Unsupported retry schedule value; retry cancelled."
                )
                db.commit()
                continue

            attempt_number = retry.retry_count
            attempted += 1

            # Mark processing before the mock gateway attempt so a
            # concurrent worker cannot select the same scheduled row.
            retry.status = "processing"
            db.flush()

            success_rate = float(
                getattr(
                    settings,
                    "MOCK_PAYMENT_SUCCESS_RATE",
                    0.80,
                )
            )
            success_rate = max(0.0, min(1.0, success_rate))
            is_success = random.random() < success_rate

            if is_success:
                retry.status = "completed"
                retry.error_message = (
                    f"Retry day {attempt_number} succeeded."
                )

                mark_payment_success(
                    db,
                    payment.id,
                    payment.transaction_id
                    or f"TXN-RETRY-{payment.id:06d}-{attempt_number}",
                )

                succeeded += 1
                # mark_payment_success commits and cancels all remaining
                # scheduled retries for this payment.
                continue

            # Retry failed. Keep the payment failed and preserve the
            # remaining pre-created Day 3/Day 7 records.
            retry.status = "failed"
            retry.error_message = (
                f"Retry day {attempt_number} failed."
            )
            failed += 1

            if attempt_number >= MAX_RETRY_DAY:
                retry.status = "failed"

                invoice = (
                    db.query(Invoice)
                    .filter(Invoice.id == payment.invoice_id)
                    .first()
                )

                if invoice and invoice.subscription_id:
                    subscription = (
                        db.query(Subscription)
                        .filter(
                            Subscription.id
                            == invoice.subscription_id
                        )
                        .first()
                    )

                    if (
                        subscription
                        and subscription.status != "cancelled"
                    ):
                        try:
                            cancel_subscription(
                                db=db,
                                subscription=subscription,
                                user_id=None,
                                reason=(
                                    "Payment retries exhausted "
                                    "after day 1, 3 and 7 attempts."
                                ),
                            )
                            cancelled += 1
                        except Exception as exc:
                            app_logger.warning(
                                "Retry exhaustion cancellation failed: %s",
                                exc,
                            )

            db.commit()

        return {
            "status": "completed",
            "attempted": attempted,
            "succeeded": succeeded,
            "failed": failed,
            "scheduled": scheduled,
            "cancelled": cancelled,
            "retry_schedule_days": list(RETRY_SCHEDULE_DAYS),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


@celery_app.task(name="send_email_notification")
def send_email_notification(email: str, message: str) -> dict:
    """Queue/log an email notification placeholder."""

    app_logger.info("Email notification queued for %s", email)
    return {
        "email": email,
        "status": "queued",
        "message": message,
    }