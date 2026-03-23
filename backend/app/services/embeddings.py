import logging
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.embedding import Embedding
from app.models.transcription import Transcription

logger = logging.getLogger(__name__)

CHUNK_TARGET_CHARS = 2000  # ~500 tokens
CHUNK_OVERLAP_CHARS = 200


async def ensure_embeddings(transcription_id, db: AsyncSession) -> bool:
    """Создать embeddings если их ещё нет. Возвращает True если создавались."""
    result = await db.execute(
        select(Embedding.id).where(
            Embedding.transcription_id == transcription_id
        ).limit(1)
    )
    if result.scalar_one_or_none() is not None:
        return False  # already exist

    result = await db.execute(
        select(Transcription).where(Transcription.id == transcription_id)
    )
    transcription = result.scalar_one_or_none()
    if not transcription or not transcription.full_text:
        raise ValueError("Transcription not found or has no text")

    chunks = _chunk_transcript(transcription)
    if not chunks:
        return False

    vectors = await _generate_embeddings([c["text"] for c in chunks])

    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        emb = Embedding(
            transcription_id=transcription_id,
            chunk_index=i,
            chunk_text=chunk["text"],
            start_time=chunk.get("start_time"),
            end_time=chunk.get("end_time"),
            embedding=vector,
        )
        db.add(emb)

    await db.commit()
    logger.info("Created %d embeddings for transcription %s", len(chunks), transcription_id)
    return True


def _chunk_transcript(transcription: Transcription) -> list[dict[str, Any]]:
    """Разбить транскрипцию на чанки по сегментам."""
    segments = transcription.segments
    if not segments or not isinstance(segments, list):
        return _chunk_plain_text(transcription.full_text or "")

    chunks: list[dict[str, Any]] = []
    current_text = ""
    current_start: float | None = None
    current_end: float | None = None

    for seg in segments:
        seg_text = seg.get("text", "")
        seg_start = seg.get("start", 0)
        seg_end = seg.get("end", 0)

        if current_start is None:
            current_start = seg_start

        if len(current_text) + len(seg_text) > CHUNK_TARGET_CHARS and current_text:
            chunks.append({
                "text": current_text.strip(),
                "start_time": current_start,
                "end_time": current_end,
            })
            overlap_text = current_text[-CHUNK_OVERLAP_CHARS:] if len(current_text) > CHUNK_OVERLAP_CHARS else ""
            current_text = overlap_text + seg_text + " "
            current_start = seg_start
        else:
            current_text += seg_text + " "

        current_end = seg_end

    if current_text.strip():
        chunks.append({
            "text": current_text.strip(),
            "start_time": current_start,
            "end_time": current_end,
        })

    return chunks


def _chunk_plain_text(text: str) -> list[dict[str, Any]]:
    """Fallback: разбить текст на чанки без таймкодов."""
    if not text:
        return []
    chunks = []
    for i in range(0, len(text), CHUNK_TARGET_CHARS - CHUNK_OVERLAP_CHARS):
        chunk = text[i:i + CHUNK_TARGET_CHARS]
        if chunk.strip():
            chunks.append({"text": chunk.strip()})
    return chunks


async def _generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Батч-генерация embeddings через OpenAI API."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.EMBEDDING_MODEL,
                "input": texts,
            },
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
        return [item["embedding"] for item in data["data"]]


async def search_similar_chunks(
    question_embedding: list[float],
    transcription_id,
    db: AsyncSession,
    limit: int = 5,
) -> list[Embedding]:
    """Поиск top-K чанков по cosine similarity."""
    result = await db.execute(
        select(Embedding)
        .where(Embedding.transcription_id == transcription_id)
        .order_by(Embedding.embedding.cosine_distance(question_embedding))
        .limit(limit)
    )
    return list(result.scalars().all())
