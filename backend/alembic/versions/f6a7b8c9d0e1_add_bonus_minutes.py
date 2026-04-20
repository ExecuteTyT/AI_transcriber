"""add User.bonus_minutes (welcome bonus, one-time)

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-19 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Welcome-бонус 180 минут (= 3 часа, как у конкурента Speech2Text).
    # Существующие пользователи тоже получают бонус разово.
    op.add_column(
        "users",
        sa.Column("bonus_minutes", sa.Integer(), nullable=False, server_default="180"),
    )


def downgrade() -> None:
    op.drop_column("users", "bonus_minutes")
