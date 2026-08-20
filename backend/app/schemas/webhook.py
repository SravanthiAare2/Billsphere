"""
BillSphere Webhook Schemas
"""

from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentWebhookEvent(BaseModel):
    """
    Incoming payment gateway webhook payload.
    """

    event_type: str = Field(
        ...,
        description="paid | failed | refunded",
    )

    event_id: str | None = Field(
        default=None,
        description="Gateway webhook event ID used for idempotency.",
    )

    payment_id: int = Field(
        ...,
        description="Payment ID this event applies to.",
    )

    transaction_id: str | None = Field(
        default=None,
        description="Gateway transaction reference.",
    )

    amount: Decimal | None = Field(
        default=None,
        description="Amount relevant to the event (refund amount, etc).",
    )

    reason: str | None = Field(
        default=None,
        description="Failure/refund reason, if applicable.",
    )


class MockChargeRequest(BaseModel):
    """
    Request to simulate a gateway charge attempt.
    """

    payment_id: int

    force_result: str | None = Field(
        default=None,
        description="Optional: 'success' or 'failure' to force an outcome.",
    )