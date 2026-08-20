"""
BillSphere Notification Model

Database table:

notifications
--------------
id
user_id
customer_id
title
message
notification_type
is_sent
sent_at
is_read
read_at
created_at

Used for:

- Email notifications
- Payment reminders
- Invoice alerts
- System notifications
- Dashboard notifications
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.core.database import Base


class Notification(Base):
    """
    Notification database model.

    A notification can optionally belong to a user and/or
    customer.

    Notifications have two independent lifecycle states:

    Delivery:
        pending -> sent

    Read:
        unread -> read
    """

    __tablename__ = "notifications"

    # ==========================================================
    # Primary Key
    # ==========================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # References
    # ==========================================================

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "customers.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # ==========================================================
    # Notification Content
    # ==========================================================

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    notification_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="system",
        server_default="system",
        index=True,
    )

    # ==========================================================
    # Delivery Status
    # ==========================================================

    is_sent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Read Status
    # ==========================================================

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Timestamp
    # ==========================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # ==========================================================
    # Relationships
    # ==========================================================

    user = relationship(
        "User",
        foreign_keys=[user_id],
    )

    customer = relationship(
        "Customer",
        foreign_keys=[customer_id],
    )

    # ==========================================================
    # Notification Lifecycle
    # ==========================================================

    def mark_sent(self) -> None:
        """
        Mark the notification as successfully delivered.
        """

        self.is_sent = True
        self.sent_at = datetime.now(timezone.utc)

    def mark_unread(self) -> None:
        """
        Mark the notification as unread.
        """

        self.is_read = False
        self.read_at = None

    def mark_read(self) -> None:
        """
        Mark the notification as read.
        """

        self.is_read = True
        self.read_at = datetime.now(timezone.utc)

    # ==========================================================
    # Status Helpers
    # ==========================================================

    def is_pending(self) -> bool:
        """
        Return True when the notification has not been sent.
        """

        return not self.is_sent

    def is_delivered(self) -> bool:
        """
        Return True when the notification has been sent.
        """

        return self.is_sent

    def is_unread(self) -> bool:
        """
        Return True when the notification has not been read.
        """

        return not self.is_read

    # ==========================================================
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<Notification "
            f"id={self.id} "
            f"type={self.notification_type} "
            f"is_sent={self.is_sent} "
            f"is_read={self.is_read}>"
        )