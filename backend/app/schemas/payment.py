"""
BillSphere Payment Schemas

Handles:

- Payment creation
- Payment update
- Payment response
- Payment list response
- Refund request/response
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# Payment Base
# ==========================================================


class PaymentBase(BaseModel):
    """
    Common payment fields.
    """

    invoice_id: int = Field(
        ...,
        description="Invoice ID associated with the payment.",
    )

    amount: Decimal = Field(
        ...,
        gt=0,
        description="Payment amount.",
    )

    payment_method: str = Field(
        default="card",
        description="Payment method.",
    )

    status: str = Field(
        default="pending",
        description="Payment status.",
    )


# ==========================================================
# Create Payment
# ==========================================================


class PaymentCreate(PaymentBase):
    """
    Create payment request.
    """

    transaction_id: str | None = Field(
        default=None,
        description="Optional transaction/reference ID.",
    )


class CheckoutRequest(BaseModel):
    """Safe mock checkout request."""

    plan_id: int = Field(..., gt=0)
    payment_method: str = Field(
        ...,
        pattern="^mock_(success|failure)$",
    )


class CheckoutResponse(BaseModel):
    """Result of a mock checkout lifecycle."""

    checkout_status: str
    payment_id: int
    payment_status: str
    invoice_id: int
    invoice_status: str
    subscription_id: int
    subscription_status: str
    plan_id: int
    amount: Decimal
    currency: str = "INR"
    confirmation_expires_at: datetime | None = None
    confirmation_url: str | None = None
    mock_mode: bool = True


class PaymentConfirmationRequest(BaseModel):
    token: str = Field(..., min_length=32)
    decision: str = Field(..., pattern="^(confirm|reject)$")


class PaymentConfirmationResponse(BaseModel):
    result: str
    payment_id: int
    payment_status: str
    invoice_id: int
    invoice_status: str
    subscription_id: int
    subscription_status: str
    plan_id: int
    plan_name: str
    amount: Decimal
    currency: str
    billing_cycle: str
    next_billing_date: datetime | None = None


# ==========================================================
# Update Payment
# ==========================================================


class PaymentUpdate(BaseModel):
    """
    Update payment request.
    """

    status: str | None = Field(
        default=None,
        description="Payment status.",
    )

    transaction_id: str | None = Field(
        default=None,
        description="Payment transaction ID.",
    )


# ==========================================================
# Refund Request
# ==========================================================


class PaymentRefundRequest(BaseModel):
    """
    Refund request payload.
    """

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        description=(
            "Amount to refund. Defaults to the full payment "
            "amount when omitted."
        ),
    )

    reason: str | None = Field(
        default=None,
        description="Reason for the refund.",
    )


# ==========================================================
# Payment Response
# ==========================================================


class PaymentResponse(PaymentBase):
    """
    Payment API response.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    transaction_id: str | None = None

    payment_date: datetime | None = None

    refunded_amount: Decimal | None = None

    refunded_at: datetime | None = None

    refund_reason: str | None = None

    created_at: datetime


# ==========================================================
# Payment List Response
# ==========================================================


class PaymentListResponse(BaseModel):
    """
    Paginated payment response.
    """

    total: int

    page: int

    page_size: int

    items: list[PaymentResponse]