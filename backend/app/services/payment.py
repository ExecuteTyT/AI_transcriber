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

# Цены — источник истины app.services.plans.PLANS.
# Здесь формируем формат который нужен ЮKassa (string с 2 знаками после запятой).
PLAN_PRICES: dict[str, str] = {
    code: f"{cfg.price_rub:.2f}"
    for code, cfg in PLANS.items()
    if cfg.price_rub > 0
}

PLAN_DESCRIPTIONS: dict[str, str] = {
    "start": "Dicto — тариф Старт (10 часов / мес)",
    "pro": "Dicto — тариф Про (25 часов / мес)",
    "business": "Dicto — тариф Бизнес (60 часов / мес)",
    "premium": "Dicto — тариф Премиум (120 часов / мес)",
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

    # Email-уведомление об активации — fire-and-forget чтобы не блокировать
    # YooKassa webhook-ответ (webhook ожидает ответа за ~30 сек, SMTP может не успеть).
    if user:
        import asyncio as _asyncio
        from app.services.email import send_subscription_email

        async def _send_subscription_background(email: str, _plan: str):
            try:
                await send_subscription_email(email, _plan)
            except Exception:
                logger.warning("Subscription email failed for %s (background)", email)

        _asyncio.create_task(_send_subscription_background(user.email, plan))

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
