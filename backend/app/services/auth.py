import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings


def hash_jti(jti: str) -> str:
    """sha256(jti) для хранения в БД (refresh_tokens.jti_hash)."""
    return hashlib.sha256(jti.encode()).hexdigest()


def hash_password(password: str) -> str:
    """Хеширование пароля через bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(subject: str) -> str:
    """Создание access JWT-токена."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> tuple[str, str, datetime]:
    """Создание refresh JWT-токена с уникальным jti для rotation/revoke.

    Возвращает `(token, jti, expires_at)`. Caller (services.refresh_tokens.
    issue_refresh_token) сохраняет в БД `sha256(jti)` + expires_at — это даёт
    нам стейтфул-журнал для single-use rotation и breach detection.

    Сам jti в БД не хранится — только хеш. Атакующий с read-доступом к БД не
    сможет identify конкретный токен или minted'ить новый (нужен JWT_SECRET).
    """
    jti = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {"sub": subject, "exp": expires_at, "type": "refresh", "jti": jti}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expires_at


def decode_token(token: str) -> dict | None:
    """Декодирование и валидация JWT-токена."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None


def create_media_token(
    file_key: str,
    user_id: str,
    *,
    transcription_id: str | None = None,
    expires_in: int = 3600,
) -> str:
    """Подписанный токен для публичного стрима аудио (<audio src>).

    Дополнительно к user_id (sub) и file_key (fk) embed'им transcription_id (tid) —
    чтобы при валидации можно было проверить что file_key реально принадлежит
    запрошенной транскрипции пользователя. Без этого атакующий с одним валидным
    media token'ом мог бы стримить любой file_key (если бы знал — UUIDv4 спасает,
    но это footgun на будущее когда логика поменяется).
    """
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    payload = {
        "sub": user_id,
        "fk": file_key,
        "exp": expire,
        "type": "media",
    }
    if transcription_id is not None:
        payload["tid"] = transcription_id
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_media_token(token: str) -> dict | None:
    """Валидация media-токена."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "media":
        return None
    return payload
