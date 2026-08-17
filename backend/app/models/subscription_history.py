"""
BillSphere Subscription History Model

Database table:
subscription_history

Stores an immutable record of subscription lifecycle events.

Tracks:
- Subscription
- User who performed the action
- Previous status
- New status
- Lifecycle action
- Reason
- Timestamp

Used by:
- Subscription State Machine
- Payment Recovery
- Billing Cycle Engine
- Cancellation Workflow
- Pause / Resume Workflow
- Audit / Reporting
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
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


if TYPE_CHECKING:
    from app.models.subscription import Subscription
    from app.models.user import User


class SubscriptionHistory(Base):
    """
    Persistent subscription lifecycle history.

    Each important subscription lifecycle transition creates
    a separate history record.

    History records are intentionally append-only from the
    application/service perspective.
    """

    __tablename__ = "subscription_history"

    # ==========================================================
    # Primary Key
    # ==========================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # Subscription Relationship
    # ==========================================================

    subscription_id: Mapped[int] = mapped_column(
        ForeignKey(
            "subscriptions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    subscription: Mapped["Subscription"] = relationship(
        "Subscription",
        foreign_keys=[subscription_id],
    )

    # ==========================================================
    # User Relationship
    # ==========================================================

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    user: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[user_id],
    )

    # ==========================================================
    # Lifecycle Status
    # ==========================================================

    previous_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    new_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    # ==========================================================
    # Lifecycle Action
    # ==========================================================

    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    # Examples:
    #
    # create
    # activate
    # pause
    # resume
    # payment_failed
    # payment_success
    # cancel
    # cancel_at_period_end
    # expire
    # renew

    # ==========================================================
    # Reason
    # ==========================================================

    reason: Mapped[str | None] = mapped_column(
        Text,
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
    # Helper Properties
    # ==========================================================

    @property
    def status_changed(self) -> bool:
        """
        Return True when the lifecycle status actually changed.

        This is useful for events such as:
            active -> active

        where a history record may still be created for an
        operational action such as cancellation scheduling.
        """

        return self.previous_status != self.new_status

    # ==========================================================
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        """
        Return a readable history representation.
        """

        return (
            f"<SubscriptionHistory "
            f"id={self.id} "
            f"subscription_id={self.subscription_id} "
            f"action={self.action} "
            f"{self.previous_status}"
            f"->{self.new_status}>"
        )