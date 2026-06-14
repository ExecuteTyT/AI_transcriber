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
        # Free план: 0 минут ежемесячно. Все активные минуты приходят
        # из bonus_minutes (180 при регистрации, единоразово). После их
        # исчерпания — только overage с баланса или переход на платный план.
        minutes_limit=0,
        max_file_duration_sec=15 * 60,             # 15 мин
        ai_summaries=1,                            # проба: 1 бесплатный разбор, дальше пейволл
        speakers=True,
        max_speakers=3,
        rag_chat_limit=3,
        action_items=False,
        export_formats=("txt", "srt", "docx"),  # DOCX доступен на всех тарифах
        price_rub=0,
        max_users=1,
        overage_rub_per_min=4.0,
    ),
    "start": PlanConfig(
        # Soloфрилансер: подкастеры, блогеры, разовые задачи.
        minutes_limit=600,                         # 10 ч/мес
        max_file_duration_sec=2 * 60 * 60,         # 2 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=10,
        rag_chat_limit=10,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=500,                             # 0.83 ₽/мин
        max_users=1,
        overage_rub_per_min=2.0,
    ),
    "pro": PlanConfig(
        # Регулярная solo-работа: журналисты, контент-команда из 1 человека,
        # частые митинги. 30 ч/мес = 1 час аудио в рабочий день.
        minutes_limit=1800,                        # 30 ч/мес (было 1500/25ч)
        max_file_duration_sec=3 * 60 * 60,         # 3 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=990,                             # было 820. 0.55 ₽/мин
        max_users=1,
        overage_rub_per_min=1.5,
    ),
    "expert": PlanConfig(
        # Solo power-user: адвокаты, секретари, ежедневные митинги
        # руководителя. 70 ч/мес ≈ 3 часа аудио в день.
        minutes_limit=4200,                        # 70 ч/мес (было 4800/80ч)
        max_file_duration_sec=4 * 60 * 60,         # 4 часа
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=1990,                            # 0.47 ₽/мин
        max_users=1,
        overage_rub_per_min=0.9,
    ),
    "premium": PlanConfig(
        # Solo power-user++ для очень больших объёмов: студии, юристы с
        # ежедневной практикой, секретари топ-менеджеров. 140 ч/мес =
        # 4-5 часов аудио в день. Дешевле Эксперта per-minute (0.42 vs 0.47).
        minutes_limit=8400,                        # 140 ч/мес
        max_file_duration_sec=6 * 60 * 60,         # 6 часов
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=3490,                            # 0.42 ₽/мин
        max_users=1,
        overage_rub_per_min=0.7,
    ),
    # Бизнес-тариф удалён 2026-05-19: multi-user механика (invite, shared
    # workspace, общий биллинг) не реализована — продавать нечего. Команды
    # уходят в Enterprise CTA (mailto:support@dicto.pro) до реализации фичи.
    # meet_solo удалён: 40-часовой сценарий покрыт Про (30ч) и Эксперт (70ч).
}


def get_plan(plan_name: str) -> PlanConfig:
    """Получить конфигурацию плана по имени. Неизвестный план → free."""
    return PLANS.get(plan_name, PLANS["free"])


def has_paid_access(user) -> bool:
    """Платный доступ к AI-разбору и чату.

    True если у юзера активная платная подписка (plan != free) ИЛИ есть остаток
    на кошельке (wallet_minutes > 0). Free-юзер без кошелька получает только
    пробу (1 файл в рамках bonus + 1 разбор), дальше — пейволл.
    """
    return getattr(user, "plan", "free") != "free" or getattr(user, "wallet_minutes", 0) > 0


# Пакеты пополнения кошелька: код → (цена ₽, минуты). Цена за минуту падает
# с объёмом (299/150≈2.0, 690/400≈1.7, 1490/1000≈1.5). Pro (start, 500₽/600мин)
# выгоднее по минуте — объёмных юзеров сетка толкает в подписку.
WALLET_PACKS: dict[str, dict] = {
    "w150": {"price_rub": 299, "minutes": 150},
    "w400": {"price_rub": 690, "minutes": 400},
    "w1000": {"price_rub": 1490, "minutes": 1000},
}


def recommend_topup(file_minutes: int, available_minutes: int) -> dict | None:
    """Сколько докинуть, чтобы расшифровать файл ЦЕЛИКОМ.

    Возвращает минимальный пакет кошелька, покрывающий нехватку
    (file_minutes − available_minutes), либо None если файл уже влезает.
    Если нехватка больше самого большого пакета — отдаём максимальный (UI
    подскажет оформить Pro для очень больших файлов).

    Клиентоориентированность: вместо «оплатите» показываем «докиньте N мин (X ₽)
    и расшифруем целиком».
    """
    shortfall = file_minutes - available_minutes
    if shortfall <= 0:
        return None
    packs = sorted(WALLET_PACKS.items(), key=lambda kv: kv[1]["minutes"])
    code = next((c for c, cfg in packs if cfg["minutes"] >= shortfall), packs[-1][0])
    cfg = WALLET_PACKS[code]
    return {
        "shortfall_minutes": shortfall,
        "pack": code,
        "pack_minutes": cfg["minutes"],
        "price_rub": cfg["price_rub"],
    }
