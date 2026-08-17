"""
BillSphere Usage Record Model

Stores metered usage charges associated with subscriptions.

Database table:
    usage_records

Columns:
    id
    subscription_id
    description
    quantity
    unit_price
    amount
    invoiced
    invoice_id
    recorded_at
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


if TYPE_CHECKING:
    from app.models.invoice import Invoice
    from app.models.subscription import Subscription


class UsageRecord(Base):
    """
    Metered usage charge for a subscription.

    Usage records remain unbilled until the billing engine
    includes them in an invoice.
    """

    __tablename__ = "usage_records"

    __table_args__ = (
        Index(
            "ix_usage_records_subscription_invoiced",
            "subscription_id",
            "invoiced",
        ),
    )

    # ==========================================================
    # Primary Key
    # ==========================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # Subscription
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
    # Usage Details
    # ==========================================================

    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False,
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    # ==========================================================
    # Invoice Information
    # ==========================================================

    invoiced: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )

    invoice_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "invoices.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    invoice: Mapped["Invoice | None"] = relationship(
        "Invoice",
        foreign_keys=[invoice_id],
    )

    # ==========================================================
    # Timestamp
    # ==========================================================

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # ==========================================================
    # Usage Helpers
    # ==========================================================

    def calculate_amount(self) -> Decimal:
        """
        Calculate quantity × unit price.

        Currency values are rounded to two decimal places.
        """

        quantity = Decimal(str(self.quantity or 0))
        unit_price = Decimal(str(self.unit_price or 0))

        return (
            quantity * unit_price
        ).quantize(
            Decimal("0.01")
        )

    def update_amount(self) -> None:
        """
        Recalculate and store the usage amount.
        """

        self.amount = self.calculate_amount()

    # ==========================================================
    # Invoice Lifecycle
    # ==========================================================

    def mark_invoiced(
        self,
        invoice_id: int,
    ) -> None:
        """
        Mark this usage record as included in an invoice.
        """

        if invoice_id <= 0:
            raise ValueError(
                "invoice_id must be greater than zero."
            )

        self.invoice_id = invoice_id
        self.invoiced = True

    def mark_uninvoiced(self) -> None:
        """
        Remove the invoice association.
        """

        self.invoiced = False
        self.invoice_id = None

    def is_invoiced(self) -> bool:
        """
        Return True when this usage record has been invoiced.
        """

        return self.invoiced

    def is_pending_invoice(self) -> bool:
        """
        Return True when this usage record is still unbilled.
        """

        return not self.invoiced

    # ==========================================================
    # Validation
    # ==========================================================

    def validate_amount(self) -> bool:
        """
        Check whether amount matches quantity × unit_price.
        """

        expected = self.calculate_amount()

        actual = Decimal(
            str(self.amount or 0)
        ).quantize(
            Decimal("0.01")
        )

        return actual == expected

    # ==========================================================
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<UsageRecord "
            f"id={self.id} "
            f"subscription_id={self.subscription_id} "
            f"quantity={self.quantity} "
            f"unit_price={self.unit_price} "
            f"amount={self.amount} "
            f"invoiced={self.invoiced}>"
        )