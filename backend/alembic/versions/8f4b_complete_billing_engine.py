"""Complete billing engine schema compatibility.

Revision ID: 8f4b_complete_billing_engine
Revises: 5c13bad79a18
"""

from alembic import op
import sqlalchemy as sa


revision = "8f4b_complete_billing_engine"
down_revision = "5c13bad79a18"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "invoice_line_items" not in tables:
        op.create_table(
            "invoice_line_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("invoice_id", sa.Integer(), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=False),
            sa.Column("item_type", sa.String(length=50), nullable=False, server_default="charge"),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        )
        op.create_index(
            "ix_invoice_line_items_invoice_id",
            "invoice_line_items",
            ["invoice_id"],
        )

    existing_plan_columns = {c["name"] for c in inspector.get_columns("plans")}
    if "feature_entitlements" not in existing_plan_columns:
        op.add_column("plans", sa.Column("feature_entitlements", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    plan_columns = {c["name"] for c in inspector.get_columns("plans")}
    if "feature_entitlements" in plan_columns:
        op.drop_column("plans", "feature_entitlements")

    if "invoice_line_items" in inspector.get_table_names():
        op.drop_index("ix_invoice_line_items_invoice_id", table_name="invoice_line_items")
        op.drop_table("invoice_line_items")
