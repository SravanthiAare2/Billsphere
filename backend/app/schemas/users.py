"""
BillSphere User Schemas

Handles:

- User registration
- User response
- User profile updates
- Password changes
- Internal user representation
- User list responses
"""

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


# ==========================================================
# Base User Schema
# ==========================================================

class UserBase(BaseModel):
    """
    Common public user fields.
    """

    first_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    last_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    phone: str | None = Field(
        default=None,
        max_length=20,
    )

    role: str = Field(
        default="customer",
        max_length=50,
    )


# ==========================================================
# Create User
# ==========================================================

class UserCreate(UserBase):
    """
    User creation schema.

    Used internally by the authentication/service layer.
    """

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )


# ==========================================================
# Update User
# ==========================================================

class UserUpdate(BaseModel):
    """
    User profile update schema.
    """

    first_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    last_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    email: EmailStr | None = None

    phone: str | None = Field(
        default=None,
        max_length=20,
    )

    role: str | None = Field(
        default=None,
        max_length=50,
    )


# ==========================================================
# Change Password
# ==========================================================

class PasswordChange(BaseModel):
    """
    Change user password.
    """

    current_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )


# ==========================================================
# User Response
# ==========================================================

class UserResponse(UserBase):
    """
    Public API response schema.

    Sensitive authentication fields such as:

    - hashed_password
    - reset_token
    - reset_token_expiry

    are intentionally excluded.
    """

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    is_active: bool

    is_verified: bool

    created_at: datetime


# ==========================================================
# Internal User Schema
# ==========================================================

class UserInternal(UserResponse):
    """
    Internal user schema used by backend services.

    Includes the hashed password but still excludes
    password-reset secrets from API responses.
    """

    hashed_password: str

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# User List Response
# ==========================================================

class UserListResponse(BaseModel):
    """
    Paginated users response.
    """

    total: int

    page: int

    page_size: int

    items: list[UserResponse]