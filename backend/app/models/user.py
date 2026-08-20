"""
BillSphere User Model

Database table:
users

Fields:
- id
- first_name
- last_name
- email
- phone
- hashed_password
- role
- is_active
- is_verified
- reset_token
- reset_token_expiry
- created_at
- updated_at

Used by:
- Authentication
- JWT authorization
- Customer management
- Admin management
- Password reset
- Subscription ownership
- Audit logging
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
    synonym,
)

from app.core.database import Base


if TYPE_CHECKING:
    from app.models.audit_log import AuditLog
    from app.models.subscription_history import SubscriptionHistory


class User(Base):
    """
    User database model.

    Represents an authenticated BillSphere user.

    Roles:
    - customer
    - admin

    Authentication credentials are stored using a hashed
    password only. Plain-text passwords must never be stored.
    """

    __tablename__ = "users"

    # ==========================================================
    # Primary Key
    # ==========================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # Personal Information
    # ==========================================================

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # ==========================================================
    # Contact Information
    # ==========================================================

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    # ==========================================================
    # Authentication
    # ==========================================================

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Compatibility alias for older service/test payloads. The database
    # remains canonical on hashed_password and never stores plaintext.
    password_hash = synonym("hashed_password")

    # ==========================================================
    # Authorization
    # ==========================================================

    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="customer",
        server_default="customer",
        index=True,
    )

    # Supported roles:
    #
    # customer
    # admin

    # ==========================================================
    # Account Status
    # ==========================================================

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        index=True,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )

    # ==========================================================
    # Password Reset
    # ==========================================================

    reset_token: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    reset_token_expiry: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Timestamps
    # ==========================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ==========================================================
    # Relationships
    # ==========================================================

    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog",
        foreign_keys="AuditLog.user_id",
        back_populates="user",
    )

    subscription_history: Mapped[
        list["SubscriptionHistory"]
    ] = relationship(
        "SubscriptionHistory",
        foreign_keys="SubscriptionHistory.user_id",
        back_populates="user",
    )

    # ==========================================================
    # Helper Methods
    # ==========================================================

    def is_admin(self) -> bool:
        """
        Return True when the user has administrator privileges.
        """

        return self.role.strip().lower() == "admin"

    def is_customer(self) -> bool:
        """
        Return True when the user has customer privileges.
        """

        return self.role.strip().lower() == "customer"

    def activate(self) -> None:
        """
        Activate the user account.
        """

        self.is_active = True

    def deactivate(self) -> None:
        """
        Deactivate the user account.
        """

        self.is_active = False

    def verify(self) -> None:
        """
        Mark the user account as verified.
        """

        self.is_verified = True

    def clear_reset_token(self) -> None:
        """
        Clear password-reset information after successful
        password reset.
        """

        self.reset_token = None
        self.reset_token_expiry = None

    # ==========================================================
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<User "
            f"id={self.id} "
            f"email={self.email} "
            f"role={self.role} "
            f"is_active={self.is_active}>"
        )