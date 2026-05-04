"""Сервис фиксации согласий пользователя (152-ФЗ).

Журнал — таблица user_consents. Каждое действие (granted/revoked) — отдельная
строка с IP, User-Agent и версией политики на момент действия.
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user_consent import (
    CONSENT_TYPE_CROSS_BORDER,
    CONSENT_TYPE_MARKETING,
    CONSENT_TYPE_PD_PROCESSING,
    UserConsent,
)
from app.services.audit_log import audit

logger = logging.getLogger(__name__)


def extract_client_metadata(request: Request) -> tuple[str | None, str | None]:
    """Извлекает IP и User-Agent из FastAPI Request.

    IP берём из X-Forwarded-For (если за reverse-proxy) либо request.client.host.
    Только первый IP — он и есть клиент, остальные узлы цепочки.
    """
    forwarded = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip, user_agent


async def record_consent(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    consent_type: str,
    granted: bool,
    ip_address: str | None,
    user_agent: str | None,
) -> UserConsent:
    """Создаёт запись о согласии в журнале. Не коммитит — coller сам решает.

    Логирует событие structlog-style через стандартный logger.info с extra,
    чтобы попало в ротируемый журнал учёта.
    """
    now = datetime.now(timezone.utc)
    record = UserConsent(
        user_id=user_id,
        consent_type=consent_type,
        granted=granted,
        ip_address=ip_address,
        user_agent=user_agent,
        policy_version=settings.POLICY_VERSION,
        granted_at=now,
        created_at=now,
    )
    db.add(record)
    audit(
        "consent_granted" if granted else "consent_recorded_as_false",
        user_id=str(user_id),
        consent_type=consent_type,
        granted=granted,
        ip=ip_address,
        policy_version=settings.POLICY_VERSION,
    )
    return record


async def revoke_consent(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    consent_type: str,
    ip_address: str | None,
    user_agent: str | None,
) -> UserConsent:
    """Записывает факт отзыва согласия. Создаёт НОВУЮ строку (granted=False
    + revoked_at), а старая строка с granted=True остаётся в журнале для
    исторической доказательной базы.
    """
    now = datetime.now(timezone.utc)
    record = UserConsent(
        user_id=user_id,
        consent_type=consent_type,
        granted=False,
        ip_address=ip_address,
        user_agent=user_agent,
        policy_version=settings.POLICY_VERSION,
        granted_at=now,
        revoked_at=now,
        created_at=now,
    )
    db.add(record)
    audit(
        "consent_revoked",
        user_id=str(user_id),
        consent_type=consent_type,
        ip=ip_address,
        policy_version=settings.POLICY_VERSION,
    )
    return record


# Re-export типов для удобства импорта в эндпоинтах.
__all__ = [
    "CONSENT_TYPE_PD_PROCESSING",
    "CONSENT_TYPE_CROSS_BORDER",
    "CONSENT_TYPE_MARKETING",
    "extract_client_metadata",
    "record_consent",
    "revoke_consent",
]
