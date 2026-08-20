"""
BillSphere Application Dependencies

Central dependency layer for FastAPI.

Provides:

- Database session dependency
- HTTP Bearer authentication configuration
- JWT authentication dependency
- Optional authentication
- Role-based authorization
"""

from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token


# ==========================================================
# Database Dependency
# ==========================================================

def database_session() -> Generator[Session, None, None]:
    """
    Provides a SQLAlchemy database session.

    Used inside FastAPI endpoints:

        db: Session = Depends(database_session)
    """

    yield from get_db()


# ==========================================================
# HTTP Bearer Authentication
# ==========================================================

bearer_scheme = HTTPBearer(
    auto_error=True
)


# ==========================================================
# Optional HTTP Bearer Authentication
# ==========================================================

optional_bearer_scheme = HTTPBearer(
    auto_error=False
)


# ==========================================================
# JWT Authentication Dependency
# ==========================================================

def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
) -> dict:
    """
    Validate JWT access token.

    Returns:
        Decoded JWT payload.

    Raises:
        HTTPException:
            If the token is invalid, expired,
            or not an access token.
    """

    # ------------------------------------------------------
    # Extract token
    # ------------------------------------------------------

    token = credentials.credentials

    # ------------------------------------------------------
    # Decode JWT
    # ------------------------------------------------------

    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Ensure this is an access token
    # ------------------------------------------------------

    token_type = payload.get("type")

    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Validate subject
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

    return payload


# ==========================================================
# Optional Authentication
# ==========================================================

def get_optional_user_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        optional_bearer_scheme
    ),
) -> dict | None:
    """
    Optional authentication.

    Allows both:

    - Authenticated users
    - Guest users

    Invalid or missing tokens simply result in None.
    """

    # ------------------------------------------------------
    # No Authorization header
    # ------------------------------------------------------

    if not credentials:
        return None

    # ------------------------------------------------------
    # Extract token
    # ------------------------------------------------------

    token = credentials.credentials

    # ------------------------------------------------------
    # Decode token
    # ------------------------------------------------------

    payload = decode_token(token)

    if not payload:
        return None

    # ------------------------------------------------------
    # Ensure access token
    # ------------------------------------------------------

    if payload.get("type") != "access":
        return None

    # ------------------------------------------------------
    # Validate subject
    # ------------------------------------------------------

    if not payload.get("sub"):
        return None

    return payload


# ==========================================================
# Role Authorization
# ==========================================================

def require_role(
    allowed_roles: list[str],
):
    """
    Role-based authorization helper.

    Example:

        @router.get(
            "/admin",
            dependencies=[
                Depends(
                    require_role(["admin"])
                )
            ]
        )

    Or:

        current_user = Depends(
            require_role(["admin"])
        )
    """

    def role_checker(
        current_user: dict = Depends(
            get_current_user_token
        ),
    ) -> dict:

        user_role = current_user.get("role")

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user

    return role_checker