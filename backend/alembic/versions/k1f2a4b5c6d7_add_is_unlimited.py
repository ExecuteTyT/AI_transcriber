"""users.is_unlimited — флаг безлимитного аккаунта (инфлюенсеры, бартер)

Зачем: для аккаунтов, которые админ выдаёт партнёрам/инфлюенсерам/бартерным
клиентам, нужен bypass проверки минут БЕЗ необходимости каждый месяц
руками поднимать minutes_limit. Флаг отдельный от is_admin: инфлюенсер
не должен видеть админ-панель.

Поведение:
  - is_unlimited=True → bypass проверки лимита в transcriptions.py при загрузке
  - minutes_used продолжает инкрементироваться (для статистики потребления)
  - не сбрасывается при reset_monthly_limits

Revision ID: k1f2a4b5c6d7
Revises: j0e1f2a4b5c6
Create Date: 2026-05-21 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "k1f2a4b5c6d7"
down_revision: Union[str, Sequence[str], None] = "j0e1f2a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_unlimited",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "is_unlimited")
