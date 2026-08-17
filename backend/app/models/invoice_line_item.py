"""
BillSphere Invoice Line Item Model

Database table:
    invoice_line_items

Stores individual charges and adjustments belonging
to an invoice.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
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


# ==========================================================
# Line Item Type Constants
# ==========================================================

LINE_ITEM_SUBSCRIPTION = "subscription"
LINE_ITEM_USAGE = "usage"
LINE_ITEM_TAX_CGST = "tax_cgst"
LINE_ITEM_TAX_SGST = "tax_sgst"
LINE_ITEM_TAX_IGST = "tax_igst"
LINE_ITEM_DISCOUNT = "discount"
LINE_ITEM_PRORATION = "proration"
LINE_ITEM_REFUND = "refund"
LINE_ITEM_CHARGE = "charge"


class InvoiceLineItem(Base):
    """
    Individual line item belonging to an invoice.
    """

    __tablename__ = "invoice_line_items"

    __table_args__ = (
        Index(
            "ix_invoice_line_items_invoice_type",
            "invoice_id",
            "item_type",
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
    # Invoice
    # ==========================================================

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    invoice: Mapped["Invoice"] = relationship(
        "Invoice",
        back_populates="line_items",
    )

    # ==========================================================
    # Description
    # ==========================================================

    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # ==========================================================
    # Item Type
    # ==========================================================

    item_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=LINE_ITEM_CHARGE,
        server_default=LINE_ITEM_CHARGE,
        index=True,
    )

    # ==========================================================
    # Amount
    # ==========================================================

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
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
    # Convenience Properties
    # ==========================================================

    @property
    def is_tax(self) -> bool:
        return self.item_type in {
            LINE_ITEM_TAX_CGST,
            LINE_ITEM_TAX_SGST,
            LINE_ITEM_TAX_IGST,
        }

    @property
    def is_refund(self) -> bool:
        return self.item_type == LINE_ITEM_REFUND

    @property
    def is_subscription(self) -> bool:
        return self.item_type == LINE_ITEM_SUBSCRIPTION

    @property
    def is_usage(self) -> bool:
        return self.item_type == LINE_ITEM_USAGE

    @property
    def is_proration(self) -> bool:
        return self.item_type == LINE_ITEM_PRORATION

    @property
    def is_discount(self) -> bool:
        return self.item_type == LINE_ITEM_DISCOUNT

    # ==========================================================
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<InvoiceLineItem "
            f"id={self.id} "
            f"invoice_id={self.invoice_id} "
            f"type={self.item_type} "
            f"amount={self.amount}>"
        )