"""
BillSphere Invoice Model

Database table:
invoices

Handles:

- Customer invoices
- Subscription invoices
- Invoice amounts
- Tax amounts
- Total amounts
- Invoice lifecycle status
- Due dates
- Payment timestamps
- Invoice line items
- Relationship with customers
- Relationship with subscriptions
- Relationship with payments
- Relationship with billing cycles

Invoice lifecycle:

    pending
       |
       +--------+
       |        |
     paid      void
       |
    refunded*

A payment service is responsible for changing invoice
payment state. The model only represents persisted data
and relationships.
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
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.core.database import Base


if TYPE_CHECKING:
    from app.models.billing_cycle import BillingCycle
    from app.models.customer import Customer
    from app.models.invoice_line_item import InvoiceLineItem
    from app.models.payment import Payment
    from app.models.subscription import Subscription


# ==========================================================
# Invoice Status Constants
# ==========================================================

INVOICE_PENDING = "pending"
INVOICE_PAID = "paid"
INVOICE_FAILED = "failed"
INVOICE_VOID = "void"
INVOICE_OVERDUE = "overdue"


# ==========================================================
# Invoice Model
# ==========================================================


class Invoice(Base):
    """
    Invoice database model.

    Represents an amount owed by a customer for a
    subscription, usage, tax, or other billable items.

    Important:

    - ``amount`` represents the taxable/subtotal amount.
    - ``tax_amount`` represents the calculated tax.
    - ``total_amount`` represents amount + tax.
    - ``status`` represents the invoice lifecycle.
    - Payment records are stored separately in ``payments``.
    """

    __tablename__ = "invoices"

    # ======================================================
    # Table Indexes
    # ======================================================

    __table_args__ = (
        Index(
            "ix_invoices_customer_status",
            "customer_id",
            "status",
        ),
        Index(
            "ix_invoices_subscription_status",
            "subscription_id",
            "status",
        ),
        Index(
            "ix_invoices_due_date_status",
            "due_date",
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
    # Invoice Information
    # ======================================================

    invoice_number: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    # ======================================================
    # Customer Reference
    # ======================================================

    customer_id: Mapped[int] = mapped_column(
        ForeignKey(
            "customers.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ======================================================
    # Subscription Reference
    # ======================================================

    subscription_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "subscriptions.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # ======================================================
    # Amount Details
    # ======================================================

    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # ======================================================
    # Invoice Status
    # ======================================================

    status: Mapped[str] = mapped_column(
        String(50),
        default=INVOICE_PENDING,
        nullable=False,
        index=True,
    )

    # Supported statuses:
    #
    # pending
    # paid
    # failed
    # overdue
    # void

    # ======================================================
    # Payment / Due Dates
    # ======================================================

    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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
    # Customer Relationship
    # ======================================================

    customer: Mapped["Customer"] = relationship(
        "Customer",
        foreign_keys=[customer_id],
    )

    # ======================================================
    # Subscription Relationship
    # ======================================================

    subscription: Mapped["Subscription | None"] = relationship(
        "Subscription",
        foreign_keys=[subscription_id],
    )

    # ======================================================
    # Invoice Line Items
    # ======================================================

    line_items: Mapped[list["InvoiceLineItem"]] = relationship(
        "InvoiceLineItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )

    # ======================================================
    # Payments
    # ======================================================

    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="invoice",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )

    # ======================================================
    # Billing Cycles
    # ======================================================

    billing_cycles: Mapped[list["BillingCycle"]] = relationship(
        "BillingCycle",
        back_populates="invoice",
        foreign_keys="BillingCycle.invoice_id",
        lazy="selectin",
    )

    # ======================================================
    # Convenience Properties
    # ======================================================

    @property
    def is_paid(self) -> bool:
        """
        Return True when invoice is paid.
        """

        return self.status == INVOICE_PAID

    @property
    def is_pending(self) -> bool:
        """
        Return True when invoice is pending payment.
        """

        return self.status == INVOICE_PENDING

    @property
    def is_void(self) -> bool:
        """
        Return True when invoice has been voided.
        """

        return self.status == INVOICE_VOID

    @property
    def balance_amount(self) -> Decimal:
        """
        Return the unpaid invoice balance.

        This is calculated from payment records when they
        are loaded.

        The property never returns a negative balance.
        """

        total = Decimal(
            str(self.total_amount or 0)
        ).quantize(
            Decimal("0.01")
        )

        paid_amount = Decimal("0.00")

        for payment in self.payments:
            if payment.status in {
                "completed",
                "partially_refunded",
            }:
                paid_amount += Decimal(
                    str(payment.amount or 0)
                )

                refunded = Decimal(
                    str(
                        payment.refunded_amount
                        or 0
                    )
                )

                paid_amount -= refunded

        balance = (
            total - paid_amount
        ).quantize(
            Decimal("0.01")
        )

        return max(
            balance,
            Decimal("0.00"),
        )

    # ======================================================
    # Representation
    # ======================================================

    def __repr__(self) -> str:
        return (
            f"<Invoice "
            f"id={self.id} "
            f"number={self.invoice_number} "
            f"status={self.status} "
            f"total={self.total_amount}>"
        )