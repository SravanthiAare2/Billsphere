"""
BillSphere Billing Cycle Service Tests

Tests:
- Monthly billing date calculation
- Yearly billing date calculation
- Month-end edge case handling
- Billing period initialization
- Billing period renewal
"""

from datetime import datetime, timezone

import pytest

from app.services.billing_cycle_service import (
    add_months,
    add_years,
    calculate_billing_period,
    calculate_next_billing_date,
    initialize_billing_period,
    renew_subscription_billing_period,
)


class DummySubscription:
    """
    Minimal stand-in object with the attributes the
    billing cycle service reads/writes, so these tests
    don't require a database.
    """

    def __init__(self, start_date, billing_cycle="monthly"):
        self.id = 1
        self.start_date = start_date
        self.billing_cycle = billing_cycle
        self.current_period_start = None
        self.current_period_end = None
        self.next_billing_date = None


# ==========================================================
# add_months Tests
# ==========================================================

def test_add_months_regular():
    start = datetime(2026, 8, 12, tzinfo=timezone.utc)
    result = add_months(start, 1)

    assert result.year == 2026
    assert result.month == 9
    assert result.day == 12


def test_add_months_month_end_edge_case():
    """
    Jan 31 + 1 month should safely land on Feb 28 (non-leap year).
    """

    start = datetime(2027, 1, 31, tzinfo=timezone.utc)
    result = add_months(start, 1)

    assert result.month == 2
    assert result.day == 28


# ==========================================================
# add_years Tests
# ==========================================================

def test_add_years_regular():
    start = datetime(2026, 8, 12, tzinfo=timezone.utc)
    result = add_years(start, 1)

    assert result.year == 2027
    assert result.month == 8
    assert result.day == 12


def test_add_years_leap_day():
    """
    Feb 29 + 1 year on a non-leap target year should fall
    back to Feb 28.
    """

    start = datetime(2028, 2, 29, tzinfo=timezone.utc)
    result = add_years(start, 1)

    assert result.month == 2
    assert result.day == 28


# ==========================================================
# calculate_next_billing_date Tests
# ==========================================================

def test_calculate_next_billing_date_monthly():
    start = datetime(2026, 8, 12, tzinfo=timezone.utc)
    result = calculate_next_billing_date(start, "monthly")

    assert result.month == 9


def test_calculate_next_billing_date_yearly():
    start = datetime(2026, 8, 12, tzinfo=timezone.utc)
    result = calculate_next_billing_date(start, "yearly")

    assert result.year == 2027


def test_calculate_next_billing_date_unsupported_cycle():
    start = datetime(2026, 8, 12, tzinfo=timezone.utc)

    with pytest.raises(ValueError):
        calculate_next_billing_date(start, "weekly")


# ==========================================================
# calculate_billing_period Tests
# ==========================================================

def test_calculate_billing_period_monthly():
    start = datetime(2026, 8, 12, tzinfo=timezone.utc)
    period_start, period_end = calculate_billing_period(start, "monthly")

    assert period_start == start
    assert period_end.month == 9


# ==========================================================
# initialize_billing_period Tests
# ==========================================================

def test_initialize_billing_period_sets_fields():
    subscription = DummySubscription(
        start_date=datetime(2026, 8, 12, tzinfo=timezone.utc),
        billing_cycle="monthly",
    )

    initialize_billing_period(subscription)

    assert subscription.current_period_start is not None
    assert subscription.current_period_end is not None
    assert subscription.next_billing_date == subscription.current_period_end


# ==========================================================
# renew_subscription_billing_period Tests
# ==========================================================

def test_renew_subscription_billing_period_advances_dates():
    subscription = DummySubscription(
        start_date=datetime(2026, 8, 12, tzinfo=timezone.utc),
        billing_cycle="monthly",
    )

    initialize_billing_period(subscription)

    old_end = subscription.current_period_end

    new_start, new_end = renew_subscription_billing_period(subscription)

    assert new_start == old_end
    assert new_end > new_start
    assert subscription.current_period_start == new_start
    assert subscription.current_period_end == new_end
    assert subscription.next_billing_date == new_end