"""User self-service API: согласия, удаление аккаунта (152-ФЗ)."""
import hashlib
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.user_consent import (
    CONSENT_TYPES_VALID,
    UserConsent,
)
from app.schemas.auth import MessageResponse
from app.schemas.consent import ConsentResponse, RevokeConsentRequest
from app.services.audit_log import audit
from app.services.consents import extract_client_metadata, revoke_consent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me/consents", response_model=list[ConsentResponse])
async def get_my_consents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список ВСЕХ согласий текущего пользователя из журнала.

    Возвращает строки в порядке от новых к старым — последняя строка
    каждого consent_type это актуальное состояние (granted=true/false).
    Для UI: достаточно показать последнюю строку каждого типа.
    """
    result = await db.execute(
        select(UserConsent)
        .where(UserConsent.user_id == user.id)
        .order_by(UserConsent.granted_at.desc())
    )
    rows = result.scalars().all()
    return rows


@router.post("/me/consents/revoke", response_model=MessageResponse)
async def revoke_my_consent(
    request: Request,
    data: RevokeConsentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отзыв согласия. Через этот эндпоинт можно отозвать только marketing —
    обязательные согласия (pd_processing, cross_border) отзываются только
    через DELETE /api/users/me (полное удаление аккаунта)."""
    if data.consent_type not in CONSENT_TYPES_VALID:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Неизвестный тип согласия")

    ip, user_agent = extract_client_metadata(request)
    await revoke_consent(
        db,
        user_id=user.id,
        consent_type=data.consent_type,
        ip_address=ip,
        user_agent=user_agent,
    )
    await db.commit()
    return MessageResponse(message=f"Согласие '{data.consent_type}' отозвано")


@router.delete("/me", response_model=MessageResponse)
async def delete_my_account(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Полное удаление аккаунта (152-ФЗ право на забвение).

    Шаги:
    1. Помечаем все активные согласия как revoked в журнале.
    2. Запускаем Celery-таску `delete_user_data(user_id)` — она в фоне
       удаляет S3-файлы, транскрипции и embeddings (CASCADE подхватит
       связанные таблицы при удалении user).
    3. Сразу анонимизируем email (ставим placeholder), чтобы клиент мог
       зарегистрироваться заново тем же адресом без коллизии.

    Логируем факт удаления (для акта уничтожения) — email только хешем.
    """
    ip, user_agent = extract_client_metadata(request)

    # 1) Журнал: помечаем все активные согласия как отозванные.
    now = datetime.now(timezone.utc)
    await db.execute(
        update(UserConsent)
        .where(
            UserConsent.user_id == user.id,
            UserConsent.granted == True,  # noqa: E712
            UserConsent.revoked_at.is_(None),
        )
        .values(revoked_at=now, granted=False)
    )

    # 2) Запускаем Celery-таску на удаление данных. Импорт внутри функции
    # чтобы избежать циклических импортов (tasks → models).
    try:
        from app.tasks.delete_user_data import delete_user_data

        delete_user_data.apply_async(args=[str(user.id)], countdown=2)
    except Exception:
        # Если Celery упал — продолжаем, но логируем критично.
        logger.exception("Failed to queue delete_user_data for user %s", user.id)

    # 3) Анонимизация: освобождаем email (для повторной регистрации) и
    # ставим placeholder. Полное удаление User отрабатывает Celery-таска.
    email_hash = hashlib.sha256(user.email.encode()).hexdigest()
    user.email = f"deleted_{user.id}@deleted.dicto.pro"
    user.name = ""
    user.password_hash = ""  # запрещаем вход
    await db.commit()

    audit(
        "account_deleted",
        user_id=str(user.id),
        email_hash=email_hash,
        reason="user-request",
        ip=ip,
    )

    return MessageResponse(
        message="Аккаунт удалён. Все ваши данные будут полностью стёрты в течение 24 часов."
    )
