"""
BillSphere Billing Cycle Service Tests

These tests are aligned with the current billing-cycle service API.
They intentionally test the pure date/normalization helpers without
requiring a live PostgreSQL database.

The database-backed renewal flow is exercised by the integration billing
and payment tests in the test suite.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.services.billing_cycle_service import (
    _add_months,
    _as_utc,
    _calculate_cycle_end,
    _normalize_billing_cycle,
    _normalize_status,
    _validate_period,
)


UTC = timezone.utc


# ==========================================================
# _as_utc
# ==========================================================


def test_as_utc_preserves_aware_datetime():
    value = datetime(2026, 8, 12, 10, 30, tzinfo=UTC)

    result = _as_utc(value)

    assert result == value
    assert result.tzinfo == UTC


def test_as_utc_attaches_utc_to_naive_datetime():
    value = datetime(2026, 8, 12, 10, 30)

    result = _as_utc(value)

    assert result is not None
    assert result.tzinfo == UTC
    assert result.replace(tzinfo=None) == value


def test_as_utc_none():
    assert _as_utc(None) is None


# ==========================================================
# _add_months
# ==========================================================


def test_add_months_regular():
    start = datetime(2026, 8, 12, tzinfo=UTC)

    result = _add_months(start, 1)

    assert result.year == 2026
    assert result.month == 9
    assert result.day == 12
    assert result.tzinfo == UTC


def test_add_months_month_end_non_leap_year():
    """January 31 + 1 month should safely become February 28."""

    start = datetime(2027, 1, 31, tzinfo=UTC)

    result = _add_months(start, 1)

    assert result.year == 2027
    assert result.month == 2
    assert result.day == 28


def test_add_months_month_end_leap_year():
    """January 31 + 1 month in a leap year should become February 29."""

    start = datetime(2028, 1, 31, tzinfo=UTC)

    result = _add_months(start, 1)

    assert result.year == 2028
    assert result.month == 2
    assert result.day == 29


def test_add_months_multiple_months():
    start = datetime(2026, 10, 31, tzinfo=UTC)

    result = _add_months(start, 3)

    assert result.year == 2027
    assert result.month == 1
    assert result.day == 31


def test_add_months_zero_returns_same_calendar_value():
    start = datetime(2026, 8, 12, 15, 45, tzinfo=UTC)

    result = _add_months(start, 0)

    assert result == start


# ==========================================================
# _calculate_cycle_end
# ==========================================================


def test_calculate_cycle_end_daily():
    start = datetime(2026, 8, 12, tzinfo=UTC)

    result = _calculate_cycle_end(start, "daily")

    assert result == start + timedelta(days=1)


def test_calculate_cycle_end_weekly():
    start = datetime(2026, 8, 12, tzinfo=UTC)

    result = _calculate_cycle_end(start, "weekly")

    assert result == start + timedelta(days=7)


def test_calculate_cycle_end_monthly():
    start = datetime(2026, 8, 12, tzinfo=UTC)

    result = _calculate_cycle_end(start, "monthly")

    assert result.year == 2026
    assert result.month == 9
    assert result.day == 12


def test_calculate_cycle_end_quarterly():
    start = datetime(2026, 8, 12, tzinfo=UTC)

    result = _calculate_cycle_end(start, "quarterly")

    assert result.year == 2026
    assert result.month == 11
    assert result.day == 12


def test_calculate_cycle_end_yearly():
    start = datetime(2026, 8, 12, tzinfo=UTC)

    result = _calculate_cycle_end(start, "yearly")

    assert result.year == 2027
    assert result.month == 8
    assert result.day == 12


def test_calculate_cycle_end_annual_alias():
    start = datetime(2026, 8, 12, tzinfo=UTC)

    result = _calculate_cycle_end(start, "annual")

    assert result.year == 2027
    assert result.month == 8
    assert result.day == 12


def test_calculate_cycle_end_month_end():
    start = datetime(2027, 1, 31, tzinfo=UTC)

    result = _calculate_cycle_end(start, "monthly")

    assert result == datetime(2027, 2, 28, tzinfo=UTC)


# ==========================================================
# Billing-cycle normalization
# ==========================================================


def test_normalize_billing_cycle_case_and_whitespace():
    assert _normalize_billing_cycle("  MONTHLY ") == "monthly"
    assert _normalize_billing_cycle("YEARLY") == "yearly"
    assert _normalize_billing_cycle(" Annual ") == "annual"


def test_normalize_billing_cycle_defaults_to_monthly():
    assert _normalize_billing_cycle(None) == "monthly"
    assert _normalize_billing_cycle("") == "monthly"


def test_normalize_billing_cycle_unsupported_defaults_to_monthly():
    assert _normalize_billing_cycle("biweekly") == "monthly"


# ==========================================================
# Status normalization
# ==========================================================


def test_normalize_status():
    assert _normalize_status(" ACTIVE ") == "active"
    assert _normalize_status(None) == ""
    assert _normalize_status(123) == "123"


# ==========================================================
# Billing-period validation
# ==========================================================


def test_validate_period_returns_normalized_utc_values():
    start = datetime(2026, 8, 1, tzinfo=UTC)
    end = datetime(2026, 9, 1, tzinfo=UTC)

    result_start, result_end = _validate_period(start, end)

    assert result_start == start
    assert result_end == end
    assert result_start.tzinfo == UTC
    assert result_end.tzinfo == UTC


def test_validate_period_rejects_missing_start():
    end = datetime(2026, 9, 1, tzinfo=UTC)

    with pytest.raises(HTTPException) as exc_info:
        _validate_period(None, end)

    assert exc_info.value.status_code == 400
    assert "start date is required" in str(exc_info.value.detail).lower()


def test_validate_period_rejects_missing_end():
    start = datetime(2026, 8, 1, tzinfo=UTC)

    with pytest.raises(HTTPException) as exc_info:
        _validate_period(start, None)

    assert exc_info.value.status_code == 400
    assert "end date is required" in str(exc_info.value.detail).lower()


def test_validate_period_rejects_equal_dates():
    value = datetime(2026, 8, 1, tzinfo=UTC)

    with pytest.raises(HTTPException) as exc_info:
        _validate_period(value, value)

    assert exc_info.value.status_code == 400
    assert "after the start date" in str(exc_info.value.detail).lower()


def test_validate_period_rejects_end_before_start():
    start = datetime(2026, 9, 1, tzinfo=UTC)
    end = datetime(2026, 8, 1, tzinfo=UTC)

    with pytest.raises(HTTPException) as exc_info:
        _validate_period(start, end)

    assert exc_info.value.status_code == 400
    assert "after the start date" in str(exc_info.value.detail).lower()