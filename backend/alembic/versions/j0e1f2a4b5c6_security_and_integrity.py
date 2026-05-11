"""security + integrity: stuck-processing janitor + unique constraints + account lockout

Три независимых изменения, объединённых в один commit чтобы не плодить
коммиты на проде:

1. transcriptions.processing_started_at — для stuck-janitor cron (failed после 30 мин).
2. UNIQUE на subscriptions.yookassa_id и ai_analyses(transcription_id, type) —
   защита от race condition: повторный webhook ЮKassa или конкурентный AI-анализ
   могли создавать дубликаты.
3. users.failed_login_count + locked_until — account lockout (15 мин после 10 fail).

Revision ID: j0e1f2a4b5c6
Revises: i9d0e1f2a4b5
Create Date: 2026-05-05 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "j0e1f2a4b5c6"
down_revision: Union[str, Sequence[str], None] = "i9d0e1f2a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Stuck-in-processing janitor: засекаем когда воркер начал обработку.
    # Если запись остаётся в processing > 30 мин — воркер умер/завис.
    op.add_column(
        "transcriptions",
        sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_transcriptions_processing_started_at",
        "transcriptions",
        ["processing_started_at"],
    )

    # 2) Защита от дубликатов от race condition.
    # Перед UNIQUE убираем дубликаты которые могут уже быть в проде
    # (defensive cleanup — если их нет, операции no-op).
    op.execute(
        """
        DELETE FROM subscriptions a
        USING subscriptions b
        WHERE a.yookassa_id = b.yookassa_id
          AND a.yookassa_id IS NOT NULL
          AND a.created_at < b.created_at
        """
    )
    op.create_index(
        "ux_subscriptions_yookassa_id",
        "subscriptions",
        ["yookassa_id"],
        unique=True,
        postgresql_where=sa.text("yookassa_id IS NOT NULL"),
    )

    op.execute(
        """
        DELETE FROM ai_analyses a
        USING ai_analyses b
        WHERE a.transcription_id = b.transcription_id
          AND a.type = b.type
          AND a.created_at < b.created_at
        """
    )
    op.create_index(
        "ux_ai_analyses_transcription_type",
        "ai_analyses",
        ["transcription_id", "type"],
        unique=True,
    )

    # 3) Account lockout: счётчик неудачных попыток и время разлокировки.
    op.add_column(
        "users",
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "locked_until")
    op.drop_column("users", "failed_login_count")
    op.drop_index("ux_ai_analyses_transcription_type", table_name="ai_analyses")
    op.drop_index("ux_subscriptions_yookassa_id", table_name="subscriptions")
    op.drop_index(
        "ix_transcriptions_processing_started_at", table_name="transcriptions"
    )
    op.drop_column("transcriptions", "processing_started_at")
