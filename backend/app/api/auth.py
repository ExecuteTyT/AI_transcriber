import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Отдельный лимитер для auth (строже чем глобальный)
_auth_limiter = Limiter(key_func=get_remote_address, enabled=settings.ENVIRONMENT not in ("testing", "test"))
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    RequestPasswordResetRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.email import send_password_reset_email, send_welcome_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _hash_token(token: str) -> str:
    """SHA-256 хеш токена для безопасного хранения в БД."""
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@_auth_limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Регистрация нового пользователя.

    152-ФЗ: согласия pd_processing и cross_border ОБЯЗАТЕЛЬНЫ. Если хотя бы
    одно False — возвращаем 422. Все три согласия пишем в user_consents
    с IP, User-Agent и версией политики (доказательная база при жалобах в РКН).
    """
    # Backward compat: если фронт прислал старое поле consent_terms,
    # но не прислал новое consent_pd_processing — используем consent_terms.
    consent_pd = data.consent_pd_processing or data.consent_terms

    # 152-ФЗ: валидация обязательных согласий.
    if not consent_pd:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Для регистрации необходимо согласие на обработку персональных данных",
        )
    if not data.consent_cross_border:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Для регистрации необходимо согласие на трансграничную передачу данных в Mistral AI (Франция)",
        )

    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    now = datetime.now(timezone.utc)
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        # Старые денормализованные поля — оставлены для обратной совместимости
        # с местами где код смотрит User.consent_*_at напрямую.
        consent_terms_at=now,
        consent_cross_border_at=now,
    )
    db.add(user)
    await db.flush()  # получаем user.id для consent rows

    # Журнал согласий (152-ФЗ).
    from app.services.consents import (
        CONSENT_TYPE_CROSS_BORDER,
        CONSENT_TYPE_MARKETING,
        CONSENT_TYPE_PD_PROCESSING,
        extract_client_metadata,
        record_consent,
    )

    ip, user_agent = extract_client_metadata(request)
    await record_consent(
        db, user_id=user.id, consent_type=CONSENT_TYPE_PD_PROCESSING,
        granted=True, ip_address=ip, user_agent=user_agent,
    )
    await record_consent(
        db, user_id=user.id, consent_type=CONSENT_TYPE_CROSS_BORDER,
        granted=True, ip_address=ip, user_agent=user_agent,
    )
    if data.consent_marketing:
        await record_consent(
            db, user_id=user.id, consent_type=CONSENT_TYPE_MARKETING,
            granted=True, ip_address=ip, user_agent=user_agent,
        )

    await db.commit()
    await db.refresh(user)

    # Приветственное письмо — fire-and-forget в фоне. НЕ блокируем ответ
    # клиенту: SMTP может занять 3-30 секунд (connect, TLS, login, send).
    # Если SMTP упал — логируется через logger.exception в send_email.
    import asyncio as _asyncio

    async def _send_welcome_background(email: str, name: str, marketing: bool):
        try:
            from app.services.email import send_consent_confirmation_email

            # Сначала юридическое подтверждение согласий (152-ФЗ),
            # затем маркетинговое welcome (только если согласие на marketing).
            await send_consent_confirmation_email(email, name, consent_marketing=marketing)
            if marketing:
                await send_welcome_email(email, name)
        except Exception:
            logger.warning("Welcome/consent email failed for %s (background)", email)

    _asyncio.create_task(_send_welcome_background(user.email, user.name, data.consent_marketing))

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
@_auth_limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход в систему."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Обновление токенов по refresh-токену."""
    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh-токен",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(user: User = Depends(get_current_user)):
    """Выход из системы."""
    return MessageResponse(message="Выход выполнен")


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Текущий пользователь."""
    return user


# --- Profile ---


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Обновление профиля (имя, email)."""
    if data.name is not None:
        user.name = data.name

    if data.email is not None and data.email != user.email:
        # Смена email требует подтверждения паролем
        if not data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Для смены email необходимо указать текущий пароль",
            )
        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный пароль",
            )
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Этот email уже используется",
            )
        user.email = data.email
        user.is_email_verified = False

    if data.data_retention_days is not None:
        user.data_retention_days = data.data_retention_days

    if data.default_audio_retention_days is not None:
        user.default_audio_retention_days = data.default_audio_retention_days

    if data.default_language is not None:
        user.default_language = data.default_language.lower().strip()

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Смена пароля авторизованного пользователя."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )

    user.password_hash = hash_password(data.new_password)
    await db.commit()
    return MessageResponse(message="Пароль успешно изменён")


# --- Password reset ---


@router.post("/request-password-reset", response_model=MessageResponse)
@_auth_limiter.limit("3/minute")
async def request_password_reset(
    request: Request,
    data: RequestPasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Запрос на сброс пароля — отправляет ссылку на email."""
    # Всегда отвечаем одинаково (не раскрываем наличие email)
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user is not None:
        token = secrets.token_urlsafe(32)
        user.password_reset_token_hash = _hash_token(token)
        from datetime import timedelta
        user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        )
        await db.commit()

        # Fire-and-forget чтобы не держать клиента в ожидании SMTP-ответа.
        import asyncio as _asyncio

        async def _send_reset_background(email: str, _token: str):
            try:
                await send_password_reset_email(email, _token)
            except Exception:
                logger.warning("Password reset email failed for %s (background)", email)

        _asyncio.create_task(_send_reset_background(user.email, token))

    return MessageResponse(message="Если аккаунт существует, мы отправили ссылку для сброса пароля")


@router.post("/reset-password", response_model=MessageResponse)
@_auth_limiter.limit("5/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Сброс пароля по токену из email."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user is None or user.password_reset_token_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительная ссылка для сброса пароля",
        )

    # Проверяем токен
    if _hash_token(data.token) != user.password_reset_token_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительная ссылка для сброса пароля",
        )

    # Проверяем срок действия
    if user.password_reset_expires_at is None or datetime.now(timezone.utc) > user.password_reset_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Срок действия ссылки истёк",
        )

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    await db.commit()

    return MessageResponse(message="Пароль успешно изменён")
