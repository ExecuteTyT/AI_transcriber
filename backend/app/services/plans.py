"""Константы тарифных планов Dicto (dicto.pro).

Цены согласованы с frontend/src/pages/Pricing.tsx. Обновление — в двух местах.

Экономика (себестоимость 1 минуты аудио ≈ 0.087 ₽):
- Voxtral-mini: 0.080 ₽/мин (60 мин ≈ 4.80 ₽)
- AI-анализ (саммари/тезисы/задачи): ~0.007 ₽/мин суммарно
- Embeddings (RAG): ~0.0003 ₽/мин
- Итого API-cost: ~0.087 ₽/мин
Плюс на выручку: YooKassa 2.8% + УСН 6%. Чистая маржа по всем платным
тарифам ≥ 75%.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanConfig:
    """Конфигурация одного тарифного плана."""

    minutes_limit: int
    max_file_duration_sec: int
    ai_summaries: int  # -1 = безлимит
    speakers: bool
    max_speakers: int  # -1 = безлимит
    rag_chat_limit: int  # -1 = безлимит, 0 = недоступно
    action_items: bool
    export_formats: tuple[str, ...]
    price_rub: int  # 0 = бесплатно
    max_users: int  # кол-во пользователей (для бизнес-плана)
    overage_rub_per_min: float  # цена минуты сверх лимита (будет включено в PR#4)


PLANS: dict[str, PlanConfig] = {
    "free": PlanConfig(
        minutes_limit=30,
        max_file_duration_sec=15 * 60,             # 15 мин
        ai_summaries=5,
        speakers=True,
        max_speakers=3,
        rag_chat_limit=3,
        action_items=False,
        export_formats=("txt", "srt"),
        price_rub=0,
        max_users=1,
        overage_rub_per_min=4.0,
    ),
    "start": PlanConfig(
        minutes_limit=600,                         # 10 ч/мес (было 360)
        max_file_duration_sec=2 * 60 * 60,         # 2 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=10,
        rag_chat_limit=10,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=500,                             # было 390
        max_users=1,
        overage_rub_per_min=2.0,
    ),
    "pro": PlanConfig(
        minutes_limit=1500,                        # 25 ч/мес (было 1500)
        max_file_duration_sec=3 * 60 * 60,         # 3 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=820,                             # было 790
        max_users=1,
        overage_rub_per_min=1.5,
    ),
    "business": PlanConfig(
        minutes_limit=3600,                        # 60 ч/мес (было 4000)
        max_file_duration_sec=4 * 60 * 60,         # 4 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=2300,                            # было 1990
        max_users=5,
        overage_rub_per_min=1.0,
    ),
    "premium": PlanConfig(
        minutes_limit=7200,                        # 120 ч/мес (новый тариф)
        max_file_duration_sec=6 * 60 * 60,         # 6 часов
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=4600,
        max_users=10,
        overage_rub_per_min=0.8,
    ),
}


def get_plan(plan_name: str) -> PlanConfig:
    """Получить конфигурацию плана по имени. Неизвестный план → free."""
    return PLANS.get(plan_name, PLANS["free"])
