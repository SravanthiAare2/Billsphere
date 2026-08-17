
"""
BillSphere Notification Schemas

Handles:

- Creating notification records
- Updating notification delivery/read status
- Notification responses
- Notification lists
- Unread notification counts
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# Base Notification
# ==========================================================

class NotificationBase(BaseModel):
    """
    Common notification fields.
    """

    user_id: int | None = None

    customer_id: int | None = None

    title: str = Field(
        ...,
        min_length=3,
        max_length=200,
    )

    message: str = Field(
        ...,
        min_length=1,
    )

    notification_type: str = Field(
        default="system",
        min_length=1,
        max_length=50,
    )


# ==========================================================
# Create Notification
# ==========================================================

class NotificationCreate(NotificationBase):
    """
    Schema used when creating a notification.
    """

    pass


# ==========================================================
# Update Notification
# ==========================================================

class NotificationUpdate(BaseModel):
    """
    Schema used to update notification status.
    """

    is_sent: bool | None = None

    sent_at: datetime | None = None

    is_read: bool | None = None

    read_at: datetime | None = None


# ==========================================================
# Mark As Read
# ==========================================================

class NotificationReadRequest(BaseModel):
    """
    Request schema for marking a notification as read/unread.
    """

    is_read: bool = True


# ==========================================================
# Notification Response
# ==========================================================

class NotificationResponse(NotificationBase):
    """
    Complete notification response returned by the API.
    """

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    is_sent: bool

    sent_at: datetime | None = None

    is_read: bool

    read_at: datetime | None = None

    created_at: datetime


# ==========================================================
# Notification List Response
# ==========================================================

class NotificationListResponse(BaseModel):
    """
    Paginated notification list response.
    """

    total: int

    page: int

    page_size: int

    unread_count: int

    items: list[NotificationResponse]


# ==========================================================
# Unread Count Response
# ==========================================================

class NotificationUnreadCountResponse(BaseModel):
    """
    Response containing the number of unread notifications.
    """

    unread_count: int


# ==========================================================
# Generic Notification Action Response
# ==========================================================

class NotificationActionResponse(BaseModel):
    """
    Standard response for notification actions.
    """

    success: bool

    message: str

    notification: NotificationResponse | None = None