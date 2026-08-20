"""
BillSphere Customer Schemas

Pydantic schemas for:
- Customer creation
- Customer updates
- Customer responses
- Customer listing
"""

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


# ==========================================================
# Base Customer Schema
# ==========================================================

class CustomerBase(BaseModel):
    """
    Shared customer fields.
    """

    company_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
    )

    contact_name: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    email: EmailStr

    phone: str | None = Field(
        default=None,
        max_length=20,
    )

    address: str | None = None

    city: str | None = Field(
        default=None,
        max_length=100,
    )

    state: str | None = Field(
        default=None,
        max_length=100,
    )

    country: str | None = Field(
        default=None,
        max_length=100,
    )

    postal_code: str | None = Field(
        default=None,
        max_length=20,
    )

    tax_id: str | None = Field(
        default=None,
        max_length=100,
    )


# ==========================================================
# Create Customer Schema
# ==========================================================

class CustomerCreate(CustomerBase):
    """
    Create new customer request.
    """

    pass


# ==========================================================
# Update Customer Schema
# ==========================================================

class CustomerUpdate(BaseModel):
    """
    Update customer request.

    All fields optional.
    """

    company_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=200,
    )

    contact_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    email: EmailStr | None = None

    phone: str | None = Field(
        default=None,
        max_length=20,
    )

    address: str | None = None

    city: str | None = None

    state: str | None = None

    country: str | None = None

    postal_code: str | None = None

    tax_id: str | None = None


# ==========================================================
# Customer Response Schema
# ==========================================================

class CustomerResponse(CustomerBase):
    """
    Customer response returned by API.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )


    id: int

    owner_id: int

    is_active: bool

    created_at: datetime

    updated_at: datetime


# ==========================================================
# Customer List Response
# ==========================================================

class CustomerListResponse(BaseModel):
    """
    Paginated customer response.
    """

    total: int

    page: int

    page_size: int

    customers: list[CustomerResponse]