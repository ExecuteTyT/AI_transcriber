"""Кросс-диалектные типы колонок.

INET существует только в PostgreSQL. Тесты используют SQLite in-memory, где
`create_all` падает на `INET` (UnsupportedCompilationError). INETType отдаёт
нативный INET на PostgreSQL (прод/CI) и String на остальных диалектах (SQLite),
не меняя поведение в проде.
"""
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.types import TypeDecorator


class INETType(TypeDecorator):
    """INET на PostgreSQL, String(45) на прочих диалектах (SQLite в тестах)."""

    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(INET())
        return dialect.type_descriptor(String(45))  # 45 = max IPv6 textual length
