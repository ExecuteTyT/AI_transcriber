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
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None


class WebhookEvent(BaseModel):
    """Событие вебхука ЮKassa (упрощённая схема)."""

    type: str  # payment.succeeded, payment.canceled, etc.
    event: str | None = None
    object: dict
