"""payments: amount_rub on subscriptions + wallet_topups (+backfill from price tables)

Revision ID: q7f9a0b1c2d3
Revises: p6e8f9a0b1c2
Create Date: 2026-06-16 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "q7f9a0b1c2d3"
down_revision: Union[str, Sequence[str], None] = "p6e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("subscriptions", sa.Column("amount_rub", sa.Integer(), nullable=True))
    op.add_column("wallet_topups", sa.Column("amount_rub", sa.Integer(), nullable=True))

    # Бэкфилл существующих платежей из текущих цен (цены ещё не менялись).
    op.execute(
        "UPDATE subscriptions SET amount_rub = CASE plan "
        "WHEN 'start' THEN 500 WHEN 'pro' THEN 990 "
        "WHEN 'expert' THEN 1990 WHEN 'premium' THEN 3490 ELSE 0 END "
        "WHERE amount_rub IS NULL"
    )
    op.execute(
        "UPDATE wallet_topups SET amount_rub = CASE pack "
        "WHEN 'w150' THEN 299 WHEN 'w400' THEN 690 WHEN 'w1000' THEN 1490 ELSE 0 END "
        "WHERE amount_rub IS NULL"
    )


def downgrade() -> None:
    op.drop_column("wallet_topups", "amount_rub")
    op.drop_column("subscriptions", "amount_rub")
