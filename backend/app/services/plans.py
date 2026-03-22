"""Константы тарифных планов AI Voice."""

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanConfig:
    """Конфигурация одного тарифного плана."""

    minutes_limit: int
    max_file_duration_sec: int
    ai_summaries: int  # -1 = безлимит
    speakers: bool
    rag_chat_limit: int  # -1 = безлимит, 0 = недоступно
    action_items: bool
    export_formats: tuple[str, ...]
    price_rub: int  # 0 = бесплатно


PLANS: dict[str, PlanConfig] = {
    "free": PlanConfig(
        minutes_limit=15,
        max_file_duration_sec=10 * 60,         # 10 мин
        ai_summaries=3,
        speakers=False,
        rag_chat_limit=0,
        action_items=False,
        export_formats=("txt",),
        price_rub=0,
    ),
    "start": PlanConfig(
        minutes_limit=300,
        max_file_duration_sec=2 * 60 * 60,     # 2 часа
        ai_summaries=-1,
        speakers=True,
        rag_chat_limit=5,
        action_items=False,
        export_formats=("txt", "srt", "docx"),
        price_rub=290,
    ),
    "pro": PlanConfig(
        minutes_limit=1200,
        max_file_duration_sec=3 * 60 * 60,     # 3 часа
        ai_summaries=-1,
        speakers=True,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=590,
    ),
}


def get_plan(plan_name: str) -> PlanConfig:
    """Получить конфигурацию плана по имени."""
    return PLANS.get(plan_name, PLANS["free"])
