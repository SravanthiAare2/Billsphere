"""Add single-use payment confirmation records.

Revision ID: add_payment_confirmations
Revises: 0cd48b83a70e
"""

from alembic import op
import sqlalchemy as sa


revision = "add_payment_confirmations"
down_revision = "0cd48b83a70e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_confirmations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("payment_id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_payment_confirmations_id", "payment_confirmations", ["id"])
    op.create_index("ix_payment_confirmations_payment_id", "payment_confirmations", ["payment_id"])
    op.create_index("ix_payment_confirmations_token_hash", "payment_confirmations", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_payment_confirmations_token_hash", table_name="payment_confirmations")
    op.drop_index("ix_payment_confirmations_payment_id", table_name="payment_confirmations")
    op.drop_index("ix_payment_confirmations_id", table_name="payment_confirmations")
    op.drop_table("payment_confirmations")
