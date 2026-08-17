
"""
BillSphere Notification API

Existing notification endpoints:
    POST /notifications/invoice
    POST /notifications/payment-success
    POST /notifications/payment-failed
    POST /notifications/overdue
    POST /notifications/subscription-expiry

Notification management endpoints:
    POST   /notifications
    GET    /notifications
    GET    /notifications/unread-count
    PATCH  /notifications/{notification_id}/read
    PATCH  /notifications/read-all
    DELETE /notifications/{notification_id}

All notification records are stored in PostgreSQL.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationActionResponse,
    NotificationCreate,
    NotificationListResponse,
    NotificationReadRequest,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.services.notification_service import (
    notify_invoice_created,
    notify_invoice_overdue,
    notify_payment_failed,
    notify_payment_success,
    notify_subscription_expiry,
)


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# ==========================================================
# Request Schemas
# ==========================================================

class InvoiceNotificationRequest(BaseModel):
    customer_email: EmailStr
    invoice_id: int
    user_id: int | None = None
    customer_id: int | None = None


class PaymentNotificationRequest(BaseModel):
    payment_id: int
    user_id: int | None = None
    customer_id: int | None = None


class PaymentFailedNotificationRequest(BaseModel):
    payment_id: int
    user_id: int | None = None
    customer_id: int | None = None


class OverdueNotificationRequest(BaseModel):
    customer_email: EmailStr
    invoice_id: int
    user_id: int | None = None
    customer_id: int | None = None


class SubscriptionExpiryRequest(BaseModel):
    subscription_name: str
    expiry_date: str
    user_id: int | None = None
    customer_id: int | None = None


# ==========================================================
# Helper
# ==========================================================

def notification_to_response(
    notification: Notification,
) -> NotificationResponse:
    """
    Convert SQLAlchemy notification model into API response.
    """

    return NotificationResponse.model_validate(notification)


# ==========================================================
# Create Generic Notification
# ==========================================================

@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
):
    """
    Create a generic system notification.
    """

    notification = Notification(
        user_id=data.user_id,
        customer_id=data.customer_id,
        title=data.title,
        message=data.message,
        notification_type=data.notification_type,
        is_sent=False,
        sent_at=None,
        is_read=False,
        read_at=None,
        created_at=datetime.now(timezone.utc),
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification_to_response(notification)


# ==========================================================
# List Notifications
# ==========================================================

@router.get(
    "",
    response_model=NotificationListResponse,
)
def list_notifications(
    user_id: int | None = Query(
        default=None,
        description="Filter notifications by user ID",
    ),
    customer_id: int | None = Query(
        default=None,
        description="Filter notifications by customer ID",
    ),
    unread_only: bool = Query(
        default=False,
        description="Return only unread notifications",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
):
    """
    List notifications with pagination and filtering.
    """

    query = db.query(Notification)

    if user_id is not None:
        query = query.filter(
            Notification.user_id == user_id
        )

    if customer_id is not None:
        query = query.filter(
            Notification.customer_id == customer_id
        )

    if unread_only:
        query = query.filter(
            Notification.is_read.is_(False)
        )

    total = query.count()

    unread_query = db.query(Notification).filter(
        Notification.is_read.is_(False)
    )

    if user_id is not None:
        unread_query = unread_query.filter(
            Notification.user_id == user_id
        )

    if customer_id is not None:
        unread_query = unread_query.filter(
            Notification.customer_id == customer_id
        )

    unread_count = unread_query.count()

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return NotificationListResponse(
        total=total,
        page=page,
        page_size=page_size,
        unread_count=unread_count,
        items=[
            notification_to_response(notification)
            for notification in notifications
        ],
    )


# ==========================================================
# Unread Notification Count
# ==========================================================

@router.get(
    "/unread-count",
    response_model=NotificationUnreadCountResponse,
)
def unread_notification_count(
    user_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Return the number of unread notifications.
    """

    query = db.query(Notification).filter(
        Notification.is_read.is_(False)
    )

    if user_id is not None:
        query = query.filter(
            Notification.user_id == user_id
        )

    if customer_id is not None:
        query = query.filter(
            Notification.customer_id == customer_id
        )

    return {
        "unread_count": query.count()
    }


# ==========================================================
# Mark Notification As Read / Unread
# ==========================================================

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationActionResponse,
)
def mark_notification_read(
    notification_id: int,
    data: NotificationReadRequest,
    db: Session = Depends(get_db),
):
    """
    Mark one notification as read or unread.
    """

    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = data.is_read

    if data.is_read:
        notification.read_at = datetime.now(timezone.utc)
    else:
        notification.read_at = None

    db.commit()
    db.refresh(notification)

    return {
        "success": True,
        "message": (
            "Notification marked as read"
            if data.is_read
            else "Notification marked as unread"
        ),
        "notification": notification_to_response(
            notification
        ),
    }


# ==========================================================
# Mark All Notifications As Read
# ==========================================================

@router.patch(
    "/read-all",
)
def mark_all_notifications_read(
    user_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Mark all matching unread notifications as read.
    """

    query = db.query(Notification).filter(
        Notification.is_read.is_(False)
    )

    if user_id is not None:
        query = query.filter(
            Notification.user_id == user_id
        )

    if customer_id is not None:
        query = query.filter(
            Notification.customer_id == customer_id
        )

    notifications = query.all()

    now = datetime.now(timezone.utc)

    for notification in notifications:
        notification.is_read = True
        notification.read_at = now

    db.commit()

    return {
        "success": True,
        "message": "All notifications marked as read",
        "updated_count": len(notifications),
    }


# ==========================================================
# Delete Notification
# ==========================================================

@router.delete(
    "/{notification_id}",
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a notification.
    """

    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return {
        "success": True,
        "message": "Notification deleted successfully",
        "notification_id": notification_id,
    }


# ==========================================================
# Invoice Notification
# ==========================================================

@router.post(
    "/invoice",
    status_code=status.HTTP_201_CREATED,
)
def send_invoice_notification(
    data: InvoiceNotificationRequest,
    db: Session = Depends(get_db),
):
    """
    Create an invoice-generated notification.
    """

    notification = notify_invoice_created(
        db=db,
        customer_email=str(data.customer_email),
        invoice_id=data.invoice_id,
        user_id=data.user_id,
        customer_id=data.customer_id,
    )

    return {
        "success": True,
        "message": "Invoice notification created successfully",
        "notification": notification_to_response(
            notification
        ),
    }


# ==========================================================
# Payment Success Notification
# ==========================================================

@router.post(
    "/payment-success",
    status_code=status.HTTP_201_CREATED,
)
def send_payment_notification(
    data: PaymentNotificationRequest,
    db: Session = Depends(get_db),
):
    """
    Create a successful-payment notification.
    """

    notification = notify_payment_success(
        db=db,
        payment_id=data.payment_id,
        user_id=data.user_id,
        customer_id=data.customer_id,
    )

    return {
        "success": True,
        "message": "Payment notification created successfully",
        "notification": notification_to_response(
            notification
        ),
    }


# ==========================================================
# Payment Failed Notification
# ==========================================================

@router.post(
    "/payment-failed",
    status_code=status.HTTP_201_CREATED,
)
def send_payment_failed_notification(
    data: PaymentFailedNotificationRequest,
    db: Session = Depends(get_db),
):
    """
    Create a failed-payment notification.
    """

    notification = notify_payment_failed(
        db=db,
        payment_id=data.payment_id,
        user_id=data.user_id,
        customer_id=data.customer_id,
    )

    return {
        "success": True,
        "message": "Payment failure notification created successfully",
        "notification": notification_to_response(
            notification
        ),
    }


# ==========================================================
# Invoice Overdue Notification
# ==========================================================

@router.post(
    "/overdue",
    status_code=status.HTTP_201_CREATED,
)
def send_overdue_notification(
    data: OverdueNotificationRequest,
    db: Session = Depends(get_db),
):
    """
    Create an overdue-invoice notification.
    """

    notification = notify_invoice_overdue(
        db=db,
        customer_email=str(data.customer_email),
        invoice_id=data.invoice_id,
        user_id=data.user_id,
        customer_id=data.customer_id,
    )

    return {
        "success": True,
        "message": "Overdue notification created successfully",
        "notification": notification_to_response(
            notification
        ),
    }


# ==========================================================
# Subscription Expiry Notification
# ==========================================================

@router.post(
    "/subscription-expiry",
    status_code=status.HTTP_201_CREATED,
)
def send_expiry_notification(
    data: SubscriptionExpiryRequest,
    db: Session = Depends(get_db),
):
    """
    Create a subscription-expiry notification.
    """

    notification = notify_subscription_expiry(
        db=db,
        subscription_name=data.subscription_name,
        expiry_date=data.expiry_date,
        user_id=data.user_id,
        customer_id=data.customer_id,
    )

    return {
        "success": True,
        "message": "Subscription expiry notification created successfully",
        "notification": notification_to_response(
            notification
        ),
    }
