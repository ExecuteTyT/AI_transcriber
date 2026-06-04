"""ai_analyses: уникальность (transcription_id, type) → (transcription_id, type, length)

Кэш анализа по уровню объёма: храним отдельную строку на каждый length, чтобы
уже сгенерированный уровень отдавался из кэша, а не перегенерировался.

Revision ID: o5d7e8f9a0b1
Revises: n4c6d7e8f9a0
Create Date: 2026-06-04 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "o5d7e8f9a0b1"
down_revision: Union[str, Sequence[str], None] = "n4c6d7e8f9a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Исходная уникальность сделана как UNIQUE INDEX (миграция j0e1f2a4b5c6),
    # поэтому снимаем drop_index, а не drop_constraint. Существующие строки имеют
    # length='standard' → (transcription_id, type, length) уникальны, конфликта нет.
    op.drop_index("ux_ai_analyses_transcription_type", table_name="ai_analyses")
    op.create_index(
        "ux_ai_analyses_transcription_type_length",
        "ai_analyses",
        ["transcription_id", "type", "length"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ux_ai_analyses_transcription_type_length", table_name="ai_analyses")
    op.create_index(
        "ux_ai_analyses_transcription_type",
        "ai_analyses",
        ["transcription_id", "type"],
        unique=True,
    )
