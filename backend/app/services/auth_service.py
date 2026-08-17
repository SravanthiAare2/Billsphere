"""
BillSphere Authentication Service

Business logic for:

- User registration
- User authentication
- JWT generation
- Refresh token validation
- Password reset workflow
"""

from datetime import (
    datetime,
    timedelta,
    timezone,
)

import secrets

from fastapi import (
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

from app.models.user import User

from app.schemas.auth import RegisterRequest

from app.core.logging import app_logger
from app.services import email_templates, notification_service
from app.services.email_service import send_email


# ==========================================================
# Get User By Email
# ==========================================================

def get_user_by_email(
    db: Session,
    email: str,
) -> User | None:

    statement = select(User).where(
        User.email == email
    )

    result = db.execute(statement)

    return result.scalar_one_or_none()


# ==========================================================
# Get User By ID
# ==========================================================

def get_user_by_id(
    db: Session,
    user_id: int,
) -> User | None:

    statement = select(User).where(
        User.id == user_id
    )

    result = db.execute(statement)

    return result.scalar_one_or_none()


# ==========================================================
# Register User
# ==========================================================

def register_user(
    db: Session,
    user_data: RegisterRequest,
) -> User:

    # ------------------------------------------------------
    # Check existing email
    # ------------------------------------------------------

    existing_user = get_user_by_email(
        db,
        str(user_data.email),
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # ------------------------------------------------------
    # Validate role
    # ------------------------------------------------------

    role = user_data.role.lower().strip()

    allowed_roles = {
        "customer",
        "admin",
    }

    if role not in allowed_roles:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid role. "
                "Allowed roles: customer, admin"
            ),
        )

    # ------------------------------------------------------
    # Create User
    # ------------------------------------------------------

    user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=str(user_data.email),
        phone=user_data.phone,
        hashed_password=hash_password(
            user_data.password
        ),
        role=role,
        is_active=True,
        is_verified=False,
    )

    db.add(user)

    db.commit()

    db.refresh(user)

    # ------------------------------------------------------
    # Post-registration notifications (never block registration
    # itself -- the user must remain created even if email
    # delivery fails).
    # ------------------------------------------------------

    try:
        _send_registration_notifications(db, user)
    except Exception as exc:
        app_logger.error(
            f"Post-registration notification step failed for "
            f"user_id={user.id}: {exc}"
        )

    return user


# ==========================================================
# Post-Registration Notifications
# ==========================================================

def _send_registration_notifications(
    db: Session,
    user: User,
) -> None:
    """
    Create a welcome notification + email for the new user,
    and notify all active admins that a new customer registered.

    Fully isolated from the registration transaction: any
    failure here is logged and swallowed, never re-raised.
    """

    # --------------------------------------------------
    # Welcome notification + email (customer-facing)
    # --------------------------------------------------

    welcome_notification = notification_service.create_notification(
        db=db,
        user_id=user.id,
        title="Welcome to BillSphere",
        message=f"Welcome, {user.first_name}! Your account is ready.",
        notification_type="welcome",
    )

    try:
        subject, html = email_templates.welcome_customer_email(
            first_name=user.first_name
        )
        delivered = send_email(user.email, subject, html)
    except Exception as exc:
        app_logger.error(
            f"Welcome email failed for user_id={user.id}: {exc}"
        )
        delivered = False

    if delivered:
        notification_service.mark_notification_as_sent(
            db, welcome_notification
        )

    # --------------------------------------------------
    # Admin notification: new customer registered
    # (only for customer-role registrations, not admin
    # accounts registering themselves)
    # --------------------------------------------------

    if user.role == "customer":
        registered_at = user.created_at.strftime("%Y-%m-%d %H:%M UTC") if (
            getattr(user, "created_at", None)
        ) else datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        admins = notification_service.get_active_admin_users(db)

        for admin in admins:
            admin_notification = notification_service.create_notification(
                db=db,
                user_id=admin.id,
                title="New customer registered",
                message=(
                    f"{user.first_name} {user.last_name} "
                    f"({user.email}) registered on {registered_at}."
                ),
                notification_type="admin_new_customer",
            )

            try:
                subject, html = email_templates.admin_new_customer_email(
                    customer_name=f"{user.first_name} {user.last_name}",
                    customer_email=user.email,
                    registered_at=registered_at,
                )
                admin_delivered = send_email(admin.email, subject, html)
            except Exception as exc:
                app_logger.error(
                    f"Admin new-customer email failed for "
                    f"admin_id={admin.id}: {exc}"
                )
                admin_delivered = False

            if admin_delivered:
                notification_service.mark_notification_as_sent(
                    db, admin_notification
                )


# ==========================================================
# Authenticate User
# ==========================================================

def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User:

    user = get_user_by_email(
        db,
        email,
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Verify password
    # ------------------------------------------------------

    password_valid = verify_password(
        password,
        user.hashed_password,
    )

    if not password_valid:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Check active status
    # ------------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account inactive",
        )

    return user


# ==========================================================
# Create Token Pair
# ==========================================================

def create_token_pair(
    user: User,
) -> dict:

    return {
        "access_token": create_access_token(
            user.id
        ),

        "refresh_token": create_refresh_token(
            user.id
        ),

        "token_type": "bearer",

        "role": user.role,
    }


# ==========================================================
# Refresh Token
# ==========================================================

def refresh_access_token(
    db: Session,
    refresh_token: str,
) -> dict:

    # ------------------------------------------------------
    # Decode refresh token
    # ------------------------------------------------------

    payload = decode_token(
        refresh_token
    )

    if not payload:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Check token type
    # ------------------------------------------------------

    if payload.get("type") != "refresh":

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Get user ID
    # ------------------------------------------------------

    user_id = payload.get("sub")

    if not user_id:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    try:

        user_id = int(user_id)

    except (TypeError, ValueError):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID",
        )

    # ------------------------------------------------------
    # Find user
    # ------------------------------------------------------

    user = get_user_by_id(
        db,
        user_id,
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # ------------------------------------------------------
    # Check account
    # ------------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account inactive",
        )

    # ------------------------------------------------------
    # Create new access token
    # ------------------------------------------------------

    return {
        "access_token": create_access_token(
            user.id
        ),

        "refresh_token": create_refresh_token(
            user.id
        ),

        "token_type": "bearer",

        "role": user.role,
    }


# ==========================================================
# Generate Password Reset Token
# ==========================================================

def generate_password_reset_token(
    db: Session,
    email: str,
) -> str:

    user = get_user_by_email(
        db,
        email,
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    token = secrets.token_urlsafe(
        32
    )

    user.reset_token = token

    user.reset_token_expiry = (
        datetime.now(timezone.utc)
        + timedelta(minutes=30)
    )

    db.commit()

    return token


# ==========================================================
# Reset Password
# ==========================================================

def reset_password(
    db: Session,
    token: str,
    new_password: str,
):

    statement = select(User).where(
        User.reset_token == token
    )

    result = db.execute(statement)

    user = result.scalar_one_or_none()

    if not user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    if (
        not user.reset_token_expiry
        or user.reset_token_expiry
        < datetime.now(timezone.utc)
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token expired",
        )

    user.hashed_password = hash_password(
        new_password
    )

    user.reset_token = None

    user.reset_token_expiry = None

    db.commit()

    return True


# ==========================================================
# Send Role-Based Login Email
# ==========================================================

def send_login_email(user: User) -> None:
    """
    Send a role-based "you've logged in" email.

    Called AFTER authentication + token generation succeed.
    Never raises -- a failure here must never affect the
    login response.
    """

    try:
        if user.role == "admin":
            subject, html = email_templates.login_admin_email(
                first_name=user.first_name
            )
        else:
            subject, html = email_templates.login_customer_email(
                first_name=user.first_name
            )

        send_email(user.email, subject, html)

    except Exception as exc:
        app_logger.error(
            f"Login email failed for user_id={user.id}: {exc}"
        )