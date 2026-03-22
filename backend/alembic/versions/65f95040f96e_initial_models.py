"""initial models

Revision ID: 65f95040f96e
Revises:
Create Date: 2026-03-22 12:59:15.643304

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "65f95040f96e"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Создание таблиц users, transcriptions, subscriptions, ai_analyses."""
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), server_default="", nullable=False),
        sa.Column("plan", sa.String(20), server_default="free", nullable=False),
        sa.Column("minutes_used", sa.Integer(), server_default="0", nullable=False),
        sa.Column("minutes_limit", sa.Integer(), server_default="15", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "transcriptions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(500), server_default="", nullable=False),
        sa.Column("status", sa.String(20), server_default="queued", nullable=False),
        sa.Column("language", sa.String(10), nullable=True),
        sa.Column("duration_sec", sa.Integer(), nullable=True),
        sa.Column("file_key", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(500), server_default="", nullable=False),
        sa.Column("content_type", sa.String(100), server_default="", nullable=False),
        sa.Column("full_text", sa.Text(), nullable=True),
        sa.Column("segments", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("plan", sa.String(20), nullable=False),
        sa.Column("yookassa_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "ai_analyses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("transcription_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model_used", sa.String(50), server_default="gpt-4o-mini", nullable=False),
        sa.Column("tokens_used", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["transcription_id"], ["transcriptions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Удаление всех таблиц."""
    op.drop_table("ai_analyses")
    op.drop_table("subscriptions")
    op.drop_table("transcriptions")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
