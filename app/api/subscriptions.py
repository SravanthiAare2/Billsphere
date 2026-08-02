import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import UserRole
from app.repositories.user import get_user
from app.schemas.auth import UserRead
from app.schemas.subscription import SubscriptionItem, SubscriptionsUpdatePayload
from app.services.auth import get_current_active_user

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/{user_id}", response_model=list[SubscriptionItem])
def get_user_subscriptions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Retrieve subscriptions for a user. Standard customers can only view their own."""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view subscriptions for this user",
        )

    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    try:
        if not user.subscriptions:
            return []
        items = json.loads(user.subscriptions)
        if not isinstance(items, list):
            return []
        return items
    except Exception:
        return []


@router.put("/{user_id}", response_model=UserRead)
def update_user_subscriptions(
    user_id: int,
    payload: SubscriptionsUpdatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Update subscriptions for a user. Standard customers can only update their own, admins can update any."""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update subscriptions for this user",
        )

    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Validate the subscriptions string is valid JSON representing a list of subscription items
    try:
        items = json.loads(payload.subscriptions)
        if not isinstance(items, list):
            raise ValueError()
        for item in items:
            SubscriptionItem(**item)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subscriptions JSON format",
        ) from exc

    user.subscriptions = payload.subscriptions
    db.commit()
    db.refresh(user)
    return user
