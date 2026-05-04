"""152-ФЗ: журнал согласий пользователей (user_consents)

Таблица для аудита согласий — фиксируем КАЖДЫЙ акт granted/revoked
с IP, User-Agent и версией политики. Существующие булевы поля
(users.consent_terms_at / consent_cross_border_at) оставляем как есть для
обратной совместимости — новый журнал заполняется параллельно.

Revision ID: g7b8c9d0e1f3
Revises: f6a7b8c9d0e1
Create Date: 2026-05-01 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "g7b8c9d0e1f3"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_consents",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # 'pd_processing' | 'cross_border' | 'marketing'
        sa.Column("consent_type", sa.String(64), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        # INET для корректного хранения IPv4/IPv6.
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        # Версия политики (config.POLICY_VERSION на момент записи).
        sa.Column("policy_version", sa.String(16), nullable=False),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        # Заполняется при отзыве согласия (revoke).
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    op.create_index(
        "idx_user_consents_user_id",
        "user_consents",
        ["user_id"],
    )
    op.create_index(
        "idx_user_consents_type",
        "user_consents",
        ["user_id", "consent_type"],
    )


def downgrade() -> None:
    op.drop_index("idx_user_consents_type", table_name="user_consents")
    op.drop_index("idx_user_consents_user_id", table_name="user_consents")
    op.drop_table("user_consents")
