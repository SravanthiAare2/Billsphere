"""
BillSphere Tax Service Tests

Tests:
- India GST same-state split (CGST + SGST)
- India GST inter-state (IGST)
- Flat tax fallback for unregistered countries
- Rounding behavior
"""

from decimal import Decimal

from app.services.tax_service import (
    calculate_flat_tax,
    calculate_india_gst,
    calculate_tax,
)


def test_india_gst_same_state_splits_evenly():
    result = calculate_india_gst(
        Decimal("1000.00"),
        tax_rate_percent=Decimal("18.00"),
        same_state=True,
    )

    assert result.total_tax == Decimal("180.00")
    assert result.cgst == Decimal("90.00")
    assert result.sgst == Decimal("90.00")
    assert result.igst == Decimal("0.00")
    assert result.total_amount == Decimal("1180.00")


def test_india_gst_inter_state_uses_igst():
    result = calculate_india_gst(
        Decimal("1000.00"),
        tax_rate_percent=Decimal("18.00"),
        same_state=False,
    )

    assert result.igst == Decimal("180.00")
    assert result.cgst == Decimal("0.00")
    assert result.sgst == Decimal("0.00")


def test_flat_tax_calculation():
    result = calculate_flat_tax(
        Decimal("500.00"),
        tax_rate_percent=Decimal("10.00"),
    )

    assert result.total_tax == Decimal("50.00")
    assert result.total_amount == Decimal("550.00")


def test_calculate_tax_dispatches_to_india_gst():
    result = calculate_tax(
        Decimal("999.00"),
        country_code="IN",
        tax_rate_percent=Decimal("18.00"),
    )

    assert result.cgst > Decimal("0.00")
    assert result.sgst > Decimal("0.00")


def test_calculate_tax_falls_back_for_unknown_country():
    result = calculate_tax(
        Decimal("1000.00"),
        country_code="ZZ",
        tax_rate_percent=Decimal("5.00"),
    )

    assert result.total_tax == Decimal("50.00")
    assert result.cgst == Decimal("0.00")
    assert result.sgst == Decimal("0.00")


def test_zero_amount_produces_zero_tax():
    result = calculate_india_gst(Decimal("0.00"))

    assert result.total_tax == Decimal("0.00")
    assert result.total_amount == Decimal("0.00")