"""
BillSphere Billing Cycle Service

Responsible for:

- Starting billing cycles
- Creating billing-cycle history
- Calculating billing periods
- Synchronizing subscription billing metadata
- Generating renewal invoices
- Reusing existing renewal invoices
- Idempotent renewal processing
- Successful renewal completion
- Closing billing cycles
- Cancel-at-period-end handling
- Processing subscriptions at period end
- Preventing duplicate billing cycles
- Scheduler-compatible processing
- Billing-cycle history retrieval
- Usage billing integration
- Tax integration

Billing lifecycle:

    Subscription
         |
         v
    Active Billing Cycle
         |
         v
    Period Ends
         |
         v
    Renewal Invoice
         |
         +---- payment succeeds ----> Next Billing Cycle
         |
         +---- payment fails -------> Past Due / Dunning

Important:

Creating an invoice does NOT advance the subscription.

The subscription advances only after successful payment.
"""

from __future__ import annotations

from calendar import monthrange
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.billing_cycle import BillingCycle
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.usage_record import UsageRecord

from app.services.invoice_service import generate_invoice_number
from app.services.subscription_state_machine import (
    SubscriptionLifecycleException,
    SubscriptionStatus,
    process_period_end as state_machine_process_period_end,
)
from app.services.tax_service import calculate_tax


# ==========================================================
# Constants
# ==========================================================

ACTIVE_CYCLE_STATUS = "active"
RENEWED_CYCLE_STATUS = "renewed"
INVOICED_CYCLE_STATUS = "invoiced"
CLOSED_CYCLE_STATUS = "closed"

INVOICE_PENDING_STATUS = "pending"
INVOICE_PAID_STATUS = "paid"
INVOICE_FAILED_STATUS = "failed"

SUPPORTED_BILLING_CYCLES = {
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
    "annual",
}


# ==========================================================
# Internal Utility Helpers
# ==========================================================


def _now() -> datetime:
    """
    Return current UTC datetime.
    """
    return datetime.now(timezone.utc)


def _as_utc(
    value: datetime | None,
) -> datetime | None:
    """
    Normalize datetime into timezone-aware UTC.

    Handles both:

    - timezone-aware datetimes
    - timezone-naive datetimes
    """

    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _money(
    value: Any,
) -> Decimal:
    """
    Convert a value into a two-decimal Decimal.

    This avoids floating-point billing calculations.
    """

    if value is None:
        value = 0

    return Decimal(
        str(value)
    ).quantize(
        Decimal("0.01")
    )


def _normalize_status(
    value: Any,
) -> str:
    """
    Normalize status values.
    """

    return str(
        value or ""
    ).strip().lower()


def _normalize_billing_cycle(
    value: Any,
) -> str:
    """
    Normalize billing-cycle value.

    Defaults to monthly.
    """

    normalized = str(
        value or "monthly"
    ).strip().lower()

    if normalized not in SUPPORTED_BILLING_CYCLES:
        return "monthly"

    return normalized


# ==========================================================
# Date Helpers
# ==========================================================


def _add_months(
    value: datetime,
    months: int,
) -> datetime:
    """
    Add calendar months while preserving the day where possible.

    Examples:

        January 31 + 1 month
            -> February 28/29

        March 31 + 1 month
            -> April 30
    """

    if months == 0:
        return value

    year = value.year
    month = value.month + months

    year += (month - 1) // 12
    month = ((month - 1) % 12) + 1

    day = min(
        value.day,
        monthrange(year, month)[1],
    )

    return value.replace(
        year=year,
        month=month,
        day=day,
    )


def _calculate_cycle_end(
    cycle_start: datetime,
    billing_cycle: str,
) -> datetime:
    """
    Calculate billing-period end.

    Supported:

        daily
        weekly
        monthly
        quarterly
        yearly
        annual
    """

    normalized_cycle = _normalize_billing_cycle(
        billing_cycle
    )

    if normalized_cycle == "daily":
        return cycle_start + timedelta(days=1)

    if normalized_cycle == "weekly":
        return cycle_start + timedelta(days=7)

    if normalized_cycle == "monthly":
        return _add_months(
            cycle_start,
            1,
        )

    if normalized_cycle == "quarterly":
        return _add_months(
            cycle_start,
            3,
        )

    if normalized_cycle in {
        "yearly",
        "annual",
    }:
        return _add_months(
            cycle_start,
            12,
        )

    return _add_months(
        cycle_start,
        1,
    )


def _validate_period(
    start: datetime | None,
    end: datetime | None,
) -> tuple[datetime, datetime]:
    """
    Validate and normalize billing-period dates.
    """

    normalized_start = _as_utc(start)
    normalized_end = _as_utc(end)

    if not normalized_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Billing period start date is required."
            ),
        )

    if not normalized_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Billing period end date is required."
            ),
        )

    if normalized_end <= normalized_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Billing period end date must be "
                "after the start date."
            ),
        )

    return (
        normalized_start,
        normalized_end,
    )


# ==========================================================
# Customer Helpers
# ==========================================================


def _get_customer(
    db: Session,
    customer_id: int,
) -> Customer | None:
    """
    Return customer by ID.
    """

    return (
        db.query(Customer)
        .filter(
            Customer.id == customer_id
        )
        .first()
    )


def _get_customer_country(
    db: Session,
    customer_id: int,
) -> str:
    """
    Return customer country.

    Defaults to India.
    """

    customer = _get_customer(
        db,
        customer_id,
    )

    if not customer:
        return "IN"

    country = getattr(
        customer,
        "country",
        None,
    )

    if not country:
        return "IN"

    return str(
        country
    ).strip().upper()


# ==========================================================
# Plan Helper
# ==========================================================


def _get_subscription_plan(
    db: Session,
    subscription: Subscription,
) -> Plan:
    """
    Load subscription plan.
    """

    plan = (
        db.query(Plan)
        .filter(
            Plan.id == subscription.plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found.",
        )

    return plan


# ==========================================================
# Billing Cycle Retrieval
# ==========================================================


def get_active_billing_cycle(
    db: Session,
    subscription_id: int,
) -> BillingCycle | None:
    """
    Return the latest active billing cycle.
    """

    return (
        db.query(BillingCycle)
        .filter(
            BillingCycle.subscription_id
            == subscription_id,
            BillingCycle.status
            == ACTIVE_CYCLE_STATUS,
        )
        .order_by(
            BillingCycle.id.desc()
        )
        .first()
    )


def get_latest_billing_cycle(
    db: Session,
    subscription_id: int,
) -> BillingCycle | None:
    """
    Return latest billing-cycle record.
    """

    return (
        db.query(BillingCycle)
        .filter(
            BillingCycle.subscription_id
            == subscription_id,
        )
        .order_by(
            BillingCycle.id.desc()
        )
        .first()
    )


def get_billing_cycle_by_invoice(
    db: Session,
    invoice_id: int,
) -> BillingCycle | None:
    """
    Return billing cycle associated with an invoice.
    """

    return (
        db.query(BillingCycle)
        .filter(
            BillingCycle.invoice_id
            == invoice_id,
        )
        .order_by(
            BillingCycle.id.desc()
        )
        .first()
    )


def get_billing_cycle_by_period(
    db: Session,
    subscription_id: int,
    cycle_start: datetime,
    cycle_end: datetime,
) -> BillingCycle | None:
    """
    Find billing cycle matching an exact period.
    """

    start = _as_utc(cycle_start)
    end = _as_utc(cycle_end)

    return (
        db.query(BillingCycle)
        .filter(
            BillingCycle.subscription_id
            == subscription_id,
            BillingCycle.cycle_start
            == start,
            BillingCycle.cycle_end
            == end,
        )
        .order_by(
            BillingCycle.id.desc()
        )
        .first()
    )


# ==========================================================
# Create Billing Cycle
# ==========================================================


def create_billing_cycle(
    db: Session,
    subscription: Subscription,
    cycle_start: datetime | None = None,
    cycle_end: datetime | None = None,
    status_value: str = ACTIVE_CYCLE_STATUS,
) -> BillingCycle:
    """
    Create billing-cycle history record.

    Identical periods are reused.

    This protects against duplicate scheduler execution.
    """

    start = _as_utc(
        cycle_start
        or subscription.current_period_start
        or subscription.start_date
    )

    if start is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subscription does not have a valid "
                "billing-cycle start date."
            ),
        )

    if cycle_end is not None:
        end = _as_utc(cycle_end)

    elif subscription.current_period_end:
        end = _as_utc(
            subscription.current_period_end
        )

    else:
        end = _calculate_cycle_end(
            start,
            subscription.billing_cycle,
        )

    if end is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Billing-cycle end date could not "
                "be determined."
            ),
        )

    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Billing cycle end date must be after "
                "cycle start date."
            ),
        )

    existing = get_billing_cycle_by_period(
        db=db,
        subscription_id=subscription.id,
        cycle_start=start,
        cycle_end=end,
    )

    if existing:
        return existing

    billing_cycle = BillingCycle(
        subscription_id=subscription.id,
        cycle_start=start,
        cycle_end=end,
        status=status_value,
        invoice_id=None,
        created_at=_now(),
    )

    db.add(billing_cycle)
    db.flush()

    return billing_cycle


# ==========================================================
# Start Subscription Billing Cycle
# ==========================================================


def start_subscription_billing_cycle(
    db: Session,
    subscription: Subscription,
) -> BillingCycle:
    """
    Start or recover the subscription's current billing cycle.

    Synchronizes:

        current_period_start
        current_period_end
        next_billing_date
    """

    start = (
        subscription.current_period_start
        or subscription.start_date
    )

    start = _as_utc(start)

    if start is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subscription does not have a valid "
                "start date."
            ),
        )

    end = _as_utc(
        subscription.current_period_end
    )

    if end is None:
        end = _calculate_cycle_end(
            start,
            subscription.billing_cycle,
        )

    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subscription billing period end must "
                "be after its start."
            ),
        )

    subscription.current_period_start = start
    subscription.current_period_end = end
    subscription.next_billing_date = end

    existing = get_billing_cycle_by_period(
        db=db,
        subscription_id=subscription.id,
        cycle_start=start,
        cycle_end=end,
    )

    if existing:
        return existing

    cycle = create_billing_cycle(
        db=db,
        subscription=subscription,
        cycle_start=start,
        cycle_end=end,
        status_value=ACTIVE_CYCLE_STATUS,
    )

    db.flush()

    return cycle


# ==========================================================
# Renewal Invoice Retrieval
# ==========================================================


def get_renewal_invoice_for_cycle(
    db: Session,
    billing_cycle: BillingCycle,
) -> Invoice | None:
    """
    Return invoice attached to billing cycle.
    """

    if not billing_cycle.invoice_id:
        return None

    return (
        db.query(Invoice)
        .filter(
            Invoice.id
            == billing_cycle.invoice_id,
        )
        .first()
    )


def get_existing_renewal_invoice(
    db: Session,
    subscription_id: int,
    billing_cycle: BillingCycle,
) -> Invoice | None:
    """
    Find an existing renewal invoice.

    First checks the billing-cycle reference.

    Then falls back to subscription + invoice lookup.

    This makes renewal processing more resilient if the
    billing-cycle reference was not persisted correctly.
    """

    invoice = get_renewal_invoice_for_cycle(
        db,
        billing_cycle,
    )

    if invoice:
        return invoice

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.subscription_id
            == subscription_id,
            Invoice.status.in_(
                [
                    INVOICE_PENDING_STATUS,
                    INVOICE_FAILED_STATUS,
                ]
            ),
        )
        .order_by(
            Invoice.id.desc()
        )
        .first()
    )

    return invoice


# ==========================================================
# Create Renewal Invoice
# ==========================================================


def create_renewal_invoice(
    db: Session,
    subscription: Subscription,
    plan: Plan,
    billing_cycle: BillingCycle | None = None,
) -> Invoice:
    """
    Create or reuse renewal invoice.

    Important:

    - Does NOT process payment.
    - Does NOT advance subscription.
    - Does NOT mark the subscription renewed.
    - Reuses an existing invoice for the same billing cycle.

    Usage records are linked to the invoice but are not
    permanently considered paid until payment succeeds.
    """

    if billing_cycle is None:
        billing_cycle = get_active_billing_cycle(
            db,
            subscription.id,
        )

    if billing_cycle:
        existing_invoice = (
            get_existing_renewal_invoice(
                db=db,
                subscription_id=subscription.id,
                billing_cycle=billing_cycle,
            )
        )

        if existing_invoice:

            if (
                billing_cycle.invoice_id
                != existing_invoice.id
            ):
                billing_cycle.invoice_id = (
                    existing_invoice.id
                )

            if billing_cycle.status == (
                ACTIVE_CYCLE_STATUS
            ):
                billing_cycle.status = (
                    INVOICED_CYCLE_STATUS
                )

            db.flush()

            return existing_invoice

    # ------------------------------------------------------
    # Validate current period
    # ------------------------------------------------------

    period_start = _as_utc(
        subscription.current_period_start
    )

    period_end = _as_utc(
        subscription.current_period_end
    )

    _validate_period(
        period_start,
        period_end,
    )

    # ------------------------------------------------------
    # Plan amount
    # ------------------------------------------------------

    plan_amount = _money(
        getattr(
            plan,
            "price",
            0,
        )
    )

    if plan_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan price cannot be negative.",
        )

    # ------------------------------------------------------
    # Usage
    # ------------------------------------------------------

    usage_records = (
        db.query(UsageRecord)
        .filter(
            UsageRecord.subscription_id
            == subscription.id,
            UsageRecord.invoiced.is_(False),
        )
        .order_by(
            UsageRecord.id.asc()
        )
        .all()
    )

    usage_amount = sum(
        (
            _money(
                getattr(
                    record,
                    "amount",
                    0,
                )
            )
            for record in usage_records
        ),
        Decimal("0.00"),
    ).quantize(
        Decimal("0.01")
    )

    taxable_amount = (
        plan_amount
        + usage_amount
    ).quantize(
        Decimal("0.01")
    )

    # ------------------------------------------------------
    # Customer / Tax
    # ------------------------------------------------------

    country_code = _get_customer_country(
        db,
        subscription.customer_id,
    )

    customer = _get_customer(
        db,
        subscription.customer_id,
    )

    company_country = str(
        getattr(
            settings,
            "COMPANY_COUNTRY",
            "IN",
        )
        or "IN"
    ).strip().upper()

    company_state = str(
        getattr(
            settings,
            "COMPANY_STATE",
            "",
        )
        or ""
    ).strip().lower()

    customer_state = str(
        getattr(
            customer,
            "state",
            "",
        )
        or ""
    ).strip().lower()

    same_state = (
        country_code
        == company_country
        and bool(customer_state)
        and bool(company_state)
        and customer_state
        == company_state
    )

    breakdown = calculate_tax(
        amount=taxable_amount,
        country_code=country_code,
        tax_rate_percent=None,
        same_state=same_state,
    )

    # ------------------------------------------------------
    # Create invoice
    # ------------------------------------------------------

    now = _now()

    invoice = Invoice(
        invoice_number=generate_invoice_number(
            db
        ),
        customer_id=subscription.customer_id,
        subscription_id=subscription.id,
        amount=breakdown.taxable_amount,
        tax_amount=breakdown.total_tax,
        total_amount=breakdown.total_amount,
        status=INVOICE_PENDING_STATUS,
        due_date=now,
        paid_at=None,
        created_at=now,
    )

    db.add(invoice)
    db.flush()

    # ------------------------------------------------------
    # Subscription line
    # ------------------------------------------------------

    db.add(
        InvoiceLineItem(
            invoice_id=invoice.id,
            description=(
                f"{plan.name} subscription "
                f"({subscription.billing_cycle})"
            ),
            item_type="subscription",
            amount=plan_amount,
        )
    )

    # ------------------------------------------------------
    # Usage lines
    # ------------------------------------------------------

    for record in usage_records:

        usage_record_amount = _money(
            getattr(
                record,
                "amount",
                0,
            )
        )

        description = str(
            getattr(
                record,
                "description",
                "Usage",
            )
            or "Usage"
        )

        quantity = getattr(
            record,
            "quantity",
            1,
        )

        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                description=(
                    f"{description} "
                    f"x{quantity}"
                ),
                item_type="usage",
                amount=usage_record_amount,
            )
        )

        # --------------------------------------------------
        # IMPORTANT
        # --------------------------------------------------
        #
        # Do NOT mark usage as permanently invoiced here.
        #
        # The invoice has only been created.
        #
        # Payment may still fail.
        #
        # The payment-success flow should finalize usage
        # billing.
        #
        # We only attach invoice_id if that field exists.
        #

        if hasattr(
            record,
            "invoice_id",
        ):
            record.invoice_id = invoice.id

    # ------------------------------------------------------
    # CGST
    # ------------------------------------------------------

    if breakdown.cgst > 0:

        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                description=(
                    "CGST "
                    f"({breakdown.tax_rate_percent / 2}%)"
                ),
                item_type="tax_cgst",
                amount=breakdown.cgst,
            )
        )

    # ------------------------------------------------------
    # SGST
    # ------------------------------------------------------

    if breakdown.sgst > 0:

        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                description=(
                    "SGST "
                    f"({breakdown.tax_rate_percent / 2}%)"
                ),
                item_type="tax_sgst",
                amount=breakdown.sgst,
            )
        )

    # ------------------------------------------------------
    # IGST
    # ------------------------------------------------------

    if breakdown.igst > 0:

        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                description=(
                    "IGST "
                    f"({breakdown.tax_rate_percent}%)"
                ),
                item_type="tax_igst",
                amount=breakdown.igst,
            )
        )

    # ------------------------------------------------------
    # Attach invoice to cycle
    # ------------------------------------------------------

    if billing_cycle:

        billing_cycle.invoice_id = invoice.id
        billing_cycle.status = (
            INVOICED_CYCLE_STATUS
        )

    db.flush()

    return invoice


# ==========================================================
# Finalize Usage After Successful Payment
# ==========================================================


def finalize_usage_for_paid_invoice(
    db: Session,
    invoice: Invoice,
) -> int:
    """
    Mark usage records as invoiced after successful payment.

    This is deliberately separate from invoice creation.

    Returns number of usage records finalized.
    """

    if not invoice.id:
        return 0

    usage_records = (
        db.query(UsageRecord)
        .filter(
            UsageRecord.invoice_id
            == invoice.id,
        )
        .all()
    )

    count = 0

    for record in usage_records:

        if hasattr(
            record,
            "invoiced",
        ):
            record.invoiced = True

        count += 1

    db.flush()

    return count


# ==========================================================
# Close Billing Cycle
# ==========================================================


def close_billing_cycle(
    db: Session,
    billing_cycle: BillingCycle,
    status_value: str = CLOSED_CYCLE_STATUS,
) -> BillingCycle:
    """
    Close billing cycle.
    """

    billing_cycle.status = status_value

    db.flush()

    return billing_cycle


# ==========================================================
# Attach Invoice
# ==========================================================


def attach_invoice_to_billing_cycle(
    db: Session,
    billing_cycle: BillingCycle,
    invoice: Invoice,
) -> BillingCycle:
    """
    Attach invoice to billing cycle.

    Idempotent operation.
    """

    if (
        billing_cycle.invoice_id
        and billing_cycle.invoice_id
        != invoice.id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Billing cycle already has a "
                "different invoice attached."
            ),
        )

    billing_cycle.invoice_id = invoice.id
    billing_cycle.status = (
        INVOICED_CYCLE_STATUS
    )

    db.flush()

    return billing_cycle


# ==========================================================
# Complete Successful Renewal
# ==========================================================


def complete_successful_renewal(
    db: Session,
    subscription: Subscription,
    invoice: Invoice,
) -> dict:
    """
    Complete successful renewal after payment.

    Flow:

        Invoice paid
            |
            v
        Usage finalized
            |
            v
        Old cycle renewed
            |
            v
        Subscription period advanced
            |
            v
        New active cycle created

    Idempotent.

    Calling this function again with the same invoice
    will NOT advance the subscription twice.
    """

    if not invoice.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invoice must be persisted before "
                "renewal."
            ),
        )

    if invoice.subscription_id != subscription.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invoice does not belong to the "
                "subscription being renewed."
            ),
        )

    invoice_status = _normalize_status(
        invoice.status
    )

    if invoice_status != INVOICE_PAID_STATUS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subscription renewal can only be "
                "completed after invoice payment."
            ),
        )

    # ------------------------------------------------------
    # Strong idempotency check
    # ------------------------------------------------------

    already_completed_cycle = (
        db.query(BillingCycle)
        .filter(
            BillingCycle.invoice_id
            == invoice.id,
            BillingCycle.status
            == RENEWED_CYCLE_STATUS,
        )
        .order_by(
            BillingCycle.id.desc()
        )
        .first()
    )

    if already_completed_cycle:

        finalize_usage_for_paid_invoice(
            db,
            invoice,
        )

        active_cycle = (
            get_active_billing_cycle(
                db,
                subscription.id,
            )
        )

        return {
            "renewed": True,
            "cancelled": False,
            "already_completed": True,
            "invoice": invoice,
            "billing_cycle": active_cycle,
            "subscription": subscription,
        }

    # ------------------------------------------------------
    # Current period
    # ------------------------------------------------------

    current_start = _as_utc(
        subscription.current_period_start
    )

    current_end = _as_utc(
        subscription.current_period_end
    )

    _validate_period(
        current_start,
        current_end,
    )

    # ------------------------------------------------------
    # Find current cycle
    # ------------------------------------------------------

    current_cycle = get_active_billing_cycle(
        db,
        subscription.id,
    )

    # ------------------------------------------------------
    # Fallback: invoice-associated cycle
    # ------------------------------------------------------

    if current_cycle is None:

        current_cycle = (
            get_billing_cycle_by_invoice(
                db,
                invoice.id,
            )
        )

    # ------------------------------------------------------
    # Cancel-at-period-end safety
    # ------------------------------------------------------

    if subscription.cancel_at_period_end:

        if current_cycle:

            current_cycle.invoice_id = (
                invoice.id
            )

            current_cycle.status = (
                RENEWED_CYCLE_STATUS
            )

        finalize_usage_for_paid_invoice(
            db,
            invoice,
        )

        try:

            cancellation_result = (
                state_machine_process_period_end(
                    db=db,
                    subscription=subscription,
                    user_id=None,
                    now=_now(),
                )
            )

        except SubscriptionLifecycleException:
            raise

        subscription.cancel_at_period_end = False

        db.flush()

        return {
            "renewed": False,
            "cancelled": True,
            "already_completed": False,
            "invoice": invoice,
            "billing_cycle": current_cycle,
            "subscription": subscription,
            "cancellation_result": (
                cancellation_result
            ),
        }

    # ------------------------------------------------------
    # Calculate next period
    # ------------------------------------------------------

    next_start = current_end

    next_end = _calculate_cycle_end(
        next_start,
        subscription.billing_cycle,
    )

    if next_end <= next_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unable to calculate the next "
                "billing period."
            ),
        )

    # ------------------------------------------------------
    # Mark old cycle renewed
    # ------------------------------------------------------

    if current_cycle:

        current_cycle.invoice_id = invoice.id
        current_cycle.status = (
            RENEWED_CYCLE_STATUS
        )

    else:

        current_cycle = create_billing_cycle(
            db=db,
            subscription=subscription,
            cycle_start=current_start,
            cycle_end=current_end,
            status_value=RENEWED_CYCLE_STATUS,
        )

        current_cycle.invoice_id = invoice.id

    # ------------------------------------------------------
    # Finalize usage
    # ------------------------------------------------------

    finalize_usage_for_paid_invoice(
        db,
        invoice,
    )

    # ------------------------------------------------------
    # Update subscription period
    # ------------------------------------------------------

    subscription.current_period_start = (
        next_start
    )

    subscription.current_period_end = (
        next_end
    )

    subscription.next_billing_date = (
        next_end
    )

    # ------------------------------------------------------
    # Ensure subscription is active
    # ------------------------------------------------------

    current_status = _normalize_status(
        subscription.status
    )

    if current_status in {
        SubscriptionStatus.PAST_DUE.value,
        SubscriptionStatus.TRIAL.value,
    }:

        subscription.status = (
            SubscriptionStatus.ACTIVE.value
        )

    # ------------------------------------------------------
    # Create next active cycle
    # ------------------------------------------------------

    next_cycle = get_billing_cycle_by_period(
        db=db,
        subscription_id=subscription.id,
        cycle_start=next_start,
        cycle_end=next_end,
    )

    if next_cycle is None:

        next_cycle = create_billing_cycle(
            db=db,
            subscription=subscription,
            cycle_start=next_start,
            cycle_end=next_end,
            status_value=ACTIVE_CYCLE_STATUS,
        )

    elif next_cycle.status != (
        ACTIVE_CYCLE_STATUS
    ):

        next_cycle.status = (
            ACTIVE_CYCLE_STATUS
        )

    db.flush()

    return {
        "renewed": True,
        "cancelled": False,
        "already_completed": False,
        "invoice": invoice,
        "billing_cycle": next_cycle,
        "subscription": subscription,
        "previous_billing_cycle": current_cycle,
    }


# ==========================================================
# Renew Subscription
# ==========================================================


def renew_subscription(
    db: Session,
    subscription: Subscription,
) -> dict:
    """
    Prepare subscription renewal.

    Creates/reuses renewal invoice.

    Payment is handled separately.

    This function NEVER advances the subscription.
    """

    now = _now()

    subscription_status = _normalize_status(
        subscription.status
    )

    # ------------------------------------------------------
    # Cancelled
    # ------------------------------------------------------

    if subscription_status == (
        SubscriptionStatus.CANCELLED.value
    ):

        return {
            "renewed": False,
            "cancelled": False,
            "invoice": None,
            "billing_cycle": (
                get_latest_billing_cycle(
                    db,
                    subscription.id,
                )
            ),
            "subscription": subscription,
            "reason": (
                "Subscription is cancelled."
            ),
        }

    # ------------------------------------------------------
    # Paused
    # ------------------------------------------------------

    if subscription_status == (
        SubscriptionStatus.PAUSED.value
    ):

        return {
            "renewed": False,
            "cancelled": False,
            "invoice": None,
            "billing_cycle": (
                get_active_billing_cycle(
                    db,
                    subscription.id,
                )
            ),
            "subscription": subscription,
            "reason": (
                "Subscription is paused."
            ),
        }

    # ------------------------------------------------------
    # Past due
    # ------------------------------------------------------

    if subscription_status == (
        SubscriptionStatus.PAST_DUE.value
    ):

        return {
            "renewed": False,
            "cancelled": False,
            "invoice": None,
            "billing_cycle": (
                get_active_billing_cycle(
                    db,
                    subscription.id,
                )
            ),
            "subscription": subscription,
            "reason": (
                "Subscription is past_due. "
                "Payment retry processing is required."
            ),
        }

    # ------------------------------------------------------
    # Current period
    # ------------------------------------------------------

    current_end = _as_utc(
        subscription.current_period_end
    )

    if current_end is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subscription does not have a "
                "current billing period."
            ),
        )

    if current_end > now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subscription billing period has "
                "not ended yet."
            ),
        )

    # ------------------------------------------------------
    # Current cycle
    # ------------------------------------------------------

    current_cycle = (
        get_active_billing_cycle(
            db,
            subscription.id,
        )
    )

    if current_cycle is None:

        current_cycle = (
            start_subscription_billing_cycle(
                db=db,
                subscription=subscription,
            )
        )

        db.flush()

    # ------------------------------------------------------
    # Cancel at period end
    # ------------------------------------------------------

    if subscription.cancel_at_period_end:

        try:

            cancellation_result = (
                state_machine_process_period_end(
                    db=db,
                    subscription=subscription,
                    user_id=None,
                    now=now,
                )
            )

        except SubscriptionLifecycleException:
            raise

        close_billing_cycle(
            db,
            current_cycle,
            CLOSED_CYCLE_STATUS,
        )

        db.flush()

        return {
            "renewed": False,
            "cancelled": True,
            "invoice": None,
            "billing_cycle": current_cycle,
            "subscription": subscription,
            "cancellation_result": (
                cancellation_result
            ),
        }

    # ------------------------------------------------------
    # Plan
    # ------------------------------------------------------

    plan = _get_subscription_plan(
        db,
        subscription,
    )

    # ------------------------------------------------------
    # Renewal invoice
    # ------------------------------------------------------

    invoice = create_renewal_invoice(
        db=db,
        subscription=subscription,
        plan=plan,
        billing_cycle=current_cycle,
    )

    db.flush()

    return {
        "renewed": False,
        "cancelled": False,
        "invoice": invoice,
        "billing_cycle": current_cycle,
        "subscription": subscription,
        "payment_required": True,
    }


# ==========================================================
# Process One Subscription
# ==========================================================


def process_subscription_billing_period(
    db: Session,
    subscription_id: int,
) -> dict:
    """
    Process one subscription whose billing period
    has ended.

    Creates or reuses the renewal invoice.
    """

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.id
            == subscription_id,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    try:

        result = renew_subscription(
            db=db,
            subscription=subscription,
        )

        db.commit()
        db.refresh(subscription)

        return result

    except HTTPException:

        db.rollback()
        raise

    except SubscriptionLifecycleException:

        db.rollback()
        raise

    except Exception:

        db.rollback()
        raise


# ==========================================================
# Process Due Subscriptions
# ==========================================================


def process_due_subscriptions(
    db: Session,
    limit: int = 100,
) -> list[dict]:
    """
    Process subscriptions whose billing period has ended.

    Only:

        trial
        active

    subscriptions are selected.

    past_due subscriptions belong to dunning/retry.
    """

    if limit < 1:
        limit = 1

    if limit > 1000:
        limit = 1000

    now = _now()

    subscriptions = (
        db.query(Subscription)
        .filter(
            Subscription.current_period_end.isnot(None),
            Subscription.current_period_end <= now,
            Subscription.status.in_(
                [
                    SubscriptionStatus.TRIAL.value,
                    SubscriptionStatus.ACTIVE.value,
                ]
            ),
        )
        .order_by(
            Subscription.id.asc()
        )
        .limit(limit)
        .all()
    )

    results: list[dict] = []

    for subscription in subscriptions:

        try:

            result = renew_subscription(
                db=db,
                subscription=subscription,
            )

            db.commit()
            db.refresh(subscription)

            invoice = result.get(
                "invoice"
            )

            billing_cycle = result.get(
                "billing_cycle"
            )

            results.append(
                {
                    "subscription_id": (
                        subscription.id
                    ),
                    "success": True,
                    "renewed": result.get(
                        "renewed",
                        False,
                    ),
                    "cancelled": result.get(
                        "cancelled",
                        False,
                    ),
                    "payment_required": result.get(
                        "payment_required",
                        False,
                    ),
                    "invoice_id": (
                        invoice.id
                        if invoice
                        else None
                    ),
                    "billing_cycle_id": (
                        billing_cycle.id
                        if billing_cycle
                        else None
                    ),
                    "reason": result.get(
                        "reason"
                    ),
                }
            )

        except Exception as exc:

            db.rollback()

            results.append(
                {
                    "subscription_id": (
                        subscription.id
                    ),
                    "success": False,
                    "renewed": False,
                    "cancelled": False,
                    "payment_required": False,
                    "invoice_id": None,
                    "billing_cycle_id": None,
                    "error": str(exc),
                }
            )

    return results


# ==========================================================
# Initialize Existing Subscription
# ==========================================================


def initialize_subscription_billing_cycle(
    db: Session,
    subscription_id: int,
) -> BillingCycle:
    """
    Initialize billing-cycle information for an
    existing subscription.
    """

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.id
            == subscription_id,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    try:

        cycle = start_subscription_billing_cycle(
            db=db,
            subscription=subscription,
        )

        db.commit()

        db.refresh(subscription)
        db.refresh(cycle)

        return cycle

    except Exception:

        db.rollback()
        raise


# ==========================================================
# Synchronize Billing Metadata
# ==========================================================


def synchronize_subscription_billing_period(
    db: Session,
    subscription: Subscription,
) -> Subscription:
    """
    Synchronize subscription period fields with
    active billing cycle.
    """

    cycle = get_active_billing_cycle(
        db,
        subscription.id,
    )

    if not cycle:

        cycle = start_subscription_billing_cycle(
            db=db,
            subscription=subscription,
        )

    else:

        subscription.current_period_start = (
            _as_utc(
                cycle.cycle_start
            )
        )

        subscription.current_period_end = (
            _as_utc(
                cycle.cycle_end
            )
        )

        subscription.next_billing_date = (
            _as_utc(
                cycle.cycle_end
            )
        )

    db.flush()

    return subscription


# ==========================================================
# Billing Cycle History
# ==========================================================


def list_billing_cycles(
    db: Session,
    subscription_id: int,
) -> list[BillingCycle]:
    """
    Return complete billing-cycle history.
    """

    subscription_exists = (
        db.query(Subscription.id)
        .filter(
            Subscription.id
            == subscription_id,
        )
        .first()
    )

    if not subscription_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    return (
        db.query(BillingCycle)
        .filter(
            BillingCycle.subscription_id
            == subscription_id,
        )
        .order_by(
            BillingCycle.id.desc()
        )
        .all()
    )


# ==========================================================
# Billing Cycle Statistics
# ==========================================================


def get_billing_cycle_summary(
    db: Session,
    subscription_id: int,
) -> dict:
    """
    Return billing-cycle summary for a subscription.
    """

    cycles = list_billing_cycles(
        db,
        subscription_id,
    )

    return {
        "subscription_id": subscription_id,
        "total_cycles": len(cycles),
        "active_cycles": sum(
            1
            for cycle in cycles
            if cycle.status
            == ACTIVE_CYCLE_STATUS
        ),
        "invoiced_cycles": sum(
            1
            for cycle in cycles
            if cycle.status
            == INVOICED_CYCLE_STATUS
        ),
        "renewed_cycles": sum(
            1
            for cycle in cycles
            if cycle.status
            == RENEWED_CYCLE_STATUS
        ),
        "closed_cycles": sum(
            1
            for cycle in cycles
            if cycle.status
            == CLOSED_CYCLE_STATUS
        ),
        "latest_cycle_id": (
            cycles[0].id
            if cycles
            else None
        ),
    }


# ==========================================================
# Find Subscription Billing Status
# ==========================================================


def get_subscription_billing_status(
    db: Session,
    subscription: Subscription,
) -> dict:
    """
    Return live billing information for a subscription.
    """

    active_cycle = get_active_billing_cycle(
        db,
        subscription.id,
    )

    latest_cycle = get_latest_billing_cycle(
        db,
        subscription.id,
    )

    return {
        "subscription_id": subscription.id,
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "current_period_start": (
            _as_utc(
                subscription.current_period_start
            )
        ),
        "current_period_end": (
            _as_utc(
                subscription.current_period_end
            )
        ),
        "next_billing_date": (
            _as_utc(
                subscription.next_billing_date
            )
        ),
        "cancel_at_period_end": (
            subscription.cancel_at_period_end
        ),
        "cancelled_at": (
            _as_utc(
                subscription.cancelled_at
            )
        ),
        "active_cycle_id": (
            active_cycle.id
            if active_cycle
            else None
        ),
        "latest_cycle_id": (
            latest_cycle.id
            if latest_cycle
            else None
        ),
        "active_cycle_status": (
            active_cycle.status
            if active_cycle
            else None
        ),
    }


# ==========================================================
# Validate Billing Cycle Integrity
# ==========================================================


def validate_billing_cycle_integrity(
    db: Session,
    subscription: Subscription,
) -> dict:
    """
    Validate consistency between subscription billing
    metadata and its active billing cycle.

    Useful for admin diagnostics and scheduler checks.
    """

    cycle = get_active_billing_cycle(
        db,
        subscription.id,
    )

    if not cycle:

        return {
            "valid": False,
            "subscription_id": subscription.id,
            "reason": (
                "No active billing cycle exists."
            ),
        }

    subscription_start = _as_utc(
        subscription.current_period_start
    )

    subscription_end = _as_utc(
        subscription.current_period_end
    )

    cycle_start = _as_utc(
        cycle.cycle_start
    )

    cycle_end = _as_utc(
        cycle.cycle_end
    )

    start_matches = (
        subscription_start
        == cycle_start
    )

    end_matches = (
        subscription_end
        == cycle_end
    )

    next_billing_matches = (
        _as_utc(
            subscription.next_billing_date
        )
        == cycle_end
    )

    valid = (
        start_matches
        and end_matches
        and next_billing_matches
    )

    return {
        "valid": valid,
        "subscription_id": subscription.id,
        "active_cycle_id": cycle.id,
        "start_matches": start_matches,
        "end_matches": end_matches,
        "next_billing_matches": (
            next_billing_matches
        ),
        "subscription_period_start": (
            subscription_start
        ),
        "subscription_period_end": (
            subscription_end
        ),
        "cycle_start": cycle_start,
        "cycle_end": cycle_end,
    }


# ==========================================================
# Repair Billing Metadata
# ==========================================================


def repair_subscription_billing_metadata(
    db: Session,
    subscription_id: int,
) -> Subscription:
    """
    Repair subscription billing metadata from its active
    billing cycle.

    If no active cycle exists, initialize one.
    """

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.id
            == subscription_id,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    cycle = get_active_billing_cycle(
        db,
        subscription.id,
    )

    if cycle:

        subscription.current_period_start = (
            _as_utc(
                cycle.cycle_start
            )
        )

        subscription.current_period_end = (
            _as_utc(
                cycle.cycle_end
            )
        )

        subscription.next_billing_date = (
            _as_utc(
                cycle.cycle_end
            )
        )

    else:

        start_subscription_billing_cycle(
            db=db,
            subscription=subscription,
        )

    db.flush()

    return subscription


# ==========================================================
# Scheduler Compatibility Wrapper
# ==========================================================


def renew_subscription_billing_period(
    db: Session,
    subscription_id: int,
) -> dict:
    """
    Scheduler-facing billing entry point.

    This function intentionally creates the renewal invoice
    but does not automatically mark it paid.

    Payment processing must be handled by the payment layer.
    """

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.id
            == subscription_id,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    try:

        result = renew_subscription(
            db=db,
            subscription=subscription,
        )

        db.commit()
        db.refresh(subscription)

        return result

    except HTTPException:

        db.rollback()
        raise

    except SubscriptionLifecycleException:

        db.rollback()
        raise

    except Exception:

        db.rollback()
        raise


# ==========================================================
# Scheduler Batch Wrapper
# ==========================================================


def process_billing_cycle_scheduler_job(
    db: Session,
    limit: int = 100,
) -> list[dict]:
    """
    Scheduler-compatible batch entry point.

    Intended for APScheduler/Celery integration.

    The scheduler can safely call this repeatedly because
    renewal invoice creation is idempotent.
    """

    return process_due_subscriptions(
        db=db,
        limit=limit,
    )


# ==========================================================
# Renewal Completion Wrapper
# ==========================================================


def complete_invoice_renewal(
    db: Session,
    invoice_id: int,
) -> dict:
    """
    Complete a renewal from a paid invoice.

    Intended for payment-service/webhook integration.
    """

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    if not invoice.subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invoice is not associated with "
                "a subscription."
            ),
        )

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.id
            == invoice.subscription_id,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    try:

        result = complete_successful_renewal(
            db=db,
            subscription=subscription,
            invoice=invoice,
        )

        db.commit()

        db.refresh(subscription)
        db.refresh(invoice)

        return result

    except HTTPException:

        db.rollback()
        raise

    except SubscriptionLifecycleException:

        db.rollback()
        raise

    except Exception:

        db.rollback()
        raise


# ==========================================================
# Invoice Failure Handler
# ==========================================================


def handle_failed_renewal_invoice(
    db: Session,
    invoice_id: int,
) -> dict:
    """
    Handle a failed renewal invoice.

    This function does not create a new billing cycle.

    The payment/dunning layer is responsible for retry logic.
    """

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found.",
        )

    invoice.status = (
        INVOICE_FAILED_STATUS
    )

    subscription = None

    if invoice.subscription_id:

        subscription = (
            db.query(Subscription)
            .filter(
                Subscription.id
                == invoice.subscription_id,
            )
            .first()
        )

    cycle = (
        get_billing_cycle_by_invoice(
            db,
            invoice.id,
        )
    )

    db.flush()

    return {
        "invoice": invoice,
        "subscription": subscription,
        "billing_cycle": cycle,
        "payment_failed": True,
        "retry_required": True,
    }


# ==========================================================
# Reuse Existing Pending Invoice
# ==========================================================


def get_pending_renewal_invoice(
    db: Session,
    subscription_id: int,
) -> Invoice | None:
    """
    Return the latest pending renewal invoice for
    a subscription.
    """

    return (
        db.query(Invoice)
        .filter(
            Invoice.subscription_id
            == subscription_id,
            Invoice.status
            == INVOICE_PENDING_STATUS,
        )
        .order_by(
            Invoice.id.desc()
        )
        .first()
    )


# ==========================================================
# Billing Cycle Health Check
# ==========================================================


def billing_cycle_health_check(
    db: Session,
    subscription_id: int,
) -> dict:
    """
    Perform a complete billing-cycle health check.
    """

    subscription = (
        db.query(Subscription)
        .filter(
            Subscription.id
            == subscription_id,
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found.",
        )

    integrity = (
        validate_billing_cycle_integrity(
            db,
            subscription,
        )
    )

    active_cycle = (
        get_active_billing_cycle(
            db,
            subscription.id,
        )
    )

    pending_invoice = (
        get_pending_renewal_invoice(
            db,
            subscription.id,
        )
    )

    return {
        "healthy": integrity["valid"],
        "subscription_id": subscription.id,
        "subscription_status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "active_cycle_id": (
            active_cycle.id
            if active_cycle
            else None
        ),
        "pending_invoice_id": (
            pending_invoice.id
            if pending_invoice
            else None
        ),
        "integrity": integrity,
    }