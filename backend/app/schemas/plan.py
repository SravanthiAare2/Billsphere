"""
BillSphere Plan Schemas

Pydantic schemas used for:
- Creating plans
- Updating plans
- Returning plan data
- Listing plans
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# Plan Create
# ==========================================================

class PlanCreate(BaseModel):
    """
    Schema for creating a subscription plan.
    """

    # ------------------------------------------------------
    # Platform
    # ------------------------------------------------------

    platform: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Platform/service for which the plan is created.",
        examples=["Amazon"],
    )

    # ------------------------------------------------------
    # Plan Information
    # ------------------------------------------------------

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the subscription plan.",
        examples=["Basic"],
    )

    description: str | None = Field(
        default=None,
        description="Description of the subscription plan.",
    )

    # ------------------------------------------------------
    # Pricing
    # ------------------------------------------------------

    price: float = Field(
        ...,
        ge=0,
        description="Plan price.",
        examples=[199],
    )

    currency: str = Field(
        default="INR",
        min_length=1,
        max_length=10,
        description="Currency used for the plan price.",
        examples=["INR"],
    )

    # ------------------------------------------------------
    # Billing
    # ------------------------------------------------------

    billing_cycle: str = Field(
        default="monthly",
        min_length=1,
        max_length=50,
        description="Billing frequency.",
        examples=["monthly"],
    )

    trial_days: int = Field(
        default=0,
        ge=0,
        le=365,
        description="Number of free trial days.",
        examples=[7],
    )

    # ------------------------------------------------------
    # Features
    # ------------------------------------------------------

    feature_entitlements: dict[str, Any] | None = Field(
        default=None,
        description="Features and entitlements included in the plan.",
        examples=[
            {
                "subscription_management": True,
                "invoice_generation": True,
                "email_notifications": True,
            }
        ],
    )

    # ------------------------------------------------------
    # Usage Limits
    # ------------------------------------------------------

    max_customers: int | None = Field(
        default=None,
        ge=0,
        description="Maximum number of customers allowed.",
        examples=[50],
    )

    max_invoices: int | None = Field(
        default=None,
        ge=0,
        description="Maximum number of invoices allowed.",
        examples=[100],
    )


# ==========================================================
# Plan Update
# ==========================================================

class PlanUpdate(BaseModel):
    """
    Schema for updating a subscription plan.
    All fields are optional.
    """

    # ------------------------------------------------------
    # Platform
    # ------------------------------------------------------

    platform: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Platform/service for the plan.",
        examples=["Amazon"],
    )

    # ------------------------------------------------------
    # Plan Information
    # ------------------------------------------------------

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Name of the subscription plan.",
    )

    description: str | None = Field(
        default=None,
        description="Description of the subscription plan.",
    )

    # ------------------------------------------------------
    # Pricing
    # ------------------------------------------------------

    price: float | None = Field(
        default=None,
        ge=0,
        description="Plan price.",
    )

    currency: str | None = Field(
        default=None,
        min_length=1,
        max_length=10,
        description="Currency used for the plan.",
    )

    # ------------------------------------------------------
    # Billing
    # ------------------------------------------------------

    billing_cycle: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="Billing frequency.",
    )

    trial_days: int | None = Field(
        default=None,
        ge=0,
        le=365,
        description="Number of free trial days.",
    )

    # ------------------------------------------------------
    # Features
    # ------------------------------------------------------

    feature_entitlements: dict[str, Any] | None = Field(
        default=None,
        description="Features and entitlements included in the plan.",
    )

    # ------------------------------------------------------
    # Usage Limits
    # ------------------------------------------------------

    max_customers: int | None = Field(
        default=None,
        ge=0,
        description="Maximum number of customers allowed.",
    )

    max_invoices: int | None = Field(
        default=None,
        ge=0,
        description="Maximum number of invoices allowed.",
    )

    # ------------------------------------------------------
    # Status
    # ------------------------------------------------------

    is_active: bool | None = Field(
        default=None,
        description="Whether the plan is active.",
    )


# ==========================================================
# Plan Response
# ==========================================================

class PlanResponse(BaseModel):
    """
    Schema returned by the API.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    # ------------------------------------------------------
    # Platform
    # ------------------------------------------------------

    platform: str

    # ------------------------------------------------------
    # Plan Information
    # ------------------------------------------------------

    name: str

    description: str | None

    # ------------------------------------------------------
    # Pricing
    # ------------------------------------------------------

    price: float

    currency: str

    # ------------------------------------------------------
    # Billing
    # ------------------------------------------------------

    billing_cycle: str

    trial_days: int = 0

    # ------------------------------------------------------
    # Features
    # ------------------------------------------------------

    feature_entitlements: dict[str, Any] | None = None

    # ------------------------------------------------------
    # Usage Limits
    # ------------------------------------------------------

    max_customers: int | None = None

    max_invoices: int | None = None

    # ------------------------------------------------------
    # Status
    # ------------------------------------------------------

    is_active: bool

    # ------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------

    created_at: datetime

    updated_at: datetime


# ==========================================================
# Plan List Response
# ==========================================================

class PlanListResponse(BaseModel):
    """
    Paginated plan response.
    """

    total: int

    page: int

    page_size: int

    plans: list[PlanResponse]