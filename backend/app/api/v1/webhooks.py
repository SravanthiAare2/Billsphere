"""
BillSphere Webhooks API

Endpoints:
- Mock payment gateway charge simulation
- Incoming payment webhook receiver
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import database_session
from app.schemas.webhook import MockChargeRequest, PaymentWebhookEvent
from app.services.webhook_service import (
    process_payment_webhook,
    simulate_gateway_charge,
)


router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"],
)


@router.post("/mock-gateway/charge")
def mock_gateway_charge(
    request: MockChargeRequest,
    db: Session = Depends(database_session),
):
    """
    Simulate a payment gateway attempting to charge a payment.

    No authentication required -- mirrors a real payment
    gateway calling into your system.
    """

    return simulate_gateway_charge(db, request)


@router.post("/payments")
def payment_webhook_receiver(
    event: PaymentWebhookEvent,
    db: Session = Depends(database_session),
):
    """
    Receive a payment gateway webhook event
    (paid / failed / refunded) and apply it.
    """

    return process_payment_webhook(db, event)