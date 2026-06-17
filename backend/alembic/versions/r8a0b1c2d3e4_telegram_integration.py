"""telegram integration: users.telegram_id + telegram_link_codes

Revision ID: r8a0b1c2d3e4
Revises: q7f9a0b1c2d3
Create Date: 2026-06-16 21:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "r8a0b1c2d3e4"
down_revision: Union[str, Sequence[str], None] = "q7f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"], unique=True)

    op.create_table(
        "telegram_link_codes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_telegram_link_codes_code", "telegram_link_codes", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_telegram_link_codes_code", table_name="telegram_link_codes")
    op.drop_table("telegram_link_codes")
    op.drop_index("ix_users_telegram_id", table_name="users")
    op.drop_column("users", "telegram_id")
