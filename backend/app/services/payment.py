"""Сервис интеграции с ЮKassa."""

import hashlib
import hmac
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.subscription import Subscription
from app.models.user import User
from app.services.plans import PLANS, get_plan

logger = logging.getLogger(__name__)

# Цены в копейках для ЮKassa
PLAN_PRICES = {
    "start": "290.00",
    "pro": "590.00",
}

PLAN_DESCRIPTIONS = {
    "start": "AI Voice — тариф Старт (300 мин/мес)",
    "pro": "AI Voice — тариф Про (1200 мин/мес)",
}


async def create_payment(user_id: uuid.UUID, plan: str) -> dict:
    """Создание платежа через ЮKassa API."""
    import httpx

    if plan not in PLAN_PRICES:
        raise ValueError(f"Недопустимый план: {plan}. Допустимые: start, pro")

    idempotency_key = str(uuid.uuid4())

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.yookassa.ru/v3/payments",
            auth=(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY),
            headers={"Idempotence-Key": idempotency_key},
            json={
                "amount": {
                    "value": PLAN_PRICES[plan],
                    "currency": "RUB",
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": f"{settings.APP_URL}/subscription?status=success",
                },
                "capture": True,
                "description": PLAN_DESCRIPTIONS[plan],
                "metadata": {
                    "user_id": str(user_id),
                    "plan": plan,
                },
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


async def activate_subscription(
    user_id: uuid.UUID,
    plan: str,
    yookassa_id: str,
    db: AsyncSession,
) -> Subscription:
    """Активация подписки после успешной оплаты (идемпотентно)."""
    # Идемпотентность: проверяем, не обработан ли уже этот платёж
    if yookassa_id:
        existing = await db.execute(
            select(Subscription).where(Subscription.yookassa_id == yookassa_id)
        )
        existing_sub = existing.scalar_one_or_none()
        if existing_sub:
            logger.info("Дубль webhook, подписка уже существует: yookassa_id=%s", yookassa_id)
            return existing_sub

    plan_config = get_plan(plan)
    now = datetime.now(timezone.utc)

    # Деактивируем старые подписки
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.status == "active",
        )
    )
    for old_sub in result.scalars().all():
        old_sub.status = "cancelled"

    # Создаём новую подписку
    subscription = Subscription(
        user_id=user_id,
        plan=plan,
        yookassa_id=yookassa_id,
        status="active",
        current_period_start=now,
        current_period_end=now + timedelta(days=30),
    )
    db.add(subscription)

    # Обновляем план пользователя
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.plan = plan
        user.minutes_limit = plan_config.minutes_limit

    await db.commit()
    await db.refresh(subscription)

    # Email-уведомление об активации
    if user:
        try:
            from app.services.email import send_subscription_email
            await send_subscription_email(user.email, plan)
        except Exception:
            logger.warning("Не удалось отправить email подписки: user=%s", user_id)

    logger.info("Subscription activated: user=%s plan=%s yookassa_id=%s", user_id, plan, yookassa_id)
    return subscription


async def cancel_subscription(
    subscription_id: uuid.UUID,
    db: AsyncSession,
) -> Subscription | None:
    """Отмена подписки."""
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    subscription = result.scalar_one_or_none()
    if subscription is None:
        return None

    subscription.status = "cancelled"

    # Возврат на free план
    result = await db.execute(
        select(User).where(User.id == subscription.user_id)
    )
    user = result.scalar_one_or_none()
    if user:
        user.plan = "free"
        user.minutes_limit = PLANS["free"].minutes_limit

    await db.commit()
    await db.refresh(subscription)

    logger.info("Subscription cancelled: id=%s", subscription_id)
    return subscription


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """Проверка подписи вебхука ЮKassa."""
    if not settings.YOOKASSA_WEBHOOK_SECRET:
        logger.error("YOOKASSA_WEBHOOK_SECRET not configured — rejecting webhook")
        return False
    if not signature:
        return False
    expected = hmac.new(
        settings.YOOKASSA_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
