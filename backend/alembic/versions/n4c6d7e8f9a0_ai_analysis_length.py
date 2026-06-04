"""add length column to ai_analyses (объём анализа: short/standard/detailed)

Revision ID: n4c6d7e8f9a0
Revises: m3b5c6d7e8f9
Create Date: 2026-06-04 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "n4c6d7e8f9a0"
down_revision: Union[str, Sequence[str], None] = "m3b5c6d7e8f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default='standard' проставит значение существующим строкам и новым
    # вставкам без явного length. NOT NULL безопасен за счёт дефолта.
    op.add_column(
        "ai_analyses",
        sa.Column(
            "length",
            sa.String(length=20),
            nullable=False,
            server_default="standard",
        ),
    )


def downgrade() -> None:
    op.drop_column("ai_analyses", "length")
