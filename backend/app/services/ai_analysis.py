import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """Ты — опытный аналитик. Напиши структурированное саммари транскрипции на русском языке.

Формат ответа (используй Markdown):

## Краткое содержание
1-2 предложения: о чём запись.

## Основные темы
Для каждой темы используй подзаголовок ### и 2-3 предложения описания.

## Ключевые выводы
Маркированный список главных выводов и решений.

## Участники и их позиции
Кратко опиши позицию каждого участника (если есть несколько спикеров).

Пиши ёмко, информативно, без воды. Используй **жирный текст** для ключевых терминов и имён.

Транскрипция:
{text}"""

KEY_POINTS_PROMPT = """Ты — опытный аналитик. Выдели 5-10 ключевых тезисов из транскрипции на русском языке.

Формат ответа (используй Markdown):
- Каждый тезис — одно чёткое предложение
- Используй **жирный текст** для ключевых слов
- Группируй тезисы по темам с заголовками ###
- Только факты и идеи, без воды

Транскрипция:
{text}"""

ACTION_ITEMS_PROMPT = """Ты — опытный менеджер. Выдели action items (задачи к выполнению) из транскрипции на русском языке.

Формат ответа (используй Markdown):
- Каждая задача начинается с чекбокса: - [ ] **Задача**
- Добавь ответственного в скобках, если понятно из контекста: *(Ответственный)*
- Добавь срок, если упоминается: *до [дата]*
- Группируй задачи по приоритету с заголовками ### Приоритетные / ### Прочие
- Если задач нет, напиши: *Конкретные задачи не выявлены.*

Транскрипция:
{text}"""

PROMPTS = {
    "summary": SUMMARY_PROMPT,
    "key_points": KEY_POINTS_PROMPT,
    "action_items": ACTION_ITEMS_PROMPT,
}


async def generate_analysis(text: str, analysis_type: str) -> tuple[str, int]:
    """Генерация AI-анализа через Mistral AI."""
    prompt_template = PROMPTS.get(analysis_type)
    if not prompt_template:
        raise ValueError(f"Неизвестный тип анализа: {analysis_type}")

    # Map-reduce для длинных текстов
    max_chars = 12000  # ~4000 токенов
    if len(text) > max_chars:
        chunks = _split_text(text, max_chars)
        partial_results = []
        total_tokens = 0
        for chunk in chunks:
            content, tokens = await _call_llm(prompt_template.format(text=chunk))
            partial_results.append(content)
            total_tokens += tokens

        # Объединение результатов
        combined = "\n\n".join(partial_results)
        merge_prompt = f"Объедини и сократи следующие частичные результаты в единый связный текст:\n\n{combined}"
        final_content, final_tokens = await _call_llm(merge_prompt)
        return final_content, total_tokens + final_tokens
    else:
        return await _call_llm(prompt_template.format(text=text))


async def _call_llm(prompt: str) -> tuple[str, int]:
    """Вызов Mistral AI API для генерации анализа."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "mistral-small-latest",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 2000,
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        tokens = data.get("usage", {}).get("total_tokens", 0)
        return content, tokens


def _split_text(text: str, max_chars: int) -> list[str]:
    """Разбиение текста на чанки по границам предложений."""
    if max_chars <= 0:
        return [text] if text else []

    chunks = []
    current = ""
    for sentence in text.replace(". ", ".\n").split("\n"):
        # Если одно предложение длиннее лимита — принудительно разрезаем
        if len(sentence) > max_chars:
            if current.strip():
                chunks.append(current.strip())
                current = ""
            for i in range(0, len(sentence), max_chars):
                chunks.append(sentence[i : i + max_chars].strip())
            continue

        if len(current) + len(sentence) > max_chars and current:
            chunks.append(current.strip())
            current = ""
        current += sentence + " "
    if current.strip():
        chunks.append(current.strip())
    return chunks
