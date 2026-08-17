"""
BillSphere Proration Engine

Pure, deterministic proration calculations used by subscription
plan changes and refund/credit workflows.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


CENT = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def calculate_prorated_amount(
    plan_price: Decimal,
    remaining_days: int,
    total_days: int,
) -> Decimal:
    if total_days <= 0:
        raise ValueError("total_days must be greater than zero")
    if remaining_days <= 0:
        return Decimal("0.00")
    remaining_days = min(remaining_days, total_days)
    return _money(
        Decimal(str(plan_price))
        * Decimal(remaining_days)
        / Decimal(total_days)
    )


def calculate_proration(
    old_plan_price: Decimal,
    new_plan_price: Decimal,
    remaining_days: int,
    total_days: int,
) -> dict:
    """Return old-plan credit, new-plan charge and net adjustment."""
    old_credit = calculate_prorated_amount(
        old_plan_price, remaining_days, total_days
    )
    new_charge = calculate_prorated_amount(
        new_plan_price, remaining_days, total_days
    )
    net = _money(new_charge - old_credit)
    return {
        "old_credit": old_credit,
        "new_charge": new_charge,
        "net_amount": net,
        "direction": (
            "charge" if net > 0 else
            "credit" if net < 0 else
            "none"
        ),
    }
