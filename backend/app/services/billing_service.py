"""
BillSphere Billing Calculations

Compatibility helpers retained for existing callers. The dedicated
proration engine lives in app.services.proration_service.
"""

from decimal import Decimal

from app.services.proration_service import calculate_proration as _calculate_proration, calculate_prorated_amount


def calculate_tax(amount: Decimal, tax_percentage: float = 18.0) -> Decimal:
    return (
        Decimal(str(amount))
        * Decimal(str(tax_percentage))
        / Decimal("100")
    ).quantize(Decimal("0.01"))


def calculate_total_amount(amount: Decimal, tax: Decimal) -> Decimal:
    return (Decimal(str(amount)) + Decimal(str(tax))).quantize(Decimal("0.01"))


def calculate_proration(
    monthly_price: Decimal,
    remaining_days: int,
    total_days: int = 30,
) -> Decimal:
    return calculate_prorated_amount(
        monthly_price,
        remaining_days,
        total_days,
    )


def calculate_subscription_renewal(
    plan_price: Decimal,
    tax_percentage: float = 18.0,
) -> dict:
    tax = calculate_tax(plan_price, tax_percentage)
    total = calculate_total_amount(plan_price, tax)
    return {"amount": Decimal(str(plan_price)), "tax": tax, "total": total}
