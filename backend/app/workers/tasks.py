"""
BillSphere Celery Tasks

Scheduled automation:
- subscription renewals
- failed-payment dunning (day 1 / 3 / 7)
- async notification placeholder
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
from app.services.payment_service import mark_payment_failed, mark_payment_success
from app.services.subscription_state_machine import cancel_subscription
from app.workers.celery_app import celery_app


RETRY_SCHEDULE_DAYS = (1, 3, 7)
MAX_RETRIES = len(RETRY_SCHEDULE_DAYS)


@celery_app.task(name="process_subscription_renewals")
def process_subscription_renewals() -> dict:
    """
    Renew every due trial/active subscription.

    The billing-cycle service is the single source of truth for:
    period calculation, invoice generation, usage charges and tax.
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
            due = subscription.next_billing_date or subscription.current_period_end
            if due is None:
                skipped += 1
                continue
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if due > now:
                skipped += 1
                continue

            try:
                result = renew_subscription_billing_period(db, subscription.id)
                if result.get("cancelled"):
                    cancelled += 1
                elif result.get("renewed"):
                    renewed += 1
                    if result.get("invoice"):
                        invoices_created += 1
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


def _schedule_first_retry(db, payment: Payment, now: datetime) -> None:
    existing = (
        db.query(PaymentRetry)
        .filter(PaymentRetry.payment_id == payment.id)
        .order_by(PaymentRetry.id.desc())
        .first()
    )
    if existing:
        return
    db.add(PaymentRetry(
        payment_id=payment.id,
        retry_count=1,
        retry_date=now + timedelta(days=RETRY_SCHEDULE_DAYS[0]),
        status="scheduled",
        error_message="Initial failure. Retry 1 scheduled for day 1.",
    ))


@celery_app.task(name="process_payment_retries")
def process_payment_retries() -> dict:
    """
    Execute configurable failed-payment retries.

    Retry attempts are scheduled for day 1, day 3 and day 7.
    A successful retry marks the payment/invoice paid.
    After the third failed attempt the subscription is cancelled.
    """
    db = SessionLocal()
    attempted = succeeded = failed = cancelled = scheduled = 0
    try:
        now = datetime.now(timezone.utc)
        failed_payments = db.query(Payment).filter(Payment.status == "failed").all()

        for payment in failed_payments:
            retry = (
                db.query(PaymentRetry)
                .filter(
                    PaymentRetry.payment_id == payment.id,
                    PaymentRetry.status == "scheduled",
                )
                .order_by(PaymentRetry.retry_count.desc())
                .first()
            )

            if retry is None:
                _schedule_first_retry(db, payment, now)
                scheduled += 1
                continue

            retry_date = retry.retry_date
            if retry_date and retry_date.tzinfo is None:
                retry_date = retry_date.replace(tzinfo=timezone.utc)
            if retry_date and retry_date > now:
                continue

            attempt_number = retry.retry_count
            attempted += 1
            success_rate = float(getattr(settings, "MOCK_PAYMENT_SUCCESS_RATE", 0.80))
            is_success = random.random() < success_rate

            retry.status = "completed" if is_success else "failed"
            retry.error_message = (
                f"Retry {attempt_number} succeeded."
                if is_success else
                f"Retry {attempt_number} failed."
            )

            if is_success:
                mark_payment_success(
                    db,
                    payment.id,
                    payment.transaction_id or f"TXN-RETRY-{payment.id:06d}-{attempt_number}",
                )
                succeeded += 1
                db.commit()
                continue

            failed += 1
            if attempt_number >= MAX_RETRIES:
                retry.status = "exhausted"
                invoice = db.query(Invoice).filter(Invoice.id == payment.invoice_id).first()
                if invoice and invoice.subscription_id:
                    subscription = db.query(Subscription).filter(
                        Subscription.id == invoice.subscription_id
                    ).first()
                    if subscription and subscription.status != "cancelled":
                        try:
                            cancel_subscription(
                                db=db,
                                subscription=subscription,
                                user_id=None,
                                reason="Payment retries exhausted after day 1, 3 and 7 attempts.",
                            )
                            cancelled += 1
                        except Exception as exc:
                            app_logger.warning("Retry exhaustion cancellation failed: %s", exc)
                db.commit()
                continue

            next_attempt = attempt_number + 1
            retry.status = "failed"
            db.add(PaymentRetry(
                payment_id=payment.id,
                retry_count=next_attempt,
                retry_date=now + timedelta(days=RETRY_SCHEDULE_DAYS[next_attempt - 1]),
                status="scheduled",
                error_message=f"Retry {next_attempt} scheduled.",
            ))
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
    app_logger.info("Email notification queued for %s", email)
    return {"email": email, "status": "queued", "message": message}
