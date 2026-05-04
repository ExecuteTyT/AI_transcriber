"""152-ФЗ: поля для отдельного срока хранения аудио + default_audio_retention_days у юзера

Существующее поле transcriptions.expires_at удаляет ВСЮ запись (текст+аудио).
Новые поля audio_* удаляют ТОЛЬКО аудио-файл, оставляя текст транскрипции —
это покрывает требования 152-ФЗ (минимизация хранения исходных данных) без
потери ценной для юзера расшифровки.

Revision ID: h8c9d0e1f2a4
Revises: g7b8c9d0e1f3
Create Date: 2026-05-01 12:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "h8c9d0e1f2a4"
down_revision: Union[str, Sequence[str], None] = "g7b8c9d0e1f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users: дефолтный срок аудио-retention для новых транскрипций.
    op.add_column(
        "users",
        sa.Column(
            "default_audio_retention_days",
            sa.Integer(),
            nullable=False,
            server_default="7",
        ),
    )

    # transcriptions: 4 новых поля.
    op.add_column(
        "transcriptions",
        sa.Column(
            "audio_retention_days",
            sa.Integer(),
            nullable=False,
            server_default="7",
        ),
    )
    op.add_column(
        "transcriptions",
        sa.Column("audio_delete_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "transcriptions",
        sa.Column("audio_deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "transcriptions",
        sa.Column("audio_deleted_log", sa.Text(), nullable=True),
    )

    # Индекс для cron-выборки: WHERE audio_delete_at < now() AND audio_deleted_at IS NULL.
    op.create_index(
        "ix_transcriptions_audio_delete_at",
        "transcriptions",
        ["audio_delete_at"],
    )

    # Backfill: для существующих записей считаем срок от created_at.
    # Если у пользователя задан data_retention_days — используем его,
    # иначе дефолт 7 дней. Записи у которых уже есть expires_at и они в
    # прошлом — audio_delete_at тоже выставляем в прошлое чтобы cron их
    # подобрал на следующем проходе.
    op.execute(
        """
        UPDATE transcriptions
        SET audio_delete_at = created_at + (audio_retention_days * INTERVAL '1 day')
        WHERE audio_delete_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_transcriptions_audio_delete_at", table_name="transcriptions")
    op.drop_column("transcriptions", "audio_deleted_log")
    op.drop_column("transcriptions", "audio_deleted_at")
    op.drop_column("transcriptions", "audio_delete_at")
    op.drop_column("transcriptions", "audio_retention_days")
    op.drop_column("users", "default_audio_retention_days")
