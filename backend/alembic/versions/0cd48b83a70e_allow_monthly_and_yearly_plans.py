"""allow monthly and yearly plans

Revision ID: 0cd48b83a70e
Revises: add_platform_to_plans
Create Date: 2026-08-18
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0cd48b83a70e"
down_revision: Union[str, Sequence[str], None] = "add_platform_to_plans"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove old uniqueness rule:
    # platform + name
    op.drop_constraint(
        "uq_plans_platform_name",
        "plans",
        type_="unique",
    )

    # Add new uniqueness rule:
    # platform + name + billing_cycle
    op.create_unique_constraint(
        "uq_plans_platform_name_billing_cycle",
        "plans",
        ["platform", "name", "billing_cycle"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_plans_platform_name_billing_cycle",
        "plans",
        type_="unique",
    )

    op.create_unique_constraint(
        "uq_plans_platform_name",
        "plans",
        ["platform", "name"],
    )