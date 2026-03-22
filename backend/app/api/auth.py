import hashlib
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

# Отдельный лимитер для auth (строже чем глобальный)
_auth_limiter = Limiter(key_func=get_remote_address, enabled=settings.ENVIRONMENT not in ("testing", "test"))
from app.models.user import User
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
    """Регистрация нового пользователя."""
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже существует",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Приветственное письмо (неблокирующее)
    try:
        send_welcome_email(user.email, user.name)
    except Exception:
        pass

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
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Этот email уже используется",
            )
        user.email = data.email
        user.is_email_verified = False

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

        send_password_reset_email(user.email, token)

    return MessageResponse(message="Если аккаунт существует, мы отправили ссылку для сброса пароля")


@router.post("/reset-password", response_model=MessageResponse)
@_auth_limiter.limit("5/minute")
async def reset_password(
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
