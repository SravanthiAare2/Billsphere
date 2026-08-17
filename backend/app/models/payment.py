"""
BillSphere Payment Model

Database table:

payments
---------
id
invoice_id
amount
payment_method
transaction_id
status
payment_date
refunded_amount
refunded_at
refund_reason
created_at

Supported payment statuses:

- pending
- completed
- failed
- refunded
- partially_refunded
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
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
    from app.models.invoice import Invoice


# ==========================================================
# Payment Status Constants
# ==========================================================

PAYMENT_STATUS_PENDING = "pending"
PAYMENT_STATUS_COMPLETED = "completed"
PAYMENT_STATUS_FAILED = "failed"
PAYMENT_STATUS_REFUNDED = "refunded"
PAYMENT_STATUS_PARTIALLY_REFUNDED = "partially_refunded"


PAYMENT_STATUSES = {
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_COMPLETED,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_REFUNDED,
    PAYMENT_STATUS_PARTIALLY_REFUNDED,
}


# ==========================================================
# Payment Model
# ==========================================================

class Payment(Base):
    """
    Payment database model.

    Represents a payment attempt against an invoice.

    Payment lifecycle:

        pending
           |
           +----------+
           |          |
       completed    failed
           |
           |
       refunded
           |
           +----------------------+
                                  |
                         partially_refunded

    A completed payment may be fully or partially refunded.
    """

    __tablename__ = "payments"

    # ======================================================
    # Primary Key
    # ======================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ======================================================
    # Invoice Reference
    # ======================================================

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ======================================================
    # Invoice Relationship
    # ======================================================

    invoice: Mapped["Invoice"] = relationship(
        "Invoice",
        back_populates="payments",
        foreign_keys=[invoice_id],
        lazy="selectin",
    )

    # ======================================================
    # Payment Amount
    # ======================================================

    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # ======================================================
    # Payment Method
    # ======================================================

    payment_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="card",
    )

    # ======================================================
    # Transaction ID
    # ======================================================

    transaction_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
    )

    # ======================================================
    # Payment Status
    # ======================================================

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=PAYMENT_STATUS_PENDING,
        index=True,
    )

    # ======================================================
    # Payment Date
    # ======================================================

    payment_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ======================================================
    # Refunded Amount
    # ======================================================

    refunded_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        default=None,
    )

    # ======================================================
    # Refunded At
    # ======================================================

    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ======================================================
    # Refund Reason
    # ======================================================

    refund_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ======================================================
    # Created At
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
            f"<Payment "
            f"id={self.id} "
            f"invoice_id={self.invoice_id} "
            f"amount={self.amount} "
            f"status={self.status}>"
        )