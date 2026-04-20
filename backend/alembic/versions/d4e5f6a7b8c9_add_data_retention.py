"""add data retention fields: User.data_retention_days, Transcription.expires_at

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-19 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Срок хранения транскрипций в днях. None = бессрочно (Pro/Бизнес опция).
    op.add_column(
        "users",
        sa.Column("data_retention_days", sa.Integer(), nullable=True, server_default="30"),
    )

    # Дата автоматического удаления транскрипции (created_at + retention_days).
    op.add_column(
        "transcriptions",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_transcriptions_expires_at",
        "transcriptions",
        ["expires_at"],
    )

    # Backfill существующих записей — expires_at = created_at + 30 days.
    op.execute(
        """
        UPDATE transcriptions
        SET expires_at = created_at + INTERVAL '30 days'
        WHERE expires_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_transcriptions_expires_at", table_name="transcriptions")
    op.drop_column("transcriptions", "expires_at")
    op.drop_column("users", "data_retention_days")
