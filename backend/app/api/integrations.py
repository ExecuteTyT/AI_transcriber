"""Интеграция с Telegram-ботом.

Бот — тонкий клиент поверх обычного API. Здесь только то, чего нет у веба:
1. /auth — bot-only эндпоинт (guard по BOT_INTERNAL_SECRET): по telegram_id
   находит/создаёт аккаунт Dicto, либо привязывает существующий по link_code,
   и возвращает JWT-пару. Дальше бот ходит обычными ручками с Bearer-токеном.
2. /link-token — для веб-юзера (обычная JWT-авторизация): выдаёт одноразовый
   код для deep-link t.me/<bot>?start=<code>, чтобы привязать Telegram к
   существующему аккаунту.
"""
import hmac
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.telegram_link_code import TelegramLinkCode
from app.models.user import User
from app.services.auth import hash_password
from app.services.refresh_tokens import issue_refresh_token
from app.services.auth import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/integrations/telegram", tags=["integrations"])

LINK_CODE_TTL_SECONDS = 600


# ─── Schemas ───

class TelegramAuthRequest(BaseModel):
    telegram_id: int
    tg_name: str = ""
    link_code: str | None = None


class TelegramAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: uuid.UUID
    plan: str
    minutes_used: int
    minutes_limit: int
    bonus_minutes: int
    wallet_minutes: int
    is_new: bool        # аккаунт только что авто-создан
    linked: bool        # привязка к существующему веб-аккаунту по коду


class LinkTokenResponse(BaseModel):
    deep_link: str
    code: str
    expires_in: int


# ─── Guard ───

async def verify_bot_secret(x_bot_secret: str = Header(default="")) -> None:
    """Защита bot-only эндпоинтов: общий секрет в заголовке X-Bot-Secret.

    Маршрут внутренний (бот → api по compose-сети), но через nginx /api/* он
    технически доступен снаружи — поэтому секрет обязателен. Если секрет не
    сконфигурирован, эндпоинт закрыт полностью (fail-closed).
    """
    expected = settings.BOT_INTERNAL_SECRET
    if not expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integration disabled")
    if not hmac.compare_digest(x_bot_secret, expected):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


# ─── Helpers ───

async def _mint_tokens(db: AsyncSession, user: User) -> tuple[str, str]:
    """Access + refresh для юзера (refresh пишет строку в журнал; коммит у caller)."""
    refresh_token, _ = await issue_refresh_token(db, user_id=user.id, ip=None, user_agent="telegram-bot")
    return create_access_token(str(user.id)), refresh_token


async def _resolve_link_code(db: AsyncSession, code: str) -> User | None:
    """Валидный (не использован, не истёк) код → веб-юзер, иначе None."""
    now = datetime.now(timezone.utc)
    row = (await db.execute(
        select(TelegramLinkCode).where(TelegramLinkCode.code == code)
    )).scalar_one_or_none()
    if row is None or row.used_at is not None:
        return None
    # SQLite отдаёт naive datetime, Postgres — aware; нормализуем к UTC-aware.
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        return None
    user = (await db.execute(select(User).where(User.id == row.user_id))).scalar_one_or_none()
    if user is not None:
        row.used_at = now
    return user


# ─── Endpoints ───

@router.post("/auth", response_model=TelegramAuthResponse)
async def telegram_auth(
    data: TelegramAuthRequest,
    _: None = Depends(verify_bot_secret),
    db: AsyncSession = Depends(get_db),
):
    """Идентификация Telegram-юзера → JWT-пара для аккаунта Dicto.

    Порядок: link_code (привязка веб-аккаунта) → существующий по telegram_id →
    авто-создание нового аккаунта (синтетический email, бонус 30 мин).
    """
    is_new = False
    linked = False

    user: User | None = None

    # 1. Привязка существующего веб-аккаунта по одноразовому коду.
    if data.link_code:
        user = await _resolve_link_code(db, data.link_code)
        if user is not None:
            linked = True
            # Если этот telegram_id уже висел на другом (синтетическом) аккаунте —
            # отцепляем, чтобы не нарушить unique. Старый аккаунт остаётся, но без
            # привязки (его данные не сливаем — merge вне рамок MVP).
            other = (await db.execute(
                select(User).where(User.telegram_id == data.telegram_id, User.id != user.id)
            )).scalar_one_or_none()
            if other is not None:
                other.telegram_id = None
                await db.flush()
            user.telegram_id = data.telegram_id

    # 2. Существующий аккаунт по telegram_id.
    if user is None:
        user = (await db.execute(
            select(User).where(User.telegram_id == data.telegram_id)
        )).scalar_one_or_none()

    # 3. Авто-создание нового аккаунта.
    if user is None:
        now = datetime.now(timezone.utc)
        user = User(
            email=f"tg{data.telegram_id}@telegram.dicto.pro",
            password_hash=hash_password(secrets.token_urlsafe(32)),  # вход паролем невозможен
            name=(data.tg_name or "Telegram")[:255],
            telegram_id=data.telegram_id,
            is_email_verified=True,
            consent_terms_at=now,
            consent_cross_border_at=now,
        )
        db.add(user)
        await db.flush()
        is_new = True

        # Журнал согласий (152-ФЗ): согласие даётся в /start до обработки ПД.
        from app.services.consents import (
            CONSENT_TYPE_CROSS_BORDER,
            CONSENT_TYPE_PD_PROCESSING,
            record_consent,
        )
        for ctype in (CONSENT_TYPE_PD_PROCESSING, CONSENT_TYPE_CROSS_BORDER):
            await record_consent(
                db, user_id=user.id, consent_type=ctype, granted=True,
                ip_address=None, user_agent="telegram-bot",
            )

    access_token, refresh_token = await _mint_tokens(db, user)
    await db.commit()
    await db.refresh(user)

    return TelegramAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        plan=user.plan,
        minutes_used=user.minutes_used,
        minutes_limit=user.minutes_limit,
        bonus_minutes=user.bonus_minutes,
        wallet_minutes=user.wallet_minutes,
        is_new=is_new,
        linked=linked,
    )


@router.post("/link-token", response_model=LinkTokenResponse)
async def create_link_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Одноразовый код для привязки Telegram к текущему веб-аккаунту."""
    code = secrets.token_urlsafe(18)
    db.add(TelegramLinkCode(
        code=code,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=LINK_CODE_TTL_SECONDS),
    ))
    await db.commit()

    username = settings.BOT_USERNAME or "your_bot"
    return LinkTokenResponse(
        deep_link=f"https://t.me/{username}?start={code}",
        code=code,
        expires_in=LINK_CODE_TTL_SECONDS,
    )
