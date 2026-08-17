"""
BillSphere User API

Provides authenticated user profile endpoints.

Endpoints:
- Get current authenticated user
- Get user by ID
- Update current user profile
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import (
    database_session,
    get_current_user_token,
)
from app.services.auth_service import get_user_by_id
from app.schemas.users import UserResponse


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# ==========================================================
# Get Current User
# ==========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_current_user(
    current_user: dict = Depends(
        get_current_user_token
    ),
    db: Session = Depends(database_session),
):
    """
    Return the currently authenticated user.

    The JWT contains the user ID in the `sub` field.
    That ID is used to retrieve the actual User record
    from PostgreSQL.
    """

    # ------------------------------------------------------
    # Get user ID from JWT
    # ------------------------------------------------------

    user_id = current_user.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Convert subject to integer
    # ------------------------------------------------------

    try:
        user_id = int(user_id)

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in authentication token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Fetch user
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
    # Check account status
    # ------------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user