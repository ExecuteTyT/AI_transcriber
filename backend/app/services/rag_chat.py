import logging

import httpx

from app.config import settings
from app.models.embedding import Embedding

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """Ты — полезный ассистент, отвечающий на вопросы по транскрипции аудио/видеозаписи.

Правила:
- Отвечай ТОЛЬКО на основе предоставленного контекста из транскрипции.
- Указывай временные метки (таймкоды) при цитировании.
- Если информации нет в контексте, скажи «В записи нет информации на эту тему».
- Отвечай на том же языке, на котором задан вопрос.
- Будь кратким и конкретным."""


async def generate_rag_response(
    question: str,
    relevant_chunks: list[Embedding],
) -> tuple[str, list[dict], int]:
    """Генерация ответа RAG-чата.

    Возвращает: (ответ, references, tokens_used)
    """
    context_parts = []
    references = []
    for chunk in relevant_chunks:
        time_label = ""
        if chunk.start_time is not None:
            start_m, start_s = divmod(int(chunk.start_time), 60)
            end_m, end_s = divmod(int(chunk.end_time or chunk.start_time), 60)
            time_label = f" [{start_m}:{start_s:02d} – {end_m}:{end_s:02d}]"

        context_parts.append(f"---{time_label}\n{chunk.chunk_text}")
        references.append({
            "chunk_text": chunk.chunk_text[:200],
            "start_time": chunk.start_time,
            "end_time": chunk.end_time,
        })

    context = "\n\n".join(context_parts)

    prompt = f"{RAG_SYSTEM_PROMPT}\n\nКонтекст из транскрипции:\n\n{context}\n\n---\nВопрос: {question}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": settings.GOOGLE_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 1000,
                },
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()

    content = data["candidates"][0]["content"]["parts"][0]["text"]
    tokens = data.get("usageMetadata", {}).get("totalTokenCount", 0)
    return content, references, tokens


async def embed_question(question: str) -> list[float]:
    """Получить embedding для вопроса."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.EMBEDDING_MODEL,
                "input": question,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return data["data"][0]["embedding"]
