"""Pydantic-схемы для API согласий (152-ФЗ)."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ConsentResponse(BaseModel):
    """Запись о согласии для GET /api/users/me/consents."""

    consent_type: str
    granted: bool
    granted_at: datetime
    revoked_at: datetime | None = None
    policy_version: str

    model_config = {"from_attributes": True}


class RevokeConsentRequest(BaseModel):
    """Запрос на отзыв согласия. Через этот эндпоинт можно отозвать только
    маркетинг — обязательные согласия (pd_processing, cross_border) отзываются
    только через DELETE /api/users/me (удаление аккаунта)."""

    consent_type: Literal["marketing"]
