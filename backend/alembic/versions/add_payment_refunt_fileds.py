"""Add payment refund tracking fields.

Revision ID: add_payment_refund_fields
Revises: add_payment_confirmations
"""

from alembic import op
import sqlalchemy as sa


revision = "add_payment_refund_fields"
down_revision = "add_payment_confirmations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("payments")}

    if "refunded_amount" not in columns:
        op.add_column(
            "payments",
            sa.Column("refunded_amount", sa.Numeric(10, 2), nullable=True),
        )

    if "refunded_at" not in columns:
        op.add_column(
            "payments",
            sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "refund_reason" not in columns:
        op.add_column(
            "payments",
            sa.Column("refund_reason", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("payments")}

    if "refund_reason" in columns:
        op.drop_column("payments", "refund_reason")

    if "refunded_at" in columns:
        op.drop_column("payments", "refunded_at")

    if "refunded_amount" in columns:
        op.drop_column("payments", "refunded_amount")
