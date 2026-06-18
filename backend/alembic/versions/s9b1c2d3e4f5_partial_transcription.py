"""partial transcription: transcriptions.max_minutes / is_truncated / full_duration_sec

Revision ID: s9b1c2d3e4f5
Revises: r8a0b1c2d3e4
Create Date: 2026-06-18 09:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "s9b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = "r8a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("transcriptions", sa.Column("max_minutes", sa.Integer(), nullable=True))
    op.add_column(
        "transcriptions",
        sa.Column("is_truncated", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("transcriptions", sa.Column("full_duration_sec", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("transcriptions", "full_duration_sec")
    op.drop_column("transcriptions", "is_truncated")
    op.drop_column("transcriptions", "max_minutes")
