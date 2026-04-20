"""migrate embeddings from OpenAI 1536d to Mistral 1024d (mistral-embed)

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-04-20 15:00:00.000000

Обоснование: переход с OpenAI text-embedding-3-small на Mistral mistral-embed
для сокращения числа трансграничных обработчиков ПДн (152-ФЗ compliance) —
один провайдер вместо двух.

ВАЖНО: все существующие embeddings теряют актуальность (другая модель →
другое векторное пространство). Удаляем всё и пересоздаём. На проде это
безопасно: RAG-чат не был активен (OPENAI_API_KEY не был настроен), так
что записей в таблице либо нет, либо единицы в dev-окружении.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Очищаем все существующие embeddings (несовместимая размерность).
    op.execute("DELETE FROM embeddings")

    # Убираем старую колонку и создаём заново с размером 1024.
    # Используем SQL напрямую, т.к. pgvector типы не всегда доступны в alembic autogen.
    op.execute("ALTER TABLE embeddings DROP COLUMN embedding")
    op.execute("ALTER TABLE embeddings ADD COLUMN embedding vector(1024)")


def downgrade() -> None:
    # Обратный rollback: вернуть 1536 (OpenAI text-embedding-3-small).
    op.execute("DELETE FROM embeddings")
    op.execute("ALTER TABLE embeddings DROP COLUMN embedding")
    op.execute("ALTER TABLE embeddings ADD COLUMN embedding vector(1536)")
