"""
BillSphere Billing Cycle Model

Stores historical billing periods for subscriptions.

A BillingCycle represents one billing period.

Lifecycle:

    active
      |
    invoiced
      |
    renewed
      |
    closed
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
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


if TYPE_CHECKING:
    from app.models.invoice import Invoice
    from app.models.subscription import Subscription


# ==========================================================
# Billing Cycle Status Constants
# ==========================================================

BILLING_CYCLE_ACTIVE = "active"
BILLING_CYCLE_INVOICED = "invoiced"
BILLING_CYCLE_RENEWED = "renewed"
BILLING_CYCLE_CLOSED = "closed"


class BillingCycle(Base):
    """
    Historical billing period for a subscription.
    """

    __tablename__ = "billing_cycles"

    __table_args__ = (
        Index(
            "ix_billing_cycles_subscription_status",
            "subscription_id",
            "status",
        ),
        Index(
            "ix_billing_cycles_subscription_period",
            "subscription_id",
            "cycle_start",
            "cycle_end",
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
        back_populates="billing_cycles",
        foreign_keys=[subscription_id],
    )

    # ==========================================================
    # Billing Period
    # ==========================================================

    cycle_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    cycle_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    # ==========================================================
    # Status
    # ==========================================================

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=BILLING_CYCLE_ACTIVE,
        server_default=BILLING_CYCLE_ACTIVE,
        index=True,
    )

    # ==========================================================
    # Invoice
    # ==========================================================

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
        back_populates="billing_cycles",
        foreign_keys=[invoice_id],
    )

    # ==========================================================
    # Timestamp
    # ==========================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ==========================================================
    # State Helpers
    # ==========================================================

    def mark_invoiced(
        self,
        invoice_id: int,
    ) -> None:
        """
        Attach an invoice and mark cycle as invoiced.
        """

        if invoice_id <= 0:
            raise ValueError(
                "invoice_id must be greater than zero."
            )

        self.invoice_id = invoice_id
        self.status = BILLING_CYCLE_INVOICED

    def mark_renewed(self) -> None:
        """
        Mark the billing cycle as renewed.
        """

        self.status = BILLING_CYCLE_RENEWED

    def mark_closed(self) -> None:
        """
        Mark the billing cycle as closed.
        """

        self.status = BILLING_CYCLE_CLOSED

    def mark_active(self) -> None:
        """
        Mark the billing cycle as active.
        """

        self.status = BILLING_CYCLE_ACTIVE

    # ==========================================================
    # State Properties
    # ==========================================================

    @property
    def is_active(self) -> bool:
        return self.status == BILLING_CYCLE_ACTIVE

    @property
    def is_invoiced(self) -> bool:
        return self.status == BILLING_CYCLE_INVOICED

    @property
    def is_renewed(self) -> bool:
        return self.status == BILLING_CYCLE_RENEWED

    @property
    def is_closed(self) -> bool:
        return self.status == BILLING_CYCLE_CLOSED

    @property
    def has_invoice(self) -> bool:
        return self.invoice_id is not None

    # ==========================================================
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<BillingCycle "
            f"id={self.id} "
            f"subscription_id={self.subscription_id} "
            f"start={self.cycle_start} "
            f"end={self.cycle_end} "
            f"status={self.status} "
            f"invoice_id={self.invoice_id}>"
        )