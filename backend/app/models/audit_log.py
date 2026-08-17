"""
BillSphere Audit Log Model

Database table:
audit_logs

Tracks:
- User actions
- Security events
- Billing changes
- Subscription lifecycle events
- Payment events
- Administrative activities
- Entity references
- Request metadata
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
    from app.models.user import User


class AuditLog(Base):
    """
    Audit log database model.

    Audit records are intended to be append-only from the
    application/service layer.

    They provide a persistent record of important actions
    performed across BillSphere.
    """

    __tablename__ = "audit_logs"

    # ==========================================================
    # Primary Key
    # ==========================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # User Reference
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
    # Action Information
    # ==========================================================

    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    module: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ==========================================================
    # Request Tracking
    # ==========================================================

    ip_address: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # ==========================================================
    # Entity Reference
    # ==========================================================

    entity_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True,
    )

    entity_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        index=True,
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
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<AuditLog "
            f"id={self.id} "
            f"action={self.action} "
            f"module={self.module} "
            f"entity_type={self.entity_type} "
            f"entity_id={self.entity_id}>"
        )