import uuid
from datetime import datetime

from pydantic import BaseModel


class SubscribeRequest(BaseModel):
    """Запрос на создание подписки."""

    plan: str  # start / pro


class SubscribeResponse(BaseModel):
    """Ответ с URL для оплаты."""

    payment_id: str
    confirmation_url: str
    status: str


class SubscriptionResponse(BaseModel):
    """Текущая подписка пользователя."""

    id: uuid.UUID | None = None
    plan: str
    status: str  # active / cancelled / expired / none
    minutes_used: int
    minutes_limit: int
    wallet_minutes: int = 0
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None


class WalletTopupRequest(BaseModel):
    """Запрос на пополнение кошелька."""

    pack: str  # w150 / w400 / w1000


class WalletTopupResponse(BaseModel):
    """Ответ с URL для оплаты пополнения."""

    payment_id: str
    confirmation_url: str
    status: str


class WebhookEvent(BaseModel):
    """Событие вебхука ЮKassa (упрощённая схема)."""

    type: str  # payment.succeeded, payment.canceled, etc.
    event: str | None = None
    object: dict
