import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.payment import (
    SubscribeRequest,
    SubscribeResponse,
    SubscriptionResponse,
    WalletTopupRequest,
    WalletTopupResponse,
    WebhookEvent,
)
from app.services.payment import (
    PLAN_PRICES,
    activate_subscription,
    cancel_subscription,
    create_payment,
    create_wallet_payment,
    credit_wallet,
    is_yookassa_ip,
    verify_payment_via_api,
)
from app.services.plans import WALLET_PACKS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    req: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создание платежа для подписки через ЮKassa."""
    # Источник истины — PLAN_PRICES (все платные тарифы: start, pro, expert,
    # premium). Раньше тут был жёстко зашит ("start", "pro"), из-за чего клик
    # по Эксперт/Премиум на /pricing возвращал 400 и оплата не открывалась.
    if req.plan not in PLAN_PRICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые планы: {', '.join(PLAN_PRICES)}",
        )

    if user.plan == req.plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Вы уже на тарифе {req.plan}",
        )

    try:
        payment = await create_payment(user.id, req.plan)
    except Exception as e:
        logger.exception("Payment creation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ошибка при создании платежа. Попробуйте позже.",
        )

    return SubscribeResponse(
        payment_id=payment["id"],
        confirmation_url=payment["confirmation"]["confirmation_url"],
        status=payment["status"],
    )


@router.post("/wallet", response_model=WalletTopupResponse)
async def topup_wallet(
    req: WalletTopupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создание платежа для пополнения кошелька (пакет минут)."""
    if req.pack not in WALLET_PACKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые пакеты: {', '.join(WALLET_PACKS)}",
        )
    try:
        payment = await create_wallet_payment(user.id, req.pack)
    except Exception as e:
        logger.exception("Wallet payment creation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ошибка при создании платежа. Попробуйте позже.",
        )
    return WalletTopupResponse(
        payment_id=payment["id"],
        confirmation_url=payment["confirmation"]["confirmation_url"],
        status=payment["status"],
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def yookassa_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Webhook от ЮKassa для обработки платежей.

    Защита по документированной схеме ЮKassa
    (https://yookassa.ru/developers/using-api/webhooks):

    1. IP-allowlist — source IP должен быть из YOOKASSA_WEBHOOK_IP_NETWORKS.
       Это режет 99% форжей. ЮKassa не подписывает webhook'и HMAC.
    2. Re-fetch verification — берём payment_id из webhook, делаем независимый
       GET /v3/payments/{id} к ЮKassa с нашими credentials, проверяем что
       payment реально существует со статусом succeeded и нужным amount.
       Это закрывает оставшийся 1% (если кто-то спуфит IP).
    3. Amount check — сравниваем amount из re-fetch с PLAN_PRICES[plan].
       Гарантирует что юзер не получит Pro заплатив за Start.

    Старый HMAC через YOOKASSA_WEBHOOK_SECRET удалён — этого секрета нет
    в природе ЮKassa, это был самопал в нашем коде.
    """
    # 1. IP-allowlist — берём X-Forwarded-For (за nginx) либо client.host.
    forwarded = request.headers.get("x-forwarded-for") or ""
    if forwarded:
        source_ip = forwarded.split(",")[0].strip()
    else:
        source_ip = request.client.host if request.client else ""

    if not is_yookassa_ip(source_ip):
        logger.warning("Webhook rejected: source IP %s not in YooKassa allowlist", source_ip)
        # 200 чтобы не дать злоумышленнику feedback что мы не приняли —
        # ЮKassa retries только на 5xx, 200 окончательно закроет диалог.
        return {"status": "ok"}

    try:
        data = await request.json()
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невалидный JSON",
        )

    # ВАЖНО: ЮKassa шлёт webhook в формате {"type": "notification", "event": "...", "object": {...}}.
    # Раньше код искал событие в `type` — это всегда "notification". То есть
    # никакая обработка никогда не срабатывала (даже до Origin-фикса). Берём
    # из правильного поля `event`. Документация:
    # https://yookassa.ru/developers/using-api/webhooks#response
    event_name = data.get("event", "")
    payment_obj = data.get("object", {})
    yookassa_id = payment_obj.get("id", "")

    # payment.canceled — юзер начал оплату но не завершил (отменил/expired/недостаточно
    # средств). Подписки ещё нет, нечего откатывать. Просто логируем для аудита.
    if event_name == "payment.canceled":
        logger.info("Payment canceled: %s", yookassa_id)
        return {"status": "ok"}

    # payment.waiting_for_capture — наши платежи создаются с capture=True
    # (auto-capture), поэтому это событие у нас не должно возникать. Если
    # пришло — игнорируем, не падая (логируем для диагностики).
    if event_name == "payment.waiting_for_capture":
        logger.info("Payment waiting for capture (unexpected with capture=True): %s", yookassa_id)
        return {"status": "ok"}

    # refund.succeeded — возврат денег покупателю. Подписка которая была
    # активирована этим платежом должна быть деактивирована, юзер возвращается
    # на free план. payment_id в refund-object указывает на оригинальный платёж.
    if event_name == "refund.succeeded":
        original_payment_id = payment_obj.get("payment_id", "")
        if not original_payment_id:
            logger.warning("refund.succeeded without payment_id: %s", yookassa_id)
            return {"status": "ok"}
        # Находим подписку по yookassa_id = original_payment_id и откатываем.
        result = await db.execute(
            select(Subscription).where(Subscription.yookassa_id == original_payment_id)
        )
        sub = result.scalar_one_or_none()
        if sub is None:
            logger.warning("Refund for unknown payment: %s", original_payment_id)
            return {"status": "ok"}
        # cancel_subscription переводит status=cancelled и опускает user.plan на free.
        await cancel_subscription(sub.id, db)
        logger.info(
            "Subscription refunded: subscription_id=%s payment_id=%s refund_id=%s",
            sub.id, original_payment_id, yookassa_id,
        )
        return {"status": "ok"}

    if event_name != "payment.succeeded":
        logger.info("Webhook event ignored: event=%s id=%s", event_name, yookassa_id)
        return {"status": "ok"}

    # 2. Re-fetch payment у ЮKassa — единственный надёжный способ проверить
    # что webhook реальный, а не форж с поддельным IP.
    verified = await verify_payment_via_api(yookassa_id)
    if verified is None:
        logger.warning("Webhook %s: payment not found via API — possibly forged", yookassa_id)
        return {"status": "ok"}

    if verified.get("status") != "succeeded":
        logger.warning(
            "Webhook %s: API says status=%s, not succeeded — ignoring",
            yookassa_id, verified.get("status"),
        )
        return {"status": "ok"}

    metadata = verified.get("metadata", {})

    # Ветка кошелька: пополнение баланса (не подписка). Отделяем по metadata.type.
    if metadata.get("type") == "wallet":
        pack = metadata.get("pack")
        wallet_user_id = metadata.get("user_id")
        if not (pack and wallet_user_id):
            logger.warning("Wallet webhook %s: missing pack/user_id", yookassa_id)
            return {"status": "ok"}
        expected = f"{WALLET_PACKS.get(pack, {}).get('price_rub', -1):.2f}"
        actual = (verified.get("amount") or {}).get("value")
        if pack not in WALLET_PACKS or actual != expected:
            logger.error(
                "Wallet webhook %s: amount mismatch expected=%s got=%s pack=%s",
                yookassa_id, expected, actual, pack,
            )
            return {"status": "ok"}
        await credit_wallet(uuid.UUID(wallet_user_id), pack, yookassa_id, db)
        return {"status": "ok"}

    user_id_str = metadata.get("user_id")
    plan = metadata.get("plan")

    if not (user_id_str and plan):
        logger.warning("Webhook %s: missing user_id/plan in metadata", yookassa_id)
        return {"status": "ok"}

    # 3. Amount check — webhook'у нельзя доверять выбор тарифа без подтверждения
    # что заплатили именно эту сумму. Защищает от подмены metadata.plan.
    expected_amount = PLAN_PRICES.get(plan)
    actual_amount = (verified.get("amount") or {}).get("value")
    if expected_amount is None or actual_amount != expected_amount:
        logger.error(
            "Webhook %s: amount mismatch — expected %s for plan=%s, got %s. NOT activating.",
            yookassa_id, expected_amount, plan, actual_amount,
        )
        return {"status": "ok"}

    try:
        await activate_subscription(
            user_id=uuid.UUID(user_id_str),
            plan=plan,
            yookassa_id=yookassa_id,
            db=db,
        )
    except Exception as e:
        logger.exception("Subscription activation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка активации подписки",
        )

    return {"status": "ok"}


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получение текущей подписки и лимитов."""
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()

    if sub:
        return SubscriptionResponse(
            id=sub.id,
            plan=sub.plan,
            status=sub.status,
            minutes_used=user.minutes_used,
            minutes_limit=user.minutes_limit,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
        )

    return SubscriptionResponse(
        plan=user.plan,
        status="none",
        minutes_used=user.minutes_used,
        minutes_limit=user.minutes_limit,
    )


@router.post("/cancel", response_model=MessageResponse)
async def cancel_sub(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отмена текущей подписки."""
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная подписка не найдена",
        )

    await cancel_subscription(sub.id, db)
    return MessageResponse(message="Подписка отменена. Текущий период действует до окончания.")
