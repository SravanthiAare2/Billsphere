"""
BillSphere Webhook Service

Handles:
- Mock payment gateway simulation
- Incoming payment webhook event processing
"""

from __future__ import annotations

import random
import uuid
from app.core.config import settings
from app.models.audit_log import AuditLog

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import app_logger
from app.schemas.webhook import MockChargeRequest, PaymentWebhookEvent
from app.services.payment_service import (
    get_payment_by_id,
    mark_payment_failed,
    mark_payment_success,
    refund_payment,
)


# ==========================================================
# Mock Payment Gateway
# ==========================================================

def simulate_gateway_charge(
    db: Session,
    request: MockChargeRequest,
) -> dict:
    """
    Simulate a payment gateway attempting to charge a payment.

    ~80% success rate by default, unless force_result is set.
    Applies the outcome directly (as a real webhook receiver
    would after the gateway calls back).
    """

    payment = get_payment_by_id(db, request.payment_id)

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    if request.force_result == "success":
        succeeded = True
    elif request.force_result == "failure":
        succeeded = False
    else:
        rate = request.success_rate if request.success_rate is not None else float(getattr(settings, "MOCK_PAYMENT_SUCCESS_RATE", 0.80))
        succeeded = random.random() < rate

    transaction_id = f"txn_{uuid.uuid4().hex[:16]}"

    if succeeded:
        mark_payment_success(db, payment.id, transaction_id)
        app_logger.info(
            f"Mock gateway: payment {payment.id} succeeded "
            f"(txn={transaction_id})"
        )
        return {
            "payment_id": payment.id,
            "result": "success",
            "transaction_id": transaction_id,
        }

    mark_payment_failed(db, payment.id)
    app_logger.info(f"Mock gateway: payment {payment.id} failed")
    return {
        "payment_id": payment.id,
        "result": "failure",
        "transaction_id": None,
    }


# ==========================================================
# Webhook Event Processor
# ==========================================================

def process_payment_webhook(
    db: Session,
    event: PaymentWebhookEvent,
) -> dict:
    """
    Process an inbound payment webhook event.

    Supported event_type values: paid, failed, refunded.
    """

    payment = get_payment_by_id(db, event.payment_id)

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found",
        )

    event_type = event.event_type.strip().lower()

    if event.event_id:
        duplicate = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == "webhook_processed",
                AuditLog.description.like(f"%event_id={event.event_id}%"),
            )
            .first()
        )
        if duplicate:
            return {
                "payment_id": payment.id,
                "event_type": event_type,
                "status": payment.status,
                "duplicate": True,
            }

    if event_type == "paid":
        transaction_id = event.transaction_id or f"txn_{uuid.uuid4().hex[:16]}"
        payment = mark_payment_success(db, payment.id, transaction_id)

    elif event_type == "failed":
        payment = mark_payment_failed(db, payment.id)

    elif event_type == "refunded":
        payment = refund_payment(
            db,
            payment.id,
            amount=event.amount,
            reason=event.reason,
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported webhook event_type: '{event.event_type}'",
        )

    db.add(AuditLog(
        user_id=None,
        action="webhook_processed",
        module="webhooks",
        description=f"Payment webhook processed: event_id={event.event_id or 'generated'}, event_type={event_type}, payment_id={payment.id}",
        entity_id=payment.id,
        entity_type="payment",
    ))
    db.commit()

    app_logger.info(
        f"Webhook processed: payment_id={payment.id}, event={event_type}"
    )

    return {
        "payment_id": payment.id,
        "event_type": event_type,
        "status": payment.status,
    }