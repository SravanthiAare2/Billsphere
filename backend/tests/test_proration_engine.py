from decimal import Decimal

import pytest

from app.services.proration_service import calculate_proration, calculate_prorated_amount
from app.services.tax_service import calculate_india_gst


def test_prorated_amount():
    assert calculate_prorated_amount(Decimal("999"), 15, 30) == Decimal("499.50")


def test_upgrade_proration():
    result = calculate_proration(Decimal("999"), Decimal("1999"), 15, 30)
    assert result["old_credit"] == Decimal("499.50")
    assert result["new_charge"] == Decimal("999.50")
    assert result["net_amount"] == Decimal("500.00")
    assert result["direction"] == "charge"


def test_downgrade_proration():
    result = calculate_proration(Decimal("1999"), Decimal("999"), 15, 30)
    assert result["net_amount"] == Decimal("-500.00")
    assert result["direction"] == "credit"


def test_zero_remaining_days():
    assert calculate_prorated_amount(Decimal("999"), 0, 30) == Decimal("0.00")


def test_india_gst_split():
    result = calculate_india_gst(Decimal("999"), Decimal("18"), same_state=True)
    assert result.cgst == Decimal("89.91")
    assert result.sgst == Decimal("89.91")
    assert result.total_tax == Decimal("179.82")
    assert result.total_amount == Decimal("1178.82")


def test_invalid_total_days():
    with pytest.raises(ValueError):
        calculate_prorated_amount(Decimal("999"), 10, 0)
