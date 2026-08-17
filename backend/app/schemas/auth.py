"""
BillSphere Authentication Schemas

Pydantic schemas for:

- User registration
- User login
- JWT tokens
- Password reset
"""

from pydantic import BaseModel, EmailStr, Field


# ==========================================================
# Registration Schema
# ==========================================================

class RegisterRequest(BaseModel):
    """
    User registration request.
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

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    role: str = Field(
        default="customer",
        max_length=50,
    )


# ==========================================================
# Login Schema
# ==========================================================

class LoginRequest(BaseModel):
    """
    User login request.
    """

    email: EmailStr

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )


# ==========================================================
# Token Response Schema
# ==========================================================

class TokenResponse(BaseModel):
    """
    JWT token response.
    """

    access_token: str

    refresh_token: str

    token_type: str = "bearer"

    role: str


# ==========================================================
# Refresh Token Schema
# ==========================================================

class RefreshTokenRequest(BaseModel):
    """
    Refresh access token request.
    """

    refresh_token: str


# ==========================================================
# Forgot Password Schema
# ==========================================================

class ForgotPasswordRequest(BaseModel):
    """
    Forgot password request.
    """

    email: EmailStr


# ==========================================================
# Reset Password Schema
# ==========================================================

class ResetPasswordRequest(BaseModel):
    """
    Reset password request.
    """

    token: str

    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )


# ==========================================================
# Password Reset Response
# ==========================================================

class PasswordResetResponse(BaseModel):
    """
    Password reset operation response.
    """

    message: str