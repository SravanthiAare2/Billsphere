
"""
BillSphere Authentication API

Endpoints:

- Register
- Login
- Current authenticated user
- Refresh Token
- Forgot Password
- Reset Password
"""

from fastapi import (
    APIRouter,
    Depends,
    status,
)

from sqlalchemy.orm import Session

from app.dependencies import (
    database_session,
    get_current_user_token,
)

from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    PasswordResetResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)

from app.schemas.users import UserResponse

from app.services.auth_service import (
    authenticate_user,
    create_token_pair,
    generate_password_reset_token,
    get_user_by_id,
    refresh_access_token,
    register_user,
    reset_password,
    send_login_email,
)


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    tags=["Authentication"],
)


# ==========================================================
# Register
# ==========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: RegisterRequest,
    db: Session = Depends(database_session),
):
    """
    Create a new user account.
    """

    return register_user(
        db,
        user_data,
    )


# ==========================================================
# Login
# ==========================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(database_session),
):
    """
    Authenticate user and return JWT tokens
    together with the user's role.
    """

    user = authenticate_user(
        db,
        str(login_data.email),
        login_data.password,
    )

    token_pair = create_token_pair(
        user,
    )

    # Email failure must never break login -- send_login_email
    # already swallows its own exceptions internally.
    send_login_email(user)

    return token_pair


# ==========================================================
# Current User
# ==========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user(
    current_user_token: dict = Depends(
        get_current_user_token
    ),
    db: Session = Depends(database_session),
):
    """
    Return the currently authenticated user.

    The JWT contains the user ID in the `sub`
    claim. This endpoint uses that ID to retrieve
    the complete user record from PostgreSQL.
    """

    user_id = current_user_token.get("sub")

    if not user_id:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    try:
        user_id = int(user_id)

    except (TypeError, ValueError):

        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:

        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:

        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account inactive",
        )

    return user


# ==========================================================
# Refresh Token
# ==========================================================

@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(database_session),
):
    """
    Generate a new access token using
    a valid refresh token.
    """

    return refresh_access_token(
        db,
        request.refresh_token,
    )


# ==========================================================
# Forgot Password
# ==========================================================

@router.post(
    "/forgot-password",
    response_model=PasswordResetResponse,
)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(database_session),
):
    """
    Generate a password reset token.
    """

    generate_password_reset_token(
        db,
        str(request.email),
    )

    return {
        "message": "Password reset token generated"
    }


# ==========================================================
# Reset Password
# ==========================================================

@router.post(
    "/reset-password",
    response_model=PasswordResetResponse,
)
def reset_user_password(
    request: ResetPasswordRequest,
    db: Session = Depends(database_session),
):
    """
    Reset the user's password using
    a valid reset token.
    """

    reset_password(
        db,
        request.token,
        request.new_password,
    )

    return {
        "message": "Password reset successful"
    }
