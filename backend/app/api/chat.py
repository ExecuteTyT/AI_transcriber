import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.chat_message import ChatMessage
from app.models.transcription import Transcription
from app.models.user import User
from app.schemas.chat import ChatHistoryResponse, ChatMessageResponse, ChatRequest
from app.services.embeddings import ensure_embeddings, search_similar_chunks
from app.services.plans import get_plan
from app.services.rag_chat import embed_question, generate_rag_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcriptions", tags=["chat"])


@router.post("/{transcription_id}/chat", response_model=ChatMessageResponse)
async def send_chat_message(
    transcription_id: uuid.UUID,
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отправить сообщение в RAG-чат по транскрипции."""
    plan = get_plan(user.plan)

    if not user.is_admin and plan.rag_chat_limit == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="RAG-чат недоступен на бесплатном тарифе. Перейдите на Старт или Про.",
        )

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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Транскрипция ещё не завершена")

    if not user.is_admin and plan.rag_chat_limit > 0:
        count_result = await db.execute(
            select(func.count()).select_from(ChatMessage).where(
                ChatMessage.transcription_id == transcription_id,
                ChatMessage.user_id == user.id,
                ChatMessage.role == "user",
            )
        )
        used = count_result.scalar() or 0
        if used >= plan.rag_chat_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Лимит вопросов исчерпан ({used}/{plan.rag_chat_limit}). "
                "Перейдите на тариф Про для безлимитного чата.",
            )

    if not settings.MISTRAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG-чат временно недоступен: не настроен AI-сервис.",
        )

    try:
        await ensure_embeddings(transcription_id, db)
    except Exception as e:
        logger.exception("Ошибка создания embeddings для %s: %s", transcription_id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ошибка генерации embeddings. Попробуйте позже.",
        )

    user_msg = ChatMessage(
        transcription_id=transcription_id,
        user_id=user.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)

    try:
        question_embedding = await embed_question(body.message)
        relevant_chunks = await search_similar_chunks(question_embedding, transcription_id, db)
        answer, references, tokens = await generate_rag_response(body.message, relevant_chunks)
    except Exception as e:
        logger.exception("Ошибка RAG-чата для %s: %s", transcription_id, e)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Ошибка генерации ответа. Попробуйте позже.",
        )

    assistant_msg = ChatMessage(
        transcription_id=transcription_id,
        user_id=user.id,
        role="assistant",
        content=answer,
        references=references,
        tokens_used=tokens,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return assistant_msg


@router.get("/{transcription_id}/chat", response_model=ChatHistoryResponse)
async def get_chat_history(
    transcription_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить историю RAG-чата по транскрипции."""
    result = await db.execute(
        select(Transcription.id).where(
            Transcription.id == transcription_id,
            Transcription.user_id == user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транскрипция не найдена")

    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.transcription_id == transcription_id,
            ChatMessage.user_id == user.id,
        )
        .order_by(ChatMessage.created_at)
    )
    messages = list(result.scalars().all())

    plan = get_plan(user.plan)
    if user.is_admin or plan.rag_chat_limit == -1:
        remaining = -1
    elif plan.rag_chat_limit == 0:
        remaining = 0
    else:
        user_msgs = sum(1 for m in messages if m.role == "user")
        remaining = max(0, plan.rag_chat_limit - user_msgs)

    return ChatHistoryResponse(messages=messages, remaining_questions=remaining)
