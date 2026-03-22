import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.ai_analysis import AiAnalysis
from app.models.transcription import Transcription
from app.models.user import User
from app.schemas.ai_analysis import AiAnalysisResponse
from app.services.ai_analysis import generate_analysis

router = APIRouter(prefix="/api/transcriptions", tags=["ai-analysis"])


async def _get_or_create_analysis(
    transcription_id: uuid.UUID,
    analysis_type: str,
    user: User,
    db: AsyncSession,
) -> AiAnalysis:
    """Получить кэшированный анализ или создать новый."""
    # Проверяем доступ к транскрипции
    result = await db.execute(
        select(Transcription).where(
            Transcription.id == transcription_id,
            Transcription.user_id == user.id,
        )
    )
    transcription = result.scalar_one_or_none()
    if transcription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транскрипция не найдена")

    if transcription.status != "completed" or not transcription.full_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Транскрипция ещё не завершена",
        )

    # Проверяем кэш
    result = await db.execute(
        select(AiAnalysis).where(
            AiAnalysis.transcription_id == transcription_id,
            AiAnalysis.type == analysis_type,
        )
    )
    cached = result.scalar_one_or_none()
    if cached:
        return cached

    # Генерируем анализ
    content, tokens = await generate_analysis(transcription.full_text, analysis_type)

    analysis = AiAnalysis(
        transcription_id=transcription_id,
        type=analysis_type,
        content=content,
        model_used="gpt-4o-mini",
        tokens_used=tokens,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    return analysis


@router.get("/{transcription_id}/summary", response_model=AiAnalysisResponse)
async def get_summary(
    transcription_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-саммари транскрипции."""
    return await _get_or_create_analysis(transcription_id, "summary", user, db)


@router.get("/{transcription_id}/key-points", response_model=AiAnalysisResponse)
async def get_key_points(
    transcription_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ключевые тезисы транскрипции."""
    return await _get_or_create_analysis(transcription_id, "key_points", user, db)


@router.get("/{transcription_id}/action-items", response_model=AiAnalysisResponse)
async def get_action_items(
    transcription_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Action items из транскрипции."""
    return await _get_or_create_analysis(transcription_id, "action_items", user, db)
