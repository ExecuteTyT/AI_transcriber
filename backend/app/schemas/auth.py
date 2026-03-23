import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Запрос на регистрацию."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = ""


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
