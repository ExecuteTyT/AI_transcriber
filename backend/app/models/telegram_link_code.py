import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class TelegramLinkCode(Base, UUIDMixin, TimestampMixin):
    """Одноразовый код привязки веб-аккаунта к Telegram (deep-link).

    Веб-юзер жмёт «Подключить Telegram» → создаём короткий код (живёт ~10 мин) →
    открываем `t.me/<bot>?start=<code>`. Бот передаёт код в /integrations/telegram/auth,
    где код разрешается в user_id и проставляется users.telegram_id.

    Хранится в БД (не Redis): даёт hermetic-тесты на SQLite и единую транзакцию
    привязки. Истёкшие/использованные коды считаются невалидными по полям ниже.
    """

    __tablename__ = "telegram_link_codes"

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
