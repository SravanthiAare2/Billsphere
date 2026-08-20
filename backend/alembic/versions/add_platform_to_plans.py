"""
Add platform support to subscription plans.

Revision ID: add_platform_to_plans
Revises: 8f4b_complete_billing_engine
"""

from alembic import op
import sqlalchemy as sa


# ==========================================================
# Revision Identifiers
# ==========================================================

revision = "add_platform_to_plans"

down_revision = "8f4b_complete_billing_engine"

branch_labels = None

depends_on = None


# ==========================================================
# Upgrade
# ==========================================================

def upgrade() -> None:
    """
    Add platform support to the plans table.

    Changes:
    - Add platform column
    - Populate existing plans with a default platform
    - Make platform NOT NULL
    - Remove old global unique constraint on plan name
    - Add unique constraint for platform + name
    - Add platform index
    """

    bind = op.get_bind()

    inspector = sa.inspect(bind)

    # ------------------------------------------------------
    # Get existing columns
    # ------------------------------------------------------

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("plans")
    }

    # ------------------------------------------------------
    # Add platform column
    # ------------------------------------------------------

    if "platform" not in existing_columns:

        op.add_column(
            "plans",
            sa.Column(
                "platform",
                sa.String(length=100),
                nullable=True,
            ),
        )

    # ------------------------------------------------------
    # Populate existing plans
    # ------------------------------------------------------
    #
    # Existing plans were created before platform support.
    #
    # We assign them to "General" so the migration does not
    # destroy existing data.
    #
    # You can later edit these plans and assign the correct
    # platform from the admin side.
    # ------------------------------------------------------

    op.execute(
        """
        UPDATE plans
        SET platform = 'General'
        WHERE platform IS NULL
        """
    )

    # ------------------------------------------------------
    # Make platform NOT NULL
    # ------------------------------------------------------

    inspector = sa.inspect(bind)

    platform_column = next(
        column
        for column in inspector.get_columns("plans")
        if column["name"] == "platform"
    )

    if platform_column["nullable"]:

        op.alter_column(
            "plans",
            "platform",
            existing_type=sa.String(length=100),
            nullable=False,
        )

    # ------------------------------------------------------
    # Remove old global unique constraint on name
    # ------------------------------------------------------

    inspector = sa.inspect(bind)

    unique_constraints = inspector.get_unique_constraints(
        "plans"
    )

    for constraint in unique_constraints:

        constraint_name = constraint.get("name")

        constraint_columns = constraint.get(
            "column_names",
            [],
        )

        if (
            constraint_name
            and constraint_columns == ["name"]
        ):

            op.drop_constraint(
                constraint_name,
                "plans",
                type_="unique",
            )

    # ------------------------------------------------------
    # Add platform index
    # ------------------------------------------------------

    indexes = inspector.get_indexes("plans")

    platform_index_exists = any(
        index.get("name") == "ix_plans_platform"
        for index in indexes
    )

    if not platform_index_exists:

        op.create_index(
            "ix_plans_platform",
            "plans",
            ["platform"],
            unique=False,
        )

    # ------------------------------------------------------
    # Add platform + name unique constraint
    # ------------------------------------------------------

    inspector = sa.inspect(bind)

    unique_constraints = inspector.get_unique_constraints(
        "plans"
    )

    composite_constraint_exists = any(
        constraint.get("name")
        == "uq_plans_platform_name"
        for constraint in unique_constraints
    )

    if not composite_constraint_exists:

        op.create_unique_constraint(
            "uq_plans_platform_name",
            "plans",
            ["platform", "name"],
        )


# ==========================================================
# Downgrade
# ==========================================================

def downgrade() -> None:
    """
    Reverse platform support changes.
    """

    bind = op.get_bind()

    inspector = sa.inspect(bind)

    # ------------------------------------------------------
    # Remove composite unique constraint
    # ------------------------------------------------------

    unique_constraints = inspector.get_unique_constraints(
        "plans"
    )

    composite_constraint_exists = any(
        constraint.get("name")
        == "uq_plans_platform_name"
        for constraint in unique_constraints
    )

    if composite_constraint_exists:

        op.drop_constraint(
            "uq_plans_platform_name",
            "plans",
            type_="unique",
        )

    # ------------------------------------------------------
    # Remove platform index
    # ------------------------------------------------------

    indexes = inspector.get_indexes("plans")

    platform_index_exists = any(
        index.get("name") == "ix_plans_platform"
        for index in indexes
    )

    if platform_index_exists:

        op.drop_index(
            "ix_plans_platform",
            table_name="plans",
        )

    # ------------------------------------------------------
    # Remove platform column
    # ------------------------------------------------------

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("plans")
    }

    if "platform" in existing_columns:

        op.drop_column(
            "plans",
            "platform",
        )