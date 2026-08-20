"""
BillSphere Payment Retry Model

Database table:

payment_retries
----------------
id
payment_id
retry_count
retry_date
status
error_message
created_at

Used for:

- Failed payment recovery
- Dunning workflow
- Day 1 / Day 3 / Day 7 retry scheduling
- Retry processing
- Retry cancellation
- Retry history
- Idempotent retry creation
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


if TYPE_CHECKING:
    from app.models.payment import Payment


# ==========================================================
# Retry Status Constants
# ==========================================================

RETRY_PENDING = "pending"
RETRY_SCHEDULED = "scheduled"
RETRY_PROCESSING = "processing"
RETRY_COMPLETED = "completed"
RETRY_FAILED = "failed"
RETRY_CANCELLED = "cancelled"


RETRY_STATUSES = {
    RETRY_PENDING,
    RETRY_SCHEDULED,
    RETRY_PROCESSING,
    RETRY_COMPLETED,
    RETRY_FAILED,
    RETRY_CANCELLED,
}


# ==========================================================
# Payment Retry Model
# ==========================================================


class PaymentRetry(Base):
    """
    Payment retry tracking model.

    Each PaymentRetry represents one scheduled or processed
    retry attempt for a failed payment.

    Typical dunning schedule:

        Payment failed
              |
              +---- Day 1
              |
              +---- Day 3
              |
              +---- Day 7

    retry_count stores the retry day/attempt identifier.

    Examples:

        retry_count = 1  -> Day 1
        retry_count = 3  -> Day 3
        retry_count = 7  -> Day 7

    The model does not perform retry logic itself.
    Retry orchestration is handled by the payment/dunning
    service layer.
    """

    __tablename__ = "payment_retries"

    # ======================================================
    # Table Indexes
    # ======================================================

    __table_args__ = (
        Index(
            "ix_payment_retries_payment_status",
            "payment_id",
            "status",
        ),
        Index(
            "ix_payment_retries_retry_date_status",
            "retry_date",
            "status",
        ),
    )

    # ======================================================
    # Primary Key
    # ======================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ======================================================
    # Payment Reference
    # ======================================================

    payment_id: Mapped[int] = mapped_column(
        ForeignKey(
            "payments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ======================================================
    # Payment Relationship
    # ======================================================

    payment: Mapped["Payment"] = relationship(
        "Payment",
        back_populates="payment_retries",
        foreign_keys=[payment_id],
    )

    # ======================================================
    # Retry Information
    # ======================================================

    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # ======================================================
    # Scheduled Retry Date
    # ======================================================

    retry_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # ======================================================
    # Retry Status
    # ======================================================

    status: Mapped[str] = mapped_column(
        String(50),
        default=RETRY_PENDING,
        nullable=False,
        index=True,
    )

    # ======================================================
    # Error Information
    # ======================================================

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ======================================================
    # Timestamp
    # ======================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ======================================================
    # Representation
    # ======================================================

    def __repr__(self) -> str:
        return (
            f"<PaymentRetry "
            f"id={self.id} "
            f"payment_id={self.payment_id} "
            f"retry_count={self.retry_count} "
            f"status={self.status}>"
        )