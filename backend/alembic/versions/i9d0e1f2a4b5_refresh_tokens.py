"""refresh tokens: rotation + reuse detection (RFC 6819 §5.2.2.3)

Стейтфул-журнал refresh-токенов. JWT остаётся подписанным, но дополнительно
имеет jti claim, sha256(jti) хранится в БД. consume_and_rotate помечает старую
строку consumed_at и создаёт новую с replaced_by_id. Использование уже
consumed-токена = breach detection → revoke вся family.

Revision ID: i9d0e1f2a4b5
Revises: h8c9d0e1f2a4
Create Date: 2026-05-04 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "i9d0e1f2a4b5"
down_revision: Union[str, Sequence[str], None] = "h8c9d0e1f2a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
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
        # sha256(jti) — храним хеш, не сам jti. Атакующий с read-доступом к
        # БД не сможет minted'ить токены (нужен ещё JWT_SECRET), но и не
        # сможет identify конкретный токен по leaked jti.
        sa.Column("jti_hash", sa.CHAR(64), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        # NULL = active, NOT NULL = был использован для rotate.
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        # NULL = не отозван, NOT NULL = revoked (logout/password change/reuse).
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        # logout | password_change | password_reset | reuse_family | account_deleted
        sa.Column("revoke_reason", sa.String(32), nullable=True),
        # Цепочка ротации — позволяет идти вверх/вниз для revoke_family.
        sa.Column(
            "replaced_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("refresh_tokens.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_refresh_tokens_user_id",
        "refresh_tokens",
        ["user_id"],
    )
    op.create_index(
        "ix_refresh_tokens_expires_at",
        "refresh_tokens",
        ["expires_at"],
    )
    # jti_hash UNIQUE — индекс создаётся автоматически.


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_expires_at", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
