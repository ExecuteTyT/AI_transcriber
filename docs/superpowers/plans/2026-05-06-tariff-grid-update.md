# Tariff Grid v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Расширить тарифную сетку Dicto: добавить SKU `meet_solo` (990 ₽ / 40 ч) и `expert` (1 990 ₽ / 80 ч), переконфигурировать `business` (2 490 ₽ / 80 ч / 5 мест). Закрывает сегмент «соло power-user» (адвокаты, секретари) и расширение под совещания.

**Architecture:** Источник истины — `backend/app/services/plans.PLANS` (dataclass-конфиги). `frontend/src/config/plans.ts` — строгое зеркало. UI-страница `Pricing.tsx` рендерит карточки. PLAN_NAMES (display labels) дублируются в 5 местах фронта + 1 в email.py + 1 в payment.py — все обновляются. БД-миграция не нужна: `user.plan` это `String(20)`, новые ID влезают; пользователей ноль.

**Tech Stack:** Python 3.12 + FastAPI + SQLAlchemy + pytest (backend), TypeScript + React + Vite + Tailwind + vitest (frontend).

---

## Конечная сетка

| ID | Название | ₽/мес | Минут | Часов | Юзеров | Overage | Highlight |
|---|---|---|---|---|---|---|---|
| `free` | Free | 0 | 0 (+180 разово) | — | 1 | 4.0 | — |
| `start` | Старт | 500 | 600 | 10 | 1 | 2.0 | — |
| `meet_solo` | Митинги | 990 | 2 400 | 40 | 1 | 1.5 | — |
| `pro` | Про | 820 | 1 500 | 25 | 1 | 1.5 | popular |
| `expert` | Эксперт | 1 990 | 4 800 | 80 | 1 | 0.9 | — |
| `business` | Бизнес | 2 490 | 4 800 | 80 | 5 | 0.9 | — |
| `premium` | Премиум | 4 600 | 7 200 | 120 | 10 | 0.8 | premium |

Маржа на каждом платном тарифе ≥ 70% при API-cost 0.087 ₽/мин и комиссиях 8.8%.

---

## File Structure

**Создать:** ничего.

**Изменить (12 файлов):**

| Файл | Что меняется |
|---|---|
| `backend/app/services/plans.py` | Добавить `meet_solo`, `expert`. Поменять `business` (price 2300→2490, minutes 3600→4800, overage 1.0→0.9) |
| `backend/app/services/payment.py:27-32` | `PLAN_DESCRIPTIONS` — добавить 2 ключа |
| `backend/app/services/email.py:298-303` | `plan_names` dict — добавить 2 ключа |
| `backend/tests/test_limits.py:88-117` | Расширить assertion на ключи + per-plan проверки |
| `backend/tests/test_services_extended.py:22-49` | Добавить тесты для `meet_solo`, `expert`, обновить `business` |
| `frontend/src/config/plans.ts` | `PlanId` type + 2 новых SKU в `PLANS` + правка `business` |
| `frontend/src/pages/Pricing.tsx:31-226` | `Plan.id` type + 2 новые карточки + правка `business` + grid `xl:grid-cols-5`→`xl:grid-cols-4`, `PLAN_NAMES` (стр. 280) |
| `frontend/src/pages/Pricing.tsx:446` | SEO meta description |
| `frontend/src/pages/Dashboard.tsx:21` | `PLAN_NAMES` |
| `frontend/src/pages/Profile.tsx:26` | `PLAN_NAMES` |
| `frontend/src/pages/Subscription.tsx:14` | `PLAN_NAMES` |
| `frontend/src/components/nav/DesktopSidebar.tsx:152` | `planNames` |

---

## Task 1: Backend — расширить `PLANS`

**Files:**
- Modify: `backend/app/services/plans.py`

- [ ] **Step 1: Заменить блок `business` и добавить новые SKU перед/после соответствующих позиций**

В файле `backend/app/services/plans.py` заменить целиком блок `business` (строки 77-89) и добавить 2 новые конфигурации. Финальный словарь `PLANS`:

```python
PLANS: dict[str, PlanConfig] = {
    "free": PlanConfig(
        minutes_limit=0,
        max_file_duration_sec=15 * 60,
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
        minutes_limit=600,
        max_file_duration_sec=2 * 60 * 60,
        ai_summaries=-1,
        speakers=True,
        max_speakers=10,
        rag_chat_limit=10,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=500,
        max_users=1,
        overage_rub_per_min=2.0,
    ),
    "meet_solo": PlanConfig(
        # Под расширение для совещаний: 40 часов / месяц,
        # типичный сотрудник с 2-3 встречами в день.
        minutes_limit=2400,
        max_file_duration_sec=2 * 60 * 60,
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=990,
        max_users=1,
        overage_rub_per_min=1.5,
    ),
    "pro": PlanConfig(
        minutes_limit=1500,
        max_file_duration_sec=3 * 60 * 60,
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=820,
        max_users=1,
        overage_rub_per_min=1.5,
    ),
    "expert": PlanConfig(
        # Solo power-user: 80 часов / месяц для адвокатов, секретарей,
        # журналистов — 3-4 часа аудио в рабочий день.
        minutes_limit=4800,
        max_file_duration_sec=4 * 60 * 60,
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=1990,
        max_users=1,
        overage_rub_per_min=0.9,
    ),
    "business": PlanConfig(
        # Тот же объём, что у expert (80 ч), но 5 мест и расшаривание.
        minutes_limit=4800,
        max_file_duration_sec=4 * 60 * 60,
        ai_summaries=-1,
        speakers=True,
        max_speakers=-1,
        rag_chat_limit=-1,
        action_items=True,
        export_formats=("txt", "srt", "docx"),
        price_rub=2490,
        max_users=5,
        overage_rub_per_min=0.9,
    ),
    "premium": PlanConfig(
        minutes_limit=7200,
        max_file_duration_sec=6 * 60 * 60,
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
```

- [ ] **Step 2: Импорт `plans` не должен сломаться**

Run: `python -c "from backend.app.services.plans import PLANS, get_plan; print(list(PLANS))"` (из корня репо, при наличии venv) или через `cd backend && python -c "from app.services.plans import PLANS; print(list(PLANS))"`.
Expected stdout: `['free', 'start', 'meet_solo', 'pro', 'expert', 'business', 'premium']`

---

## Task 2: Backend — обновить тесты тарифов

**Files:**
- Modify: `backend/tests/test_limits.py:84-118`
- Modify: `backend/tests/test_services_extended.py:18-55`

- [ ] **Step 1: Обновить `test_plan_configs` в test_limits.py**

Заменить тело функции `test_plan_configs` целиком (с строки 84 до конца блока, включая assert на неизвестный план):

```python
def test_plan_configs():
    """Проверка корректности конфигов тарифов (актуальная сетка)."""
    from app.services.plans import PLANS, get_plan

    expected_keys = {"free", "start", "meet_solo", "pro", "expert", "business", "premium"}
    assert expected_keys <= set(PLANS.keys())

    free = get_plan("free")
    assert free.minutes_limit == 0
    assert free.max_file_duration_sec == 15 * 60
    assert free.price_rub == 0
    assert free.ai_summaries == 5
    assert free.action_items is False

    start = get_plan("start")
    assert start.minutes_limit == 600
    assert start.price_rub == 500
    assert start.action_items is True

    meet_solo = get_plan("meet_solo")
    assert meet_solo.minutes_limit == 2400
    assert meet_solo.price_rub == 990
    assert meet_solo.max_users == 1
    assert meet_solo.action_items is True

    pro = get_plan("pro")
    assert pro.minutes_limit == 1500
    assert pro.price_rub == 820
    assert pro.action_items is True

    expert = get_plan("expert")
    assert expert.minutes_limit == 4800
    assert expert.price_rub == 1990
    assert expert.max_users == 1
    assert expert.rag_chat_limit == -1

    business = get_plan("business")
    assert business.minutes_limit == 4800
    assert business.price_rub == 2490
    assert business.max_users == 5

    premium = get_plan("premium")
    assert premium.minutes_limit == 7200
    assert premium.price_rub == 4600
    assert premium.max_users == 10

    # Неизвестный план → free
    unknown = get_plan("nonexistent_plan")
    assert unknown == free
```

(Сохранить уже существующие проверки на «неизвестный план → free» — если в файле они шли отдельной частью, оставить.)

- [ ] **Step 2: Обновить per-plan тесты в test_services_extended.py**

Открыть `backend/tests/test_services_extended.py:22-55` и заменить блок проверок планов.

Сначала прочитать существующий блок (Read tool), затем заменить так, чтобы:
- `start`: minutes_limit == 600, price_rub == 500
- `pro`: minutes_limit == 1500, price_rub == 820
- `business`: minutes_limit == 4800, price_rub == 2490 (раньше было 3600 / 2300)
- `premium`: minutes_limit == 7200, price_rub == 4600
- Добавить блок для `meet_solo`: minutes_limit == 2400, price_rub == 990
- Добавить блок для `expert`: minutes_limit == 4800, price_rub == 1990

Точная форма кода зависит от существующей разметки файла — повторить стиль соседних блоков.

- [ ] **Step 3: Запустить тесты**

Run: `cd backend && pytest tests/test_limits.py::test_plan_configs tests/test_services_extended.py -v`
Expected: PASS (все 4+ теста зелёные).

- [ ] **Step 4: Прогнать весь backend pytest**

Run: `cd backend && pytest -x`
Expected: PASS либо те же существующие падения, что и до правок (не должно появиться новых).

---

## Task 3: Backend — `payment.py` PLAN_DESCRIPTIONS

**Files:**
- Modify: `backend/app/services/payment.py:27-32`

- [ ] **Step 1: Заменить словарь PLAN_DESCRIPTIONS**

Заменить блок (строки 27-32):

```python
PLAN_DESCRIPTIONS: dict[str, str] = {
    "start": "Dicto — тариф Старт (10 часов / мес)",
    "meet_solo": "Dicto — тариф Митинги (40 часов / мес)",
    "pro": "Dicto — тариф Про (25 часов / мес)",
    "expert": "Dicto — тариф Эксперт (80 часов / мес)",
    "business": "Dicto — тариф Бизнес (80 часов / мес, до 5 пользователей)",
    "premium": "Dicto — тариф Премиум (120 часов / мес, до 10 пользователей)",
}
```

- [ ] **Step 2: Проверить, что валидация в `create_payment` не упадёт**

В функции `create_payment` (`backend/app/services/payment.py:35-68`) есть проверка `if plan not in PLAN_PRICES`. `PLAN_PRICES` строится из `PLANS` (исключая `free`), значит автоматически подхватит `meet_solo` и `expert`. Сообщение об ошибке упоминает «start, pro» — оставить как есть (или, если хочется педантично, обновить, но это просто строка ошибки для разработчика).

Run: `cd backend && pytest tests/test_payments.py -v`
Expected: PASS.

---

## Task 4: Backend — `email.py` plan_names

**Files:**
- Modify: `backend/app/services/email.py:296-305`

- [ ] **Step 1: Заменить словарь plan_names в send_subscription_email**

Найти и заменить блок:

```python
    plan_names = {
        "start": "Старт — 500 ₽/мес · 10 часов",
        "meet_solo": "Митинги — 990 ₽/мес · 40 часов",
        "pro": "Про — 820 ₽/мес · 25 часов",
        "expert": "Эксперт — 1 990 ₽/мес · 80 часов",
        "business": "Бизнес — 2 490 ₽/мес · 80 часов",
        "premium": "Премиум — 4 600 ₽/мес · 120 часов",
    }
```

(Старая версия имела 4 ключа: start/pro/business/premium с ценой/часами; теперь 6.)

- [ ] **Step 2: Sanity check**

Run: `cd backend && python -c "from app.services.email import send_subscription_email"`
Expected: импорт без ошибок (нет SyntaxError).

---

## Task 5: Frontend — `config/plans.ts`

**Files:**
- Modify: `frontend/src/config/plans.ts`

- [ ] **Step 1: Расширить `PlanId` и добавить SKU**

Заменить целиком файл (он короткий, 128 строк) на новую версию, в которой:
- `PlanId` = `"free" | "start" | "meet_solo" | "pro" | "expert" | "business" | "premium"`
- В массиве `PLANS` добавить 2 новых объекта в нужных позициях:
  - `meet_solo` сразу после `start`
  - `expert` сразу после `pro`
  - `business` поправить: priceRub 2300→**2490**, minutesLimit 3600→**4800**, overageRubPerMin 1.0→**0.9**, tagline "Для команд до 5 человек" остаётся

Точные блоки:

```typescript
{
  id: "meet_solo",
  name: "Митинги",
  tagline: "Для совещаний и расширения",
  priceRub: 990,
  minutesLimit: 2400,
  maxFileDurationMin: 120,
  aiSummaries: -1,
  maxSpeakers: -1,
  ragChatLimit: -1,
  actionItems: true,
  exportFormats: ["txt", "srt", "docx"],
  maxUsers: 1,
  overageRubPerMin: 1.5,
},
```

```typescript
{
  id: "expert",
  name: "Эксперт",
  tagline: "Для тех, кто работает с речью каждый день",
  priceRub: 1990,
  minutesLimit: 4800,
  maxFileDurationMin: 240,
  aiSummaries: -1,
  maxSpeakers: -1,
  ragChatLimit: -1,
  actionItems: true,
  exportFormats: ["txt", "srt", "docx"],
  maxUsers: 1,
  overageRubPerMin: 0.9,
},
```

И блок `business`:

```typescript
{
  id: "business",
  name: "Бизнес",
  tagline: "Для команд до 5 человек",
  priceRub: 2490,
  minutesLimit: 4800,
  maxFileDurationMin: 240,
  aiSummaries: -1,
  maxSpeakers: -1,
  ragChatLimit: -1,
  actionItems: true,
  exportFormats: ["txt", "srt", "docx"],
  maxUsers: 5,
  overageRubPerMin: 0.9,
},
```

Финальный порядок в массиве: `free`, `start`, `meet_solo`, `pro`, `expert`, `business`, `premium`.

- [ ] **Step 2: Проверить TypeScript**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 ошибок (либо те же, что были до правок).

---

## Task 6: Frontend — `Pricing.tsx` (карточки + сетка)

**Files:**
- Modify: `frontend/src/pages/Pricing.tsx`

- [ ] **Step 1: Расширить `Plan.id` и `PLAN_NAMES`**

В строке 32 расширить тип:

```typescript
type Plan = {
  id: "free" | "start" | "meet_solo" | "pro" | "expert" | "business" | "premium";
  // … остальное без изменений
};
```

В строке 280 заменить:

```typescript
const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  start: "Старт",
  meet_solo: "Митинги",
  pro: "Про",
  expert: "Эксперт",
  business: "Бизнес",
  premium: "Премиум",
};
```

- [ ] **Step 2: Добавить карточки в массив `PLANS`**

В массиве `PLANS` (строки 42-226) в правильном порядке вставить 2 новых объекта и поправить `business`. Финальный порядок: free → start → meet_solo → pro → expert → business → premium.

Карточка `meet_solo` (после `start`):

```typescript
{
  id: "meet_solo",
  name: "Митинги",
  tagline: "Для совещаний и расширения",
  price: 990,
  period: "/мес",
  groups: [
    {
      icon: Clock,
      title: "Минуты",
      items: [
        { label: "2 400 минут (40 часов)", included: true },
        { label: "Файлы до 2 часов", included: true },
      ],
    },
    {
      icon: Sparkles,
      title: "AI-анализ",
      items: [
        { label: "Саммари без лимита", included: true },
        { label: "Спикеры без ограничений", included: true },
        { label: "RAG-чат безлимит", included: true },
        { label: "Задачи (action items)", included: true },
      ],
    },
    {
      icon: RefreshCw,
      title: "Экспорт",
      items: [
        { label: "TXT / SRT / DOCX", included: true },
      ],
    },
  ],
  ctaLabel: "Оформить Митинги",
},
```

Карточка `expert` (после `pro`):

```typescript
{
  id: "expert",
  name: "Эксперт",
  tagline: "Для тех, кто работает с речью каждый день",
  price: 1990,
  period: "/мес",
  groups: [
    {
      icon: Clock,
      title: "Минуты",
      items: [
        { label: "4 800 минут (80 часов)", included: true },
        { label: "Файлы до 4 часов", included: true },
        { label: "Приоритетная обработка", included: true },
      ],
    },
    {
      icon: Sparkles,
      title: "AI-анализ",
      items: [
        { label: "Всё без лимита", included: true },
        { label: "Спикеры без ограничений", included: true },
        { label: "RAG-чат безлимит", included: true },
        { label: "Задачи (action items)", included: true },
      ],
    },
    {
      icon: RefreshCw,
      title: "Экспорт",
      items: [
        { label: "TXT / SRT / DOCX", included: true },
      ],
    },
  ],
  ctaLabel: "Оформить Эксперт",
},
```

Карточка `business` — заменить `price: 2300` → `price: 2490` и обновить items в группе «Минуты»:

```typescript
{
  icon: Clock,
  title: "Минуты",
  items: [
    { label: "4 800 минут (80 часов)", included: true },
    { label: "Файлы до 4 часов", included: true },
    { label: "Приоритетная обработка", included: true },
  ],
},
```

(Группа «Экспорт» — оставить «До 5 пользователей».)

- [ ] **Step 3: Поправить grid (с 5 на 4 колонки на xl)**

Найти строку 354:

```typescript
className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:items-stretch md:gap-4"
```

Заменить на:

```typescript
className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:items-stretch md:gap-4"
```

(7 карточек на xl лягут в 2 ряда: 4 + 3.)

- [ ] **Step 4: Обновить SEO description**

Найти строку 446:

```typescript
description="Тарифы Dicto: Free (180 мин при регистрации), Старт (500 ₽/мес, 10 часов), Про (820 ₽/мес, 25 часов), Бизнес (2 300 ₽, 60 часов), Премиум (4 600 ₽, 120 часов). AI-саммари, разметка спикеров, экспорт."
```

Заменить на:

```typescript
description="Тарифы Dicto: Free (180 мин при регистрации), Старт (500 ₽/мес, 10 ч), Митинги (990 ₽, 40 ч), Про (820 ₽, 25 ч), Эксперт (1 990 ₽, 80 ч), Бизнес (2 490 ₽, 80 ч, 5 чел.), Премиум (4 600 ₽, 120 ч). AI-саммари, разметка спикеров, экспорт."
```

- [ ] **Step 5: tsc check**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 ошибок.

---

## Task 7: Frontend — синхронизировать PLAN_NAMES в 4 местах

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx:21`
- Modify: `frontend/src/pages/Profile.tsx:26`
- Modify: `frontend/src/pages/Subscription.tsx:14`
- Modify: `frontend/src/components/nav/DesktopSidebar.tsx:152`

- [ ] **Step 1: Dashboard.tsx**

Заменить строку 21:

```typescript
const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  start: "Старт",
  meet_solo: "Митинги",
  pro: "Про",
  expert: "Эксперт",
  business: "Бизнес",
  premium: "Премиум",
};
```

- [ ] **Step 2: Profile.tsx**

Прочитать строки 26-34, расширить словарь до того же набора ключей.

- [ ] **Step 3: Subscription.tsx**

Прочитать строки 14-22, расширить словарь до того же набора ключей. На строке 119 `sub.plan === "pro"` остаётся (popular highlight для Pro).

- [ ] **Step 4: DesktopSidebar.tsx**

Прочитать вокруг строки 152, найти `planNames` и расширить.

- [ ] **Step 5: tsc check**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 ошибок.

- [ ] **Step 6: Frontend tests**

Run: `cd frontend && npx vitest run`
Expected: все тесты проходят (`Dashboard.test.tsx`, `Upload.test.tsx`, `Admin.test.tsx` — могут содержать упоминания планов, проверить).

---

## Task 8: Финальная верификация

- [ ] **Step 1: Backend full test pass**

Run: `cd backend && pytest`
Expected: PASS на тех же тестах, что проходили раньше; не появилось новых падений.

- [ ] **Step 2: Frontend tsc + tests + build**

Run: `cd frontend && npx tsc --noEmit && npx vitest run && npm run build`
Expected: всё зелёное.

- [ ] **Step 3: Smoke — открыть `/pricing`**

Run dev server (`cd frontend && npm run dev`), открыть `http://localhost:3000/pricing`, проверить:
- Видны 7 карточек: Free / Старт / Митинги / Про / Эксперт / Бизнес / Премиум
- Цены: 0 / 500 / 990 / 820 / 1 990 / 2 490 / 4 600
- На xl-экране 4+3 ряд (не ломается)
- «Про» — popular, «Премиум» — premium highlight
- CurrentPlanBar для авторизованного юзера показывает корректное русское имя плана

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/plans.py backend/app/services/payment.py backend/app/services/email.py \
  backend/tests/test_limits.py backend/tests/test_services_extended.py \
  frontend/src/config/plans.ts frontend/src/pages/Pricing.tsx \
  frontend/src/pages/Dashboard.tsx frontend/src/pages/Profile.tsx frontend/src/pages/Subscription.tsx \
  frontend/src/components/nav/DesktopSidebar.tsx \
  docs/superpowers/plans/2026-05-06-tariff-grid-update.md

git commit -m "$(cat <<'EOF'
feat(pricing): добавить тарифы Митинги (990 ₽/40 ч) и Эксперт (1 990 ₽/80 ч)

- meet_solo: 990 ₽/мес, 2 400 мин/мес — под расширение для совещаний
- expert: 1 990 ₽/мес, 4 800 мин/мес — solo power-user (адвокаты, секретари)
- business: 2 490 ₽/мес (было 2 300), 4 800 мин/мес (было 3 600), overage 0.9 ₽
- Pricing-grid xl: 5 → 4 колонки (7 карточек ложатся в 2 ряда)
- PLAN_NAMES синхронизирован в 5 точках фронта + email.py + payment.py
- БД-миграция не требуется (пользователей пока нет)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ `meet_solo` 990 ₽ / 40 ч — Task 1, 5, 6
- ✅ `expert` 1 990 ₽ / 80 ч — Task 1, 5, 6
- ✅ `business` 2 490 / 80 ч / 5 user — Task 1, 5, 6
- ✅ Email/payment/admin labels — Task 3, 4, 7
- ✅ Тесты — Task 2
- ✅ SEO — Task 6 step 4
- ✅ Grid layout — Task 6 step 3

**Placeholder scan:**
- Task 2 step 2 имеет «точная форма кода зависит от существующей разметки» — это потому, что я не читал файл; engine должен прочитать и адаптировать. Допустимо для config-теста, не для бизнес-логики.
- Task 7 шаги 2-4 ссылаются на чтение файла перед правкой — необходимо, т.к. структура в этих файлах не идентична Pricing.tsx.

**Type consistency:**
- `PlanId` в config/plans.ts и `Plan.id` в Pricing.tsx — оба `"free" | "start" | "meet_solo" | "pro" | "expert" | "business" | "premium"`. ✓
- ID `meet_solo` (с подчёркиванием) — единое во всех местах. ✓
- Минуты / цена / overage синхронизированы между backend и frontend. ✓
