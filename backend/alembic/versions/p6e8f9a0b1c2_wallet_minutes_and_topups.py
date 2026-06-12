"""wallet: User.wallet_minutes + wallet_topups table

Revision ID: p6e8f9a0b1c2
Revises: o5d7e8f9a0b1
Create Date: 2026-06-10 19:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p6e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "o5d7e8f9a0b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Кошелёк: предоплаченные минуты. Существующие юзеры стартуют с 0.
    op.add_column(
        "users",
        sa.Column("wallet_minutes", sa.Integer(), nullable=False, server_default="0"),
    )

    # Таблица пополнений — идемпотентность webhook (unique yookassa_id) + история.
    op.create_table(
        "wallet_topups",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("yookassa_id", sa.String(length=100), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("pack", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_wallet_topups_yookassa_id"),
        "wallet_topups",
        ["yookassa_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_wallet_topups_yookassa_id"), table_name="wallet_topups")
    op.drop_table("wallet_topups")
    op.drop_column("users", "wallet_minutes")
