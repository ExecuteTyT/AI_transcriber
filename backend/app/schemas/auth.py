import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Запрос на регистрацию.

    152-ФЗ: согласия pd_processing и cross_border ОБЯЗАТЕЛЬНЫ — endpoint
    возвращает 422 если хотя бы одно False. Marketing — опционально.
    """

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = ""
    # Обязательные согласия. Старые поля consent_terms/consent_cross_border
    # оставлены как алиасы для обратной совместимости со старым клиентом.
    consent_pd_processing: bool = False
    consent_cross_border: bool = False
    # Опциональное согласие на маркетинг.
    consent_marketing: bool = False
    # Backward compat: старый чекбокс «Принимаю политику» совпадает по
    # смыслу с pd_processing. Если фронт прислал только consent_terms,
    # маршрутизатор использует его как pd_processing.
    consent_terms: bool = False


class LoginRequest(BaseModel):
    """Запрос на вход."""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Запрос на обновление токена."""

    refresh_token: str


class TokenResponse(BaseModel):
    """Ответ с JWT-токенами."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Данные пользователя."""

    id: uuid.UUID
    email: str
    name: str
    plan: str
    minutes_used: int
    minutes_limit: int
    is_email_verified: bool = False
    is_admin: bool = False
    data_retention_days: int | None = 30
    default_audio_retention_days: int = 7
    default_language: str = "auto"
    bonus_minutes: int = 0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Ответ с сообщением."""

    message: str


# --- Profile ---

class UpdateProfileRequest(BaseModel):
    """Обновление профиля."""

    name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    current_password: str | None = Field(None, description="Обязателен при смене email")
    # Срок хранения транскрипций в днях (1-30). None = бессрочно (только Pro/Бизнес).
    data_retention_days: int | None = Field(None, ge=1, le=30)
    # 152-ФЗ: дефолтный срок хранения АУДИО для новых транскрипций (1-30).
    default_audio_retention_days: int | None = Field(None, ge=1, le=30)
    # Язык распознавания по умолчанию (ISO-код: ru/en/de/… или "auto").
    default_language: str | None = Field(None, min_length=2, max_length=10)


class ChangePasswordRequest(BaseModel):
    """Смена пароля (авторизованный пользователь)."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# --- Password reset ---

class RequestPasswordResetRequest(BaseModel):
    """Запрос на сброс пароля."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Сброс пароля по токену."""

    token: str
    email: EmailStr
    new_password: str = Field(..., min_length=8, max_length=128)
