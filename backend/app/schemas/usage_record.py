"""
BillSphere Usage Record Schemas

Pydantic schemas used for:
- Creating usage records
- Returning usage records
- Listing usage records
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# Create Usage Record
# ==========================================================

class UsageRecordCreate(BaseModel):
    """
    Request schema for recording metered usage.
    """

    subscription_id: int = Field(
        ...,
        gt=0,
        description="ID of the subscription receiving the usage charge.",
    )

    description: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Description of the usage.",
    )

    quantity: Decimal = Field(
        ...,
        gt=0,
        description="Quantity of usage consumed.",
    )

    unit_price: Decimal = Field(
        ...,
        ge=0,
        description="Price per unit of usage.",
    )


# ==========================================================
# Usage Record Response
# ==========================================================

class UsageRecordResponse(BaseModel):
    """
    Response schema for a single usage record.
    """

    id: int

    subscription_id: int

    description: str

    quantity: Decimal

    unit_price: Decimal

    amount: Decimal

    invoiced: bool

    invoice_id: int | None = None

    recorded_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# Usage Record List Response
# ==========================================================

class UsageRecordListResponse(BaseModel):
    """
    Response schema for a list of usage records.
    """

    total: int

    items: list[UsageRecordResponse]