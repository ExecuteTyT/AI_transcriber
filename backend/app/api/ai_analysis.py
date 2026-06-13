import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.ai_analysis import AiAnalysis
from app.models.transcription import Transcription
from app.models.user import User
from app.schemas.ai_analysis import AiAnalysisResponse
from app.services.ai_analysis import generate_analysis
from app.services.plans import get_plan

router = APIRouter(prefix="/api/transcriptions", tags=["ai-analysis"])


async def _check_analysis_limits(
    user: User,
    analysis_type: str,
    db: AsyncSession,
) -> None:
    """Проверка лимитов AI-анализа по тарифу."""
    if user.is_admin:
        return  # Админы без лимитов

    from app.services.plans import has_paid_access
    if has_paid_access(user):
        return  # платный доступ (подписка или кошелёк) — без free-лимитов

    plan = get_plan(user.plan)

    # Action items только для платных (Pro / кошелёк)
    if analysis_type == "action_items" and not plan.action_items:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "reason": "analysis_locked",
                "message": "Задачи (action items) доступны на Pro или с кошелька.",
                "paths": ["wallet", "pro"],
            },
        )

    # Лимит саммари для free (распространяется на summary и key_points).
    # Считаем УНИКАЛЬНЫЕ (transcription_id, type), а не строки: разные уровни
    # объёма одного анализа — это одна единица лимита, а не три.
    if plan.ai_summaries != -1 and analysis_type in ("summary", "key_points"):
        now = datetime.now(timezone.utc)
        distinct_pairs = (
            select(AiAnalysis.transcription_id, AiAnalysis.type)
            .join(Transcription, AiAnalysis.transcription_id == Transcription.id)
            .where(
                Transcription.user_id == user.id,
                AiAnalysis.type.in_(["summary", "key_points"]),
                extract("month", AiAnalysis.created_at) == now.month,
                extract("year", AiAnalysis.created_at) == now.year,
            )
            .distinct()
            .subquery()
        )
        used = (await db.execute(select(func.count()).select_from(distinct_pairs))).scalar() or 0
        if used >= plan.ai_summaries:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "reason": "analysis_locked",
                    "message": "Бесплатный разбор использован. Больше разборов — на Pro или с кошелька.",
                    "paths": ["wallet", "pro"],
                },
            )


async def _get_or_create_analysis(
    transcription_id: uuid.UUID,
    analysis_type: str,
    length: str,
    user: User,
    db: AsyncSession,
) -> AiAnalysis:
    """Получить кэшированный анализ или создать/перегенерировать под нужный объём.

    Логика по уровню (short/standard/detailed):
    - кэш есть и совпадает length → отдаём кэш (лимит не тратится);
    - кэш есть, но другой length → ПЕРЕгенерируем и обновляем ту же строку
      (UPDATE, не новая запись → счётчик лимита не растёт);
    - кэша нет → проверяем лимит тарифа и создаём.
    """
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

    # Кэш именно этого уровня объёма (transcription, type, length).
    result = await db.execute(
        select(AiAnalysis).where(
            AiAnalysis.transcription_id == transcription_id,
            AiAnalysis.type == analysis_type,
            AiAnalysis.length == length,
        )
    )
    cached = result.scalar_one_or_none()
    if cached:
        return cached  # уже сгенерировано на этом уровне — отдаём без новой генерации

    # Есть ли уже какой-нибудь уровень этого анализа? Если да — это просто ещё
    # один уровень уже оплаченного анализа: лимит не тратим (и токены ограничены
    # тремя уровнями — цикл перегенерации невозможен).
    existing_any = (await db.execute(
        select(AiAnalysis.id)
        .where(
            AiAnalysis.transcription_id == transcription_id,
            AiAnalysis.type == analysis_type,
        )
        .limit(1)
    )).scalar_one_or_none()

    if existing_any is None:
        await _check_analysis_limits(user, analysis_type, db)

    content, tokens = await generate_analysis(transcription.full_text, analysis_type, length)

    analysis = AiAnalysis(
        transcription_id=transcription_id,
        type=analysis_type,
        content=content,
        length=length,
        model_used="gemini-2.5-flash",
        tokens_used=tokens,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    return analysis


Length = Literal["short", "standard", "detailed"]


@router.get("/{transcription_id}/summary", response_model=AiAnalysisResponse)
async def get_summary(
    transcription_id: uuid.UUID,
    length: Length = Query("standard"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-саммари транскрипции (объём: short/standard/detailed)."""
    return await _get_or_create_analysis(transcription_id, "summary", length, user, db)


@router.get("/{transcription_id}/key-points", response_model=AiAnalysisResponse)
async def get_key_points(
    transcription_id: uuid.UUID,
    length: Length = Query("standard"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ключевые тезисы транскрипции (объём: short/standard/detailed)."""
    return await _get_or_create_analysis(transcription_id, "key_points", length, user, db)


@router.get("/{transcription_id}/action-items", response_model=AiAnalysisResponse)
async def get_action_items(
    transcription_id: uuid.UUID,
    length: Length = Query("standard"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Action items из транскрипции (объём: short/standard/detailed)."""
    return await _get_or_create_analysis(transcription_id, "action_items", length, user, db)
