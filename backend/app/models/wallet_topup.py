import uuid

from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class WalletTopup(Base, UUIDMixin, TimestampMixin):
    """Пополнение кошелька (запись для идемпотентности webhook + история).

    yookassa_id уникален — повторный webhook по тому же платежу не начислит
    минуты дважды.
    """

    __tablename__ = "wallet_topups"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE")
    )
    yookassa_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    minutes: Mapped[int] = mapped_column(Integer)
    pack: Mapped[str] = mapped_column(String(20))
