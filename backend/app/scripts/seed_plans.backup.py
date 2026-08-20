"""
BillSphere Platform Plan Seeder

Seeds the approved BillSphere platform catalog.

Each platform receives:

    Basic
    Standard
    Premium

Total:
    53 platforms × 3 plans = 159 plans

The seeder:
- Uses only the approved strong-platform catalog
- Is idempotent
- Is duplicate-safe by platform + plan name
- Preserves existing approved plans
- Reactivates inactive approved plans
- Does not modify the database schema
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.plan import Plan


# ============================================================
# APPROVED PLATFORM CATALOG
# ============================================================

PLATFORMS = [
    # --------------------------------------------------------
    # Cloud / Software / Business — 15
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
    # Major Marketplaces — 19
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
    # Retail / Fashion — 9
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
    # Entertainment / Gaming — 4
    # --------------------------------------------------------

    "Netflix",
    "Spotify",
    "Epic Games Store",
    "Roblox Marketplace",

    # --------------------------------------------------------
    # Food / Delivery — 3
    # --------------------------------------------------------

    "Swiggy",
    "Uber Eats",
    "Zomato",

    # --------------------------------------------------------
    # Social Commerce — 3
    # --------------------------------------------------------

    "Instagram Shop",
    "Facebook Marketplace",
    "TikTok Shop",
]


# ============================================================
# PLAN TEMPLATES
# ============================================================

PLAN_TEMPLATES = [
    {
        "name": "Basic",
        "price": 499.00,
        "trial_days": 7,
        "description": (
            "Essential subscription features for "
            "individuals and small teams."
        ),
        "max_customers": 100,
        "max_invoices": 500,
        "feature_entitlements": {
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
        },
    },
    {
        "name": "Standard",
        "price": 1499.00,
        "trial_days": 14,
        "description": (
            "Advanced billing and subscription management "
            "for growing businesses."
        ),
        "max_customers": 1000,
        "max_invoices": 5000,
        "feature_entitlements": {
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
        },
    },
    {
        "name": "Premium",
        "price": 4999.00,
        "trial_days": 30,
        "description": (
            "Complete billing automation and advanced "
            "subscription management for large businesses."
        ),
        "max_customers": 10000,
        "max_invoices": 50000,
        "feature_entitlements": {
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
        },
    },
]


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_platform(value: str) -> str:
    """Normalize platform whitespace."""

    return " ".join(value.strip().split())


def normalize_plan_name(value: str) -> str:
    """Normalize plan-name whitespace."""

    return " ".join(value.strip().split())


# ============================================================
# EXISTING PLAN LOOKUP
# ============================================================

def get_existing_plan(
    session,
    platform: str,
    plan_name: str,
) -> Plan | None:
    """Find an existing plan by platform and plan name."""

    statement = (
        select(Plan)
        .where(
            Plan.platform == platform,
            Plan.name == plan_name,
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
) -> Plan:
    """Create one subscription plan."""

    now = datetime.now(timezone.utc)

    plan = Plan(
        platform=platform,
        name=template["name"],
        description=template["description"],
        price=template["price"],
        currency="INR",
        billing_cycle="monthly",
        trial_days=template["trial_days"],
        feature_entitlements=dict(
            template["feature_entitlements"]
        ),
        max_customers=template["max_customers"],
        max_invoices=template["max_invoices"],
        is_active=True,
        created_by=None,
        created_at=now,
        updated_at=now,
    )

    session.add(plan)

    return plan


# ============================================================
# SEED APPROVED PLANS
# ============================================================

def seed_plans() -> None:
    """
    Seed all approved platforms with:

        Basic
        Standard
        Premium

    Expected final catalog:

        53 platforms
        159 plans
    """

    session = SessionLocal()

    created_count = 0
    skipped_count = 0
    reactivated_count = 0

    try:
        print()
        print("=" * 72)
        print("                 BillSphere Plan Seeder")
        print("=" * 72)
        print()

        unique_platforms = sorted(
            {
                normalize_platform(platform)
                for platform in PLATFORMS
                if platform and platform.strip()
            },
            key=str.casefold,
        )

        expected_plans = (
            len(unique_platforms)
            * len(PLAN_TEMPLATES)
        )

        print(
            f"Approved platforms : {len(unique_platforms)}"
        )

        print(
            f"Plans/platform     : {len(PLAN_TEMPLATES)}"
        )

        print(
            f"Expected catalog   : {expected_plans} plans"
        )

        print()
        print("-" * 72)

        for platform in unique_platforms:

            print()
            print(f"[{platform}]")

            for template in PLAN_TEMPLATES:

                plan_name = normalize_plan_name(
                    template["name"]
                )

                existing_plan = get_existing_plan(
                    session=session,
                    platform=platform,
                    plan_name=plan_name,
                )

                if existing_plan:

                    if not existing_plan.is_active:

                        existing_plan.is_active = True
                        existing_plan.updated_at = (
                            datetime.now(timezone.utc)
                        )

                        reactivated_count += 1

                        print(
                            f"  REACTIVATED {plan_name}"
                        )

                    else:

                        skipped_count += 1

                        print(
                            f"  SKIP        {plan_name}"
                        )

                    continue

                template_copy = dict(template)
                template_copy["name"] = plan_name

                create_plan(
                    session=session,
                    platform=platform,
                    template=template_copy,
                )

                created_count += 1

                print(
                    f"  CREATED     {plan_name}"
                )

        session.commit()

        total_handled = (
            created_count
            + skipped_count
            + reactivated_count
        )

        print()
        print("-" * 72)

        print(
            f"Created plans     : {created_count}"
        )

        print(
            f"Skipped plans     : {skipped_count}"
        )

        print(
            f"Reactivated plans : {reactivated_count}"
        )

        print(
            f"Total handled     : {total_handled}"
        )

        print()

        print("=" * 72)
        print("Plan seeding completed successfully.")
        print(
            f"Approved catalog target: {expected_plans} plans"
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