"""
BillSphere Invoice Schemas

Handles:
- Invoice creation
- Invoice update
- Invoice response
- Invoice list response
- Invoice line item response
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# Line Item Schema
# ==========================================================


class InvoiceLineItemResponse(BaseModel):
    """
    Response schema for a single invoice line item.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    invoice_id: int

    description: str

    item_type: str

    amount: Decimal

    created_at: datetime


# ==========================================================
# Base Invoice Schema
# ==========================================================


class InvoiceBase(BaseModel):
    """
    Common invoice fields.
    """

    customer_id: int = Field(
        ...,
        description="Customer ID.",
    )

    subscription_id: int | None = Field(
        default=None,
        description="Related subscription ID.",
    )

    amount: Decimal = Field(
        ...,
        gt=0,
        description="Invoice amount before tax.",
    )

    tax_amount: Decimal = Field(
        default=Decimal("0.00"),
        ge=0,
        description="Tax amount.",
    )

    total_amount: Decimal = Field(
        ...,
        gt=0,
        description="Final invoice amount including tax.",
    )

    status: str = Field(
        default="pending",
        description="Invoice status.",
    )


# ==========================================================
# Create Invoice
# ==========================================================


class InvoiceCreate(InvoiceBase):
    """
    Request schema for creating an invoice.
    """

    pass


# ==========================================================
# Update Invoice
# ==========================================================


class InvoiceUpdate(BaseModel):
    """
    Request schema for updating an invoice.
    """

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        description="Invoice amount before tax.",
    )

    tax_amount: Decimal | None = Field(
        default=None,
        ge=0,
        description="Tax amount.",
    )

    total_amount: Decimal | None = Field(
        default=None,
        gt=0,
        description="Final invoice amount.",
    )

    status: str | None = Field(
        default=None,
        description="Invoice status.",
    )


# ==========================================================
# Invoice Response
# ==========================================================


class InvoiceResponse(InvoiceBase):
    """
    Complete invoice API response.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    invoice_number: str

    created_at: datetime

    due_date: datetime | None = None

    paid_at: datetime | None = None

    line_items: list[InvoiceLineItemResponse] = Field(
        default_factory=list,
    )


# ==========================================================
# Invoice List Response
# ==========================================================


class InvoiceListResponse(BaseModel):
    """
    Paginated invoice response.
    """

    total: int

    page: int

    page_size: int

    items: list[InvoiceResponse] = Field(
        default_factory=list,
    )