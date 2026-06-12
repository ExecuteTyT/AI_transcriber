"""Сервис интеграции с ЮKassa.

Webhook-защита: IP-allowlist + re-fetch payment (документированная схема).
ЮKassa НЕ подписывает webhook'и HMAC — у них только IP-whitelist (опубликован
на yookassa.ru/developers/using-api/webhooks#ip) + способ перепроверить
платёж через GET /v3/payments/{id}. См. verify_payment_via_api.
"""

import ipaddress
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.subscription import Subscription
from app.models.user import User
from app.models.wallet_topup import WalletTopup
from app.services.plans import PLANS, WALLET_PACKS, get_plan

logger = logging.getLogger(__name__)

# Публичные IPv4-диапазоны ЮKassa с https://yookassa.ru/developers/using-api/webhooks#ip.
# Только эти source IP могут отправлять webhook на /api/payments/webhook.
# Если ЮKassa добавит новые — обновить здесь. IPv6-сети у них тоже есть, но
# Selectel-нода обычно IPv4-only — оставляем IPv4 на старте.
YOOKASSA_WEBHOOK_IP_NETWORKS: list[ipaddress.IPv4Network] = [
    ipaddress.IPv4Network("185.71.76.0/27"),
    ipaddress.IPv4Network("185.71.77.0/27"),
    ipaddress.IPv4Network("77.75.153.0/25"),
    ipaddress.IPv4Network("77.75.156.11/32"),
    ipaddress.IPv4Network("77.75.156.35/32"),
    ipaddress.IPv4Network("77.75.154.128/25"),
]


def is_yookassa_ip(ip: str) -> bool:
    """Проверка что webhook пришёл с одного из IP-диапазонов ЮKassa."""
    try:
        addr = ipaddress.ip_address(ip)
    except (ValueError, TypeError):
        return False
    if not isinstance(addr, ipaddress.IPv4Address):
        return False
    return any(addr in net for net in YOOKASSA_WEBHOOK_IP_NETWORKS)


async def verify_payment_via_api(payment_id: str) -> dict | None:
    """Документированный способ верификации webhook'а: GET payment у ЮKassa.

    После получения webhook'а делаем независимый запрос к ЮKassa API с
    нашими credentials. Если payment действительно существует со status=succeeded
    и совпадает amount — это доказательство что webhook не подделан.

    Возвращает payment-object от ЮKassa или None если не найден / ошибка.
    """
    import httpx

    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        logger.error("YooKassa credentials not configured")
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.yookassa.ru/v3/payments/{payment_id}",
                auth=(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY),
                timeout=10,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        logger.warning("verify_payment_via_api failed for %s: %s", payment_id, exc)
        return None

# Цены — источник истины app.services.plans.PLANS.
# Здесь формируем формат который нужен ЮKassa (string с 2 знаками после запятой).
PLAN_PRICES: dict[str, str] = {
    code: f"{cfg.price_rub:.2f}"
    for code, cfg in PLANS.items()
    if cfg.price_rub > 0
}

PLAN_DESCRIPTIONS: dict[str, str] = {
    "start": "Dicto — тариф Старт (10 часов / мес)",
    "pro": "Dicto — тариф Про (30 часов / мес)",
    "expert": "Dicto — тариф Эксперт (70 часов / мес)",
    "premium": "Dicto — тариф Премиум (140 часов / мес)",
}


def build_payment_description(base: str, email: str | None) -> str:
    """Описание платежа для ЮKassa с указанием, кто оплатил.

    ЮKassa показывает description в кабинете заказов. Добавляем email аккаунта,
    чтобы было видно, за кого платёж. Лимит ЮKassa — 128 символов, режем с
    запасом (email бывает длинным).
    """
    if not email:
        return base[:128]
    return f"{base} · {email}"[:128]


async def create_payment(user_id: uuid.UUID, plan: str, email: str | None = None) -> dict:
    """Создание платежа через ЮKassa API."""
    import httpx

    if plan not in PLAN_PRICES:
        raise ValueError(f"Недопустимый план: {plan}. Допустимые: {', '.join(PLAN_PRICES)}")

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
                "description": build_payment_description(PLAN_DESCRIPTIONS[plan], email),
                "metadata": {
                    "user_id": str(user_id),
                    "plan": plan,
                    "email": email or "",
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


async def create_wallet_payment(user_id: uuid.UUID, pack: str, email: str | None = None) -> dict:
    """Создание YooKassa-платежа для пополнения кошелька (пакет минут)."""
    import httpx

    if pack not in WALLET_PACKS:
        raise ValueError(f"Недопустимый пакет: {pack}. Допустимые: {', '.join(WALLET_PACKS)}")

    cfg = WALLET_PACKS[pack]
    idempotency_key = str(uuid.uuid4())

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.yookassa.ru/v3/payments",
            auth=(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY),
            headers={"Idempotence-Key": idempotency_key},
            json={
                "amount": {"value": f"{cfg['price_rub']:.2f}", "currency": "RUB"},
                "confirmation": {
                    "type": "redirect",
                    "return_url": f"{settings.APP_URL}/dashboard?wallet=success",
                },
                "capture": True,
                "description": build_payment_description(
                    f"Dicto — пополнение кошелька ({cfg['minutes']} мин)", email
                ),
                "metadata": {
                    "type": "wallet",
                    "user_id": str(user_id),
                    "pack": pack,
                    "email": email or "",
                },
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


async def credit_wallet(
    user_id: uuid.UUID, pack: str, yookassa_id: str, db: AsyncSession
) -> None:
    """Начисление минут на кошелёк (идемпотентно по yookassa_id)."""
    if pack not in WALLET_PACKS:
        logger.error("credit_wallet: unknown pack=%s", pack)
        return

    # Идемпотентность: уже обрабатывали этот платёж?
    existing = await db.execute(
        select(WalletTopup).where(WalletTopup.yookassa_id == yookassa_id)
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("Дубль wallet-webhook, пропускаем: yookassa_id=%s", yookassa_id)
        return

    minutes = WALLET_PACKS[pack]["minutes"]
    db.add(WalletTopup(user_id=user_id, yookassa_id=yookassa_id, minutes=minutes, pack=pack))

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user:
        user.wallet_minutes += minutes

    await db.commit()
    logger.info("Wallet credited: user=%s pack=%s minutes=%s", user_id, pack, minutes)


# verify_webhook_signature удалена: ЮKassa не подписывает webhook'и HMAC.
# Защита переехала в /api/payments/webhook → is_yookassa_ip (source IP whitelist)
# + verify_payment_via_api (independent re-fetch с проверкой amount/status).
