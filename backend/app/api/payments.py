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
    WebhookEvent,
)
from app.services.payment import (
    activate_subscription,
    cancel_subscription,
    create_payment,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    req: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создание платежа для подписки через ЮKassa."""
    if req.plan not in ("start", "pro"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Допустимые планы: start, pro",
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


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def yookassa_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Вебхук от ЮKassa для обработки платежей."""
    body = await request.body()

    # Проверка подписи вебхука (обязательная)
    signature = request.headers.get("X-Webhook-Signature", "")
    if not verify_webhook_signature(body, signature):
        logger.warning("Webhook rejected: invalid or missing signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невалидная подпись вебхука",
        )

    try:
        data = await request.json()
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Невалидный JSON",
        )

    event_type = data.get("type", "")
    payment_obj = data.get("object", {})

    if event_type == "payment.succeeded":
        metadata = payment_obj.get("metadata", {})
        user_id_str = metadata.get("user_id")
        plan = metadata.get("plan")
        yookassa_id = payment_obj.get("id", "")

        if user_id_str and plan:
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
        else:
            logger.warning("Webhook payment.succeeded without metadata: %s", yookassa_id)

    elif event_type == "payment.canceled":
        logger.info("Payment canceled: %s", payment_obj.get("id"))

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
