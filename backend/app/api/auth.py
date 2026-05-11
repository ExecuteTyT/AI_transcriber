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
    LogoutRequest,
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
    decode_token,
    hash_password,
    verify_password,
)
from app.services.email import send_password_reset_email, send_welcome_email
from app.services.refresh_tokens import (
    InvalidToken,
    TokenRevoked,
    TokenReused,
    consume_and_rotate,
    issue_refresh_token,
    revoke_all_user,
    revoke_one_by_token,
)

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

    # Выпуск refresh-токена с jti до commit'а (одна транзакция: user +
    # consents + refresh_tokens). issue_refresh_token делает db.flush(),
    # чтобы получить FK для replaced_by_id в будущих ротациях.
    refresh_token, _ = await issue_refresh_token(
        db, user_id=user.id, ip=ip, user_agent=user_agent,
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
        refresh_token=refresh_token,
    )


@router.post("/login", response_model=TokenResponse)
@_auth_limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Вход в систему.

    Account lockout: 10 неудачных попыток подряд блокируют аккаунт на 15 минут.
    Защита от credential stuffing — даже с rate-limit по IP (slowapi), атакующий
    с ботнетом может пробовать 10000 паролей. Лимит per-user добавляет блок.
    """
    LOCKOUT_THRESHOLD = 10
    LOCKOUT_MINUTES = 15

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # 1. Невалидный пользователь — generic 401 (anti-enumeration).
    #    Не инкрементим счётчик: его некуда писать, и это даёт attacker'у
    #    сигнал «email существует если ответ медленнее».
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    # 2. Проверка lockout ДО проверки пароля — иначе валидный пароль откроет
    #    заблокированный аккаунт.
    now = datetime.now(timezone.utc)
    if user.locked_until is not None and user.locked_until > now:
        seconds_left = int((user.locked_until - now).total_seconds())
        minutes_left = max(1, (seconds_left + 59) // 60)
        # 423 Locked — semantic correct, ловится фронтом отдельно.
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Аккаунт временно заблокирован, попробуйте через {minutes_left} мин",
        )

    # 3. Проверка пароля.
    if not verify_password(data.password, user.password_hash):
        user.failed_login_count = (user.failed_login_count or 0) + 1
        if user.failed_login_count >= LOCKOUT_THRESHOLD:
            from datetime import timedelta as _td
            user.locked_until = now + _td(minutes=LOCKOUT_MINUTES)
            await db.commit()
            from app.services.audit_log import audit
            audit(
                "account_locked",
                user_id=str(user.id),
                failed_count=user.failed_login_count,
                lockout_minutes=LOCKOUT_MINUTES,
            )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Слишком много попыток. Аккаунт заблокирован на {LOCKOUT_MINUTES} мин",
            )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    # 4. Успех — сбрасываем счётчик и locked_until.
    if user.failed_login_count or user.locked_until:
        user.failed_login_count = 0
        user.locked_until = None

    # Refresh-токен с jti — для single-use rotation (RFC 6819 §5.2.2.3).
    from app.services.consents import extract_client_metadata

    ip, user_agent = extract_client_metadata(request)
    refresh_token, _ = await issue_refresh_token(
        db, user_id=user.id, ip=ip, user_agent=user_agent,
    )
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Обновление токенов с rotation: старый помечается consumed, выпускается новый.

    RFC 6819 §5.2.2.3 reuse detection: попытка использовать уже-consumed
    токен трактуется как кража — revoke ВСЕ refresh-токены этого юзера.
    """
    from app.services.consents import extract_client_metadata

    ip, user_agent = extract_client_metadata(request)
    try:
        new_refresh, _expires, user_uuid = await consume_and_rotate(
            db, token=data.refresh_token, ip=ip, user_agent=user_agent,
        )
    except TokenReused:
        # revoke_family + audit уже сделаны внутри. На клиенте — re-login.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сессия скомпрометирована — войдите заново",
        )
    except (InvalidToken, TokenRevoked):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh-токен",
        )

    # Проверяем что юзер вообще существует (мог быть удалён между issue и refresh).
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    await db.commit()
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=new_refresh,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    data: LogoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Выход из системы — отзыв refresh-токена в БД (RFC 6819).

    Если `all_devices=True` — отзываем все активные refresh-токены юзера.
    Иначе отзываем только переданный refresh_token (если есть и валиден).
    Logout идемпотентен: даже если токен уже отозван — возвращаем 200.
    """
    from app.models.refresh_token import REVOKE_LOGOUT

    if data.all_devices:
        count = await revoke_all_user(db, user_id=user.id, reason=REVOKE_LOGOUT)
        await db.commit()
        return MessageResponse(message=f"Выход выполнен ({count} сессий)")

    if data.refresh_token:
        await revoke_one_by_token(db, token=data.refresh_token, reason=REVOKE_LOGOUT)
        await db.commit()
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

    from app.models.refresh_token import REVOKE_PASSWORD_CHANGE

    user.password_hash = hash_password(data.new_password)
    # Защита: смена пароля выкидывает все активные сессии. Иначе укравший
    # refresh-токен продолжает minted'ить access-токены даже после смены.
    await revoke_all_user(db, user_id=user.id, reason=REVOKE_PASSWORD_CHANGE)
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

    from app.models.refresh_token import REVOKE_PASSWORD_RESET

    user.password_hash = hash_password(data.new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    # Сброс пароля = смена компрометирующих учётных данных. Все refresh-
    # токены пользователя отзываем, чтобы атакующий с украденным токеном
    # не сохранил доступ после успешного reset'а владельцем аккаунта.
    await revoke_all_user(db, user_id=user.id, reason=REVOKE_PASSWORD_RESET)
    await db.commit()

    return MessageResponse(message="Пароль успешно изменён")
