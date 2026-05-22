"""merge: объединить ветку mistral_embeddings с основной цепочкой

История: в репозитории давно было два head'а от f6a7b8c9d0e1 (bonus_minutes):
  - a7b8c9d0e1f2 (mistral_embeddings_1024) — отдельная ветка
  - g7b8c9d0e1f3 → ... → k1f2a4b5c6d7 (основная цепочка)

На проде никто не запускал `alembic upgrade head` после развилки, поэтому
конфликт всплыл только сейчас при попытке накатить is_unlimited. Эта
merge-миграция без DDL — её единственная задача собрать два head'а в один,
чтобы дальше цепочка была линейной.

Revision ID: m3b5c6d7e8f9
Revises: a7b8c9d0e1f2, k1f2a4b5c6d7
Create Date: 2026-05-22 09:00:00.000000

"""
from typing import Sequence, Union


revision: str = "m3b5c6d7e8f9"
down_revision: Union[str, Sequence[str], None] = ("a7b8c9d0e1f2", "k1f2a4b5c6d7")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Merge-only: никаких изменений схемы.
    pass


def downgrade() -> None:
    # Обратное слияние не нужно — downgrade каждой ветки делается через
    # её собственные миграции.
    pass
