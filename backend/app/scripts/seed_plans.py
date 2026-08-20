"""
BillSphere Platform Plan Seeder

FINAL PLAN CATALOG
==================

53 approved platforms
3 plan tiers
2 billing cycles
318 total active plans

------------------------------------------------------------
BASIC
------------------------------------------------------------

Monthly:
    Price        : ₹199
    Trial        : 7 days
    Customers    : 100
    Invoices     : 500

Yearly:
    Price        : ₹1,999
    Trial        : 14 days
    Customers    : 250
    Invoices     : 1,500

------------------------------------------------------------
STANDARD
------------------------------------------------------------

Monthly:
    Price        : ₹399
    Trial        : 14 days
    Customers    : 1,000
    Invoices     : 5,000

Yearly:
    Price        : ₹3,999
    Trial        : 30 days
    Customers    : 2,500
    Invoices     : 15,000

------------------------------------------------------------
PREMIUM
------------------------------------------------------------

Monthly:
    Price        : ₹599
    Trial        : 30 days
    Customers    : 10,000
    Invoices     : 50,000

Yearly:
    Price        : ₹5,999
    Trial        : 45 days
    Customers    : 25,000
    Invoices     : 150,000

------------------------------------------------------------

The seeder is:

- Idempotent
- Safe to run multiple times
- Duplicate-safe by:
      platform + plan name + billing cycle
- Compatible with the existing Plan model
- Does not delete unrelated plans
- Reactivates matching inactive plans
- Updates existing matching plans
- Creates missing monthly/yearly plans
- Deactivates old active plans outside the final catalog
- Validates exactly 318 active plans
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.plan import Plan


# ============================================================
# PLATFORM CATALOG
# ============================================================

PLATFORMS = [
    # --------------------------------------------------------
    # CLOUD / SOFTWARE / BUSINESS — 15
    # --------------------------------------------------------

    "Adobe",
    "Adobe Creative Cloud",
    "Amazon Web Services",
    "Alibaba Cloud",
    "Apple App Store",
    "Google Play Store",
    "Google Cloud",
    "Microsoft Store",
    "Salesforce",
    "HubSpot",
    "Shopify",
    "Shopify Plus",
    "Squarespace Commerce",
    "Webflow Ecommerce",
    "WooCommerce",

    # --------------------------------------------------------
    # MAJOR MARKETPLACES — 19
    # --------------------------------------------------------

    "Amazon",
    "Amazon Business",
    "Amazon Marketplace",
    "AliExpress",
    "eBay",
    "Etsy",
    "Flipkart",
    "Meesho",
    "Myntra",
    "Walmart",
    "Walmart Marketplace",
    "Mercado Libre",
    "Shopee",
    "Lazada",
    "Rakuten",
    "Temu",
    "Taobao",
    "Tmall",
    "Tokopedia",

    # --------------------------------------------------------
    # RETAIL / FASHION — 9
    # --------------------------------------------------------

    "Nike",
    "H&M",
    "ASOS",
    "SHEIN",
    "IKEA",
    "Best Buy",
    "Costco",
    "Target",
    "Macy's",

    # --------------------------------------------------------
    # ENTERTAINMENT / GAMING — 4
    # --------------------------------------------------------

    "Netflix",
    "Spotify",
    "Epic Games Store",
    "Roblox Marketplace",

    # --------------------------------------------------------
    # FOOD / DELIVERY — 3
    # --------------------------------------------------------

    "Swiggy",
    "Uber Eats",
    "Zomato",

    # --------------------------------------------------------
    # SOCIAL COMMERCE — 3
    # --------------------------------------------------------

    "Instagram Shop",
    "Facebook Marketplace",
    "TikTok Shop",
]


# ============================================================
# COMMON FEATURE SETS
# ============================================================

BASIC_MONTHLY_FEATURES = {
    "customer_management": True,
    "subscription_management": True,
    "basic_billing": True,
    "invoice_generation": True,
    "payment_tracking": True,
    "email_notifications": True,
    "basic_dashboard": True,
    "automated_renewals": False,
    "payment_retries": False,
    "proration": False,
    "advanced_analytics": False,
    "tax_automation": False,
    "pdf_invoices": False,
    "priority_support": False,
}

BASIC_YEARLY_FEATURES = {
    "customer_management": True,
    "subscription_management": True,
    "basic_billing": True,
    "invoice_generation": True,
    "payment_tracking": True,
    "email_notifications": True,
    "basic_dashboard": True,
    "automated_renewals": True,
    "payment_retries": True,
    "proration": False,
    "advanced_analytics": False,
    "tax_automation": False,
    "pdf_invoices": True,
    "priority_support": False,
}

STANDARD_MONTHLY_FEATURES = {
    "customer_management": True,
    "subscription_management": True,
    "basic_billing": True,
    "invoice_generation": True,
    "payment_tracking": True,
    "email_notifications": True,
    "basic_dashboard": True,
    "automated_renewals": True,
    "payment_retries": True,
    "proration": True,
    "advanced_analytics": True,
    "tax_automation": True,
    "pdf_invoices": True,
    "priority_support": True,
    "failed_payment_recovery": False,
    "advanced_tax_handling": False,
    "custom_billing_workflows": False,
    "financial_reports": False,
    "enterprise_administration": False,
    "high_volume_billing": False,
}

STANDARD_YEARLY_FEATURES = {
    "customer_management": True,
    "subscription_management": True,
    "basic_billing": True,
    "invoice_generation": True,
    "payment_tracking": True,
    "email_notifications": True,
    "basic_dashboard": True,
    "automated_renewals": True,
    "payment_retries": True,
    "proration": True,
    "advanced_analytics": True,
    "tax_automation": True,
    "pdf_invoices": True,
    "priority_support": True,
    "failed_payment_recovery": True,
    "advanced_tax_handling": True,
    "custom_billing_workflows": False,
    "financial_reports": True,
    "enterprise_administration": False,
    "high_volume_billing": False,
}

PREMIUM_MONTHLY_FEATURES = {
    "customer_management": True,
    "subscription_management": True,
    "basic_billing": True,
    "invoice_generation": True,
    "payment_tracking": True,
    "email_notifications": True,
    "basic_dashboard": True,
    "automated_renewals": True,
    "payment_retries": True,
    "proration": True,
    "advanced_analytics": True,
    "tax_automation": True,
    "pdf_invoices": True,
    "priority_support": True,
    "failed_payment_recovery": True,
    "advanced_tax_handling": True,
    "custom_billing_workflows": True,
    "financial_reports": True,
    "enterprise_administration": True,
    "high_volume_billing": True,
}

PREMIUM_YEARLY_FEATURES = {
    "customer_management": True,
    "subscription_management": True,
    "basic_billing": True,
    "invoice_generation": True,
    "payment_tracking": True,
    "email_notifications": True,
    "basic_dashboard": True,
    "automated_renewals": True,
    "payment_retries": True,
    "proration": True,
    "advanced_analytics": True,
    "tax_automation": True,
    "pdf_invoices": True,
    "priority_support": True,
    "failed_payment_recovery": True,
    "advanced_tax_handling": True,
    "custom_billing_workflows": True,
    "financial_reports": True,
    "enterprise_administration": True,
    "high_volume_billing": True,
}


# ============================================================
# PLAN TEMPLATES
# ============================================================

PLAN_TEMPLATES = [
    {
        "name": "Basic",
        "monthly": {
            "price": Decimal("199.00"),
            "trial_days": 7,
            "max_customers": 100,
            "max_invoices": 500,
            "feature_entitlements": BASIC_MONTHLY_FEATURES,
        },
        "yearly": {
            "price": Decimal("1999.00"),
            "trial_days": 14,
            "max_customers": 250,
            "max_invoices": 1500,
            "feature_entitlements": BASIC_YEARLY_FEATURES,
        },
        "description": (
            "Essential subscription features for "
            "individuals and small teams."
        ),
    },
    {
        "name": "Standard",
        "monthly": {
            "price": Decimal("399.00"),
            "trial_days": 14,
            "max_customers": 1000,
            "max_invoices": 5000,
            "feature_entitlements": STANDARD_MONTHLY_FEATURES,
        },
        "yearly": {
            "price": Decimal("3999.00"),
            "trial_days": 30,
            "max_customers": 2500,
            "max_invoices": 15000,
            "feature_entitlements": STANDARD_YEARLY_FEATURES,
        },
        "description": (
            "Advanced billing and subscription management "
            "for growing businesses."
        ),
    },
    {
        "name": "Premium",
        "monthly": {
            "price": Decimal("599.00"),
            "trial_days": 30,
            "max_customers": 10000,
            "max_invoices": 50000,
            "feature_entitlements": PREMIUM_MONTHLY_FEATURES,
        },
        "yearly": {
            "price": Decimal("5999.00"),
            "trial_days": 45,
            "max_customers": 25000,
            "max_invoices": 150000,
            "feature_entitlements": PREMIUM_YEARLY_FEATURES,
        },
        "description": (
            "Complete billing automation and advanced "
            "subscription management for large businesses."
        ),
    },
]


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_platform(value: str) -> str:
    """Normalize platform whitespace."""

    return " ".join(
        value.strip().split()
    )


def normalize_plan_name(value: str) -> str:
    """Normalize plan name whitespace."""

    return " ".join(
        value.strip().split()
    )


def normalize_billing_cycle(value: str) -> str:
    """Normalize billing cycle to monthly/yearly."""

    normalized = (
        value.strip()
        .lower()
        .replace("-", "")
        .replace("_", "")
        .replace(" ", "")
    )

    if normalized in {
        "yearly",
        "annual",
        "annually",
        "year",
    }:
        return "yearly"

    return "monthly"


# ============================================================
# EXISTING PLAN LOOKUP
# ============================================================

def get_existing_plan(
    session,
    platform: str,
    plan_name: str,
    billing_cycle: str,
) -> Plan | None:
    """Find an existing plan by its unique catalog identity."""

    statement = (
        select(Plan)
        .where(
            Plan.platform == platform,
            Plan.name == plan_name,
            Plan.billing_cycle == billing_cycle,
        )
    )

    return session.execute(
        statement
    ).scalar_one_or_none()


# ============================================================
# CREATE PLAN
# ============================================================

def create_plan(
    session,
    platform: str,
    template: dict,
    billing_cycle: str,
) -> Plan:
    """Create one new plan."""

    now = datetime.now(timezone.utc)

    cycle_config = template[billing_cycle]

    plan = Plan(
        platform=platform,
        name=template["name"],
        description=template["description"],
        price=cycle_config["price"],
        currency="INR",
        billing_cycle=billing_cycle,
        trial_days=cycle_config["trial_days"],
        feature_entitlements=dict(
            cycle_config["feature_entitlements"]
        ),
        max_customers=cycle_config["max_customers"],
        max_invoices=cycle_config["max_invoices"],
        is_active=True,
        created_by=None,
        created_at=now,
        updated_at=now,
    )

    session.add(plan)

    return plan


# ============================================================
# UPDATE EXISTING PLAN
# ============================================================

def update_existing_plan(
    plan: Plan,
    template: dict,
    billing_cycle: str,
) -> bool:
    """Update an existing plan to the final catalog configuration."""

    changed = False

    cycle_config = template[billing_cycle]

    # --------------------------------------------------------
    # Price
    # --------------------------------------------------------

    if plan.price != cycle_config["price"]:
        plan.price = cycle_config["price"]
        changed = True

    # --------------------------------------------------------
    # Currency
    # --------------------------------------------------------

    if plan.currency != "INR":
        plan.currency = "INR"
        changed = True

    # --------------------------------------------------------
    # Billing cycle
    # --------------------------------------------------------

    normalized_cycle = normalize_billing_cycle(
        plan.billing_cycle
    )

    if normalized_cycle != billing_cycle:
        plan.billing_cycle = billing_cycle
        changed = True

    # --------------------------------------------------------
    # Trial
    # --------------------------------------------------------

    if plan.trial_days != cycle_config["trial_days"]:
        plan.trial_days = cycle_config["trial_days"]
        changed = True

    # --------------------------------------------------------
    # Description
    # --------------------------------------------------------

    if plan.description != template["description"]:
        plan.description = template["description"]
        changed = True

    # --------------------------------------------------------
    # Customer limit
    # --------------------------------------------------------

    if plan.max_customers != cycle_config["max_customers"]:
        plan.max_customers = cycle_config["max_customers"]
        changed = True

    # --------------------------------------------------------
    # Invoice limit
    # --------------------------------------------------------

    if plan.max_invoices != cycle_config["max_invoices"]:
        plan.max_invoices = cycle_config["max_invoices"]
        changed = True

    # --------------------------------------------------------
    # Features
    # --------------------------------------------------------

    existing_features = (
        plan.feature_entitlements or {}
    )

    new_features = dict(
        cycle_config["feature_entitlements"]
    )

    if existing_features != new_features:
        plan.feature_entitlements = new_features
        changed = True

    # --------------------------------------------------------
    # Reactivate matching plan
    # --------------------------------------------------------

    if not plan.is_active:
        plan.is_active = True
        changed = True

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    if changed:
        plan.updated_at = datetime.now(timezone.utc)

    return changed


# ============================================================
# DEACTIVATE OLD PLANS
# ============================================================

def deactivate_old_plans(
    session,
    expected_keys: set[tuple[str, str, str]],
) -> int:
    """
    Deactivate active plans that are not part of the final
    53-platform catalog.

    Existing database rows are preserved.
    They are only marked inactive.
    """

    active_plans = session.execute(
        select(Plan).where(
            Plan.is_active.is_(True)
        )
    ).scalars().all()

    deactivated_count = 0

    now = datetime.now(timezone.utc)

    for plan in active_plans:

        key = (
            normalize_platform(plan.platform),
            normalize_plan_name(plan.name),
            normalize_billing_cycle(plan.billing_cycle),
        )

        if key not in expected_keys:

            plan.is_active = False
            plan.updated_at = now

            deactivated_count += 1

    return deactivated_count


# ============================================================
# FINAL CATALOG VALIDATION
# ============================================================

def validate_final_catalog(
    session,
    expected_keys: set[tuple[str, str, str]],
) -> int:
    """Validate the final active catalog."""

    active_plans = session.execute(
        select(Plan).where(
            Plan.is_active.is_(True)
        )
    ).scalars().all()

    actual_keys = set()

    for plan in active_plans:

        key = (
            normalize_platform(plan.platform),
            normalize_plan_name(plan.name),
            normalize_billing_cycle(plan.billing_cycle),
        )

        actual_keys.add(key)

    missing_keys = expected_keys - actual_keys
    unexpected_keys = actual_keys - expected_keys

    if missing_keys:
        raise RuntimeError(
            "Final catalog validation failed. "
            f"Missing active plans: {len(missing_keys)}"
        )

    if unexpected_keys:
        raise RuntimeError(
            "Final catalog validation failed. "
            f"Unexpected active plans: {len(unexpected_keys)}"
        )

    return len(active_plans)


# ============================================================
# SEED PLANS
# ============================================================

def seed_plans() -> None:
    """Seed and validate the complete BillSphere plan catalog."""

    session = SessionLocal()

    created_count = 0
    updated_count = 0
    unchanged_count = 0

    try:

        print()
        print("=" * 72)
        print("                 BillSphere Plan Seeder")
        print("=" * 72)
        print()

        # ----------------------------------------------------
        # NORMALIZE PLATFORMS
        # ----------------------------------------------------

        unique_platforms = sorted(
            {
                normalize_platform(platform)
                for platform in PLATFORMS
                if platform and platform.strip()
            },
            key=str.casefold,
        )

        billing_cycles = [
            "monthly",
            "yearly",
        ]

        print(
            f"Platforms found : {len(unique_platforms)}"
        )

        print(
            f"Plan tiers      : {len(PLAN_TEMPLATES)}"
        )

        print(
            f"Billing cycles  : {len(billing_cycles)}"
        )

        expected_plans = (
            len(unique_platforms)
            * len(PLAN_TEMPLATES)
            * len(billing_cycles)
        )

        print(
            f"Expected plans  : {expected_plans}"
        )

        print()

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if len(unique_platforms) != 53:
            raise RuntimeError(
                "Platform catalog validation failed. "
                f"Expected 53 platforms, found "
                f"{len(unique_platforms)}."
            )

        if len(PLAN_TEMPLATES) != 3:
            raise RuntimeError(
                "Plan template validation failed. "
                f"Expected 3 plan tiers, found "
                f"{len(PLAN_TEMPLATES)}."
            )

        if billing_cycles != [
            "monthly",
            "yearly",
        ]:
            raise RuntimeError(
                "Billing cycle validation failed. "
                "Expected monthly and yearly."
            )

        if expected_plans != 318:
            raise RuntimeError(
                "Plan count validation failed. "
                f"Expected 318 plans, calculated "
                f"{expected_plans}."
            )

        print(
            "Catalog validation : PASSED"
        )

        print()

        # ----------------------------------------------------
        # BUILD EXPECTED CATALOG KEYS
        # ----------------------------------------------------

        expected_keys: set[
            tuple[str, str, str]
        ] = set()

        for platform in unique_platforms:

            for template in PLAN_TEMPLATES:

                plan_name = normalize_plan_name(
                    template["name"]
                )

                for billing_cycle in billing_cycles:

                    expected_keys.add(
                        (
                            platform,
                            plan_name,
                            billing_cycle,
                        )
                    )

        # ----------------------------------------------------
        # SEED MONTHLY + YEARLY
        # ----------------------------------------------------

        print("-" * 72)

        for platform in unique_platforms:

            print()
            print(f"[{platform}]")

            for template in PLAN_TEMPLATES:

                plan_name = normalize_plan_name(
                    template["name"]
                )

                normalized_template = {
                    **template,
                    "name": plan_name,
                }

                for billing_cycle in billing_cycles:

                    existing_plan = get_existing_plan(
                        session=session,
                        platform=platform,
                        plan_name=plan_name,
                        billing_cycle=billing_cycle,
                    )

                    cycle_config = template[
                        billing_cycle
                    ]

                    price = cycle_config["price"]

                    if existing_plan:

                        changed = update_existing_plan(
                            plan=existing_plan,
                            template=normalized_template,
                            billing_cycle=billing_cycle,
                        )

                        if changed:

                            updated_count += 1

                            print(
                                f"  UPDATED     "
                                f"{plan_name:<10} "
                                f"{billing_cycle:<7} "
                                f"₹{price}"
                            )

                        else:

                            unchanged_count += 1

                            print(
                                f"  SKIP        "
                                f"{plan_name:<10} "
                                f"{billing_cycle:<7}"
                            )

                    else:

                        create_plan(
                            session=session,
                            platform=platform,
                            template=normalized_template,
                            billing_cycle=billing_cycle,
                        )

                        created_count += 1

                        print(
                            f"  CREATED     "
                            f"{plan_name:<10} "
                            f"{billing_cycle:<7} "
                            f"₹{price}"
                        )

        # ----------------------------------------------------
        # DEACTIVATE OLD ACTIVE PLANS
        # ----------------------------------------------------

        deactivated_count = deactivate_old_plans(
            session=session,
            expected_keys=expected_keys,
        )

        # ----------------------------------------------------
        # COMMIT
        # ----------------------------------------------------

        session.commit()

        # ----------------------------------------------------
        # FINAL VALIDATION
        # ----------------------------------------------------

        actual_active_count = validate_final_catalog(
            session=session,
            expected_keys=expected_keys,
        )

        if actual_active_count != 318:
            raise RuntimeError(
                "Final active plan count validation failed. "
                f"Expected 318, found "
                f"{actual_active_count}."
            )

        total_handled = (
            created_count
            + updated_count
            + unchanged_count
        )

        # ----------------------------------------------------
        # FINAL OUTPUT
        # ----------------------------------------------------

        print()
        print("=" * 72)
        print("              PLAN SEEDING COMPLETED")
        print("=" * 72)
        print()

        print(
            f"Platforms        : {len(unique_platforms)}"
        )

        print(
            f"Plan tiers       : {len(PLAN_TEMPLATES)}"
        )

        print(
            f"Billing cycles   : {len(billing_cycles)}"
        )

        print(
            f"Expected active  : 318"
        )

        print(
            f"Actual active    : {actual_active_count}"
        )

        print()

        print(
            f"Created plans    : {created_count}"
        )

        print(
            f"Updated plans    : {updated_count}"
        )

        print(
            f"Unchanged plans  : {unchanged_count}"
        )

        print(
            f"Deactivated old  : {deactivated_count}"
        )

        print(
            f"Total handled    : {total_handled}"
        )

        print()

        print(
            "FINAL VALIDATION : PASSED"
        )

        print()

        print("=" * 72)

        print(
            "53 platforms × 3 tiers × 2 billing cycles = 318"
        )

        print("=" * 72)

        print()

    except Exception as error:

        session.rollback()

        print()
        print("=" * 72)
        print("ERROR WHILE SEEDING PLANS")
        print("=" * 72)
        print()

        print(str(error))

        print()

        raise

    finally:

        session.close()


# ============================================================
# COMMAND LINE ENTRY POINT
# ============================================================

if __name__ == "__main__":
    seed_plans()