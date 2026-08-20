"""
BillSphere Tax Service

Extensible, country-aware tax calculation engine.

Currently implements:
- India GST (CGST + SGST for intra-state, IGST for inter-state)

To add a new country, register a calculator in TAX_CALCULATORS.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from decimal import Decimal, ROUND_HALF_UP
from typing import Callable
from app.core.config import settings

TWO_PLACES = Decimal("0.01")


def _round(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


@dataclass(slots=True)
class TaxBreakdown:
    taxable_amount: Decimal
    tax_rate_percent: Decimal
    cgst: Decimal
    sgst: Decimal
    igst: Decimal
    total_tax: Decimal
    total_amount: Decimal

    def as_dict(self) -> dict:
        return {
            "taxable_amount": self.taxable_amount,
            "tax_rate_percent": self.tax_rate_percent,
            "cgst": self.cgst,
            "sgst": self.sgst,
            "igst": self.igst,
            "total_tax": self.total_tax,
            "total_amount": self.total_amount,
        }


def calculate_india_gst(
    amount: Decimal,
    tax_rate_percent: Decimal = Decimal("18.00"),
    same_state: bool = True,
) -> TaxBreakdown:
    """
    India GST calculation.

    same_state=True  -> CGST + SGST split evenly
    same_state=False -> IGST (full rate, no split)
    """

    amount = Decimal(amount)
    rate = Decimal(str(tax_rate_percent))

    total_tax = _round(amount * rate / Decimal("100"))

    if same_state:
        half = _round(total_tax / Decimal("2"))
        cgst = half
        sgst = total_tax - half  # avoids rounding drift
        igst = Decimal("0.00")
    else:
        cgst = Decimal("0.00")
        sgst = Decimal("0.00")
        igst = total_tax

    total_amount = _round(amount + total_tax)

    return TaxBreakdown(
        taxable_amount=amount,
        tax_rate_percent=rate,
        cgst=cgst,
        sgst=sgst,
        igst=igst,
        total_tax=total_tax,
        total_amount=total_amount,
    )


def calculate_flat_tax(
    amount: Decimal,
    tax_rate_percent: Decimal = Decimal("0.00"),
) -> TaxBreakdown:
    """
    Simple flat-rate tax (fallback for countries without a
    dedicated calculator yet).
    """

    amount = Decimal(amount)
    rate = Decimal(str(tax_rate_percent))

    total_tax = _round(amount * rate / Decimal("100"))
    total_amount = _round(amount + total_tax)

    return TaxBreakdown(
        taxable_amount=amount,
        tax_rate_percent=rate,
        cgst=Decimal("0.00"),
        sgst=Decimal("0.00"),
        igst=total_tax,
        total_tax=total_tax,
        total_amount=total_amount,
    )


# ==========================================================
# Country Registry — add new countries here
# ==========================================================

TAX_CALCULATORS: dict[str, Callable[..., TaxBreakdown]] = {
    "IN": calculate_india_gst,
}


def calculate_tax(
    amount: Decimal,
    country_code: str = "IN",
    tax_rate_percent: Decimal | None = None,
    same_state: bool = True,
) -> TaxBreakdown:
    """
    Calculate tax using a configurable country-rate registry.

    TAX_RATES_JSON can be changed without changing application code.
    Explicit tax_rate_percent always wins.
    """
    country = str(country_code or "IN").upper()
    rate = tax_rate_percent

    if rate is None:
        try:
            configured = json.loads(getattr(settings, "TAX_RATES_JSON", "{}"))
            rate = Decimal(str(configured.get(country, 0.0)))
        except (TypeError, ValueError, json.JSONDecodeError):
            rate = Decimal(str(getattr(settings, "TAX_PERCENTAGE", 18.0)))

    calculator = TAX_CALCULATORS.get(country)
    if calculator is calculate_india_gst:
        return calculator(
            Decimal(str(amount)),
            tax_rate_percent=Decimal(str(rate)),
            same_state=same_state,
        )
    if calculator:
        return calculator(
            Decimal(str(amount)),
            tax_rate_percent=Decimal(str(rate)),
        )
    return calculate_flat_tax(
        Decimal(str(amount)),
        tax_rate_percent=Decimal(str(rate)),
    )

