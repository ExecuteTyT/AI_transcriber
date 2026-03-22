import uuid

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    """Запрос на регистрацию."""

    email: EmailStr
    password: str
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

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Ответ с сообщением."""

    message: str
