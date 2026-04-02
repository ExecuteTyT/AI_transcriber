"""switch embeddings to mistral 1024 dimensions

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-02 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Переключение embeddings с OpenAI (1536d) на Mistral (1024d)."""
    # Удаляем старые embeddings (они были 1536d от OpenAI, несовместимы)
    op.execute("DELETE FROM embeddings")
    # Меняем размерность вектора
    op.execute("ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector(1024)")


def downgrade() -> None:
    op.execute("DELETE FROM embeddings")
    op.execute("ALTER TABLE embeddings ALTER COLUMN embedding TYPE vector(1536)")
