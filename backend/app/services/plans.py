"""Константы тарифных планов Scribi (dicto.pro)."""

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


PLANS: dict[str, PlanConfig] = {
    "free": PlanConfig(
        minutes_limit=30,
        max_file_duration_sec=15 * 60,            # 15 мин
        ai_summaries=5,
        speakers=True,
        max_speakers=3,
        rag_chat_limit=3,
        action_items=False,
        export_formats=("txt", "srt"),
        price_rub=0,
        max_users=1,
    ),
    "start": PlanConfig(
        minutes_limit=360,
        max_file_duration_sec=2 * 60 * 60,        # 2 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=10,
        rag_chat_limit=10,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=390,
        max_users=1,
    ),
    "pro": PlanConfig(
        minutes_limit=1500,
        max_file_duration_sec=3 * 60 * 60,        # 3 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=790,
        max_users=1,
    ),
    "business": PlanConfig(
        minutes_limit=4000,
        max_file_duration_sec=4 * 60 * 60,        # 4 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=1990,
        max_users=5,
    ),
}


def get_plan(plan_name: str) -> PlanConfig:
    """Получить конфигурацию плана по имени."""
    return PLANS.get(plan_name, PLANS["free"])
