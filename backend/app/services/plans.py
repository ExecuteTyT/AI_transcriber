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

import math
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
        max_file_duration_sec=3 * 60 * 60,         # 3 часа (потолок Voxtral, см. VOXTRAL_MAX_MINUTES)
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
        max_file_duration_sec=3 * 60 * 60,         # 3 часа (потолок Voxtral, см. VOXTRAL_MAX_MINUTES)
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


# Технический потолок Voxtral Mini Transcribe V2 — ~3 ч на один файл. Длиннее
# модель отдаёт 400, поэтому plan_by_duration режет любой файл до этого предела
# (даже у безлимита). Это НЕ тарифное ограничение, а предел движка транскрибации.
VOXTRAL_MAX_MINUTES = 3 * 60  # 180 мин


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


# Кошелёк — мелкие топ-апы для НЕрегулярной нагрузки и «добить лимит на разовом
# файле». Регулярным объёмам выгоднее подписка (Старт 0.83 ₽/мин против 1.66-1.98
# у кошелька) — премия за гибкость (разово, без подписки, минуты не сгорают).
# Пакеты намеренно мелкие (≤300 мин): большие объёмы → подписка, иначе кошелёк
# каннибализирует MRR. Кастомная докупка (слайдер) — по базовой ставке, пресеты
# чуть дешевле за «готовый бандл».
WALLET_PACKS: dict[str, dict] = {
    "w60": {"price_rub": 119, "minutes": 60},     # 1.98 ₽/мин
    "w150": {"price_rub": 269, "minutes": 150},   # 1.79 ₽/мин
    "w300": {"price_rub": 499, "minutes": 300},   # 1.66 ₽/мин
}

# Кастомная докупка произвольного числа минут (слайдер).
WALLET_RATE_RUB_PER_MIN = 2.0     # базовая ставка; цена = minutes × rate (целые ₽)
WALLET_CUSTOM_MIN = 30            # минимум минут
WALLET_CUSTOM_MAX = 480           # выше — выгоднее подписка, не продаём кошельком
WALLET_CUSTOM_STEP = 30           # шаг слайдера


def custom_topup_price(minutes: int) -> int:
    """Цена кастомной докупки N минут в целых ₽ (ставка WALLET_RATE_RUB_PER_MIN)."""
    return int(round(minutes * WALLET_RATE_RUB_PER_MIN))


def is_valid_custom_minutes(minutes: int) -> bool:
    """Валидна ли кастомная докупка: в диапазоне [MIN, MAX] и кратна шагу."""
    return (
        isinstance(minutes, int)
        and WALLET_CUSTOM_MIN <= minutes <= WALLET_CUSTOM_MAX
        and minutes % WALLET_CUSTOM_STEP == 0
    )


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


def plan_by_duration(
    duration_sec: float | None,
    available_minutes: int,
    *,
    is_admin: bool = False,
    is_unlimited: bool = False,
) -> dict:
    """Решение по длительности (общее для upload и URL-ingest).

    Вместо жёсткого пейволла на длинном файле — даём расшифровать ПЕРВЫЕ
    `available_minutes` (превью на контенте пользователя), а целиком предлагаем
    за пополнение. Это резко повышает конверсию: человек видит результат.

    Возвращает dict:
      action="ok"       — расшифровать целиком (влезает / админ / длина неизвестна);
      action="truncate" — обрезать до max_minutes (файл длиннее баланса, но баланс>0);
      action="block"    — баланс 0, показываем пейволл (paywall).
    Плюс full_minutes (исходная длина) и paywall (для block / апселла).
    """
    if not duration_sec:
        # Длину не определили (ffprobe не смог) — не режем заранее; если файл
        # окажется длиннее потолка Voxtral, тот вернёт ошибку при обработке.
        return {"action": "ok", "max_minutes": None, "full_minutes": None, "paywall": None}

    file_min = math.ceil(duration_sec / 60)
    unlimited = is_admin or is_unlimited

    # Бюджет минут: безлимит/админ балансом не ограничены.
    budget = file_min if unlimited else max(0, available_minutes)
    # Реально обработаем = min(бюджет, технический потолок Voxtral). Voxtral Mini
    # Transcribe V2 тянет ~3 ч на файл; длиннее — отдаёт 400, поэтому режем ВСЕГДА,
    # включая безлимит/админа (это не про деньги, а про предел модели).
    cap = min(budget, VOXTRAL_MAX_MINUTES)

    if file_min <= cap:
        return {"action": "ok", "max_minutes": None, "full_minutes": file_min, "paywall": None}

    # Не влезает целиком. Денег нет вообще (и не безлимит) → пейволл.
    if not unlimited and available_minutes <= 0:
        return {
            "action": "block",
            "max_minutes": None,
            "full_minutes": file_min,
            "paywall": {
                "reason": "no_minutes",
                "message": "Минуты закончились. Пополните кошелёк или оформите Pro.",
                "paths": ["wallet", "pro"],
            },
        }

    # Обрабатываем ровно потолок (cap==VOXTRAL_MAX) → уперлись в предел Voxtral,
    # а не в деньги (пополнение НЕ поможет). Иначе — обрезка по балансу (помогает).
    if cap >= VOXTRAL_MAX_MINUTES:
        return {
            "action": "truncate",
            "max_minutes": VOXTRAL_MAX_MINUTES,
            "full_minutes": file_min,
            "paywall": {
                "reason": "voxtral_max_duration",
                "message": (
                    f"Расшифрую первые {VOXTRAL_MAX_MINUTES // 60} ч — это технический "
                    "максимум на один файл. Если запись длиннее, разбейте её на части."
                ),
                "file_minutes": file_min,
                "available_minutes": VOXTRAL_MAX_MINUTES,
                "paths": [],
            },
        }

    # Иначе уперлись в баланс → частичная расшифровка первых N минут.
    return {
        "action": "truncate",
        "max_minutes": available_minutes,
        "full_minutes": file_min,
        "paywall": {
            "reason": "file_exceeds_balance",
            "message": (
                f"Расшифрую первые {available_minutes} мин из {file_min}. "
                "Чтобы целиком — пополните кошелёк или оформите Pro."
            ),
            "file_minutes": file_min,
            "available_minutes": available_minutes,
            "topup": recommend_topup(file_min, available_minutes),
            "paths": ["wallet", "pro"],
        },
    }
