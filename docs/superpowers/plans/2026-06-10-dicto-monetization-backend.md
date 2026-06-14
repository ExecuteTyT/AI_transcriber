# Dicto — Backend монетизации (Кошелёк + Pro + проба-пейволл) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ввести кошелёк (предоплаченные минуты) и пробу-пейволл: free отдаёт пробу (минуты + 1 разбор), платный доступ (Pro-подписка ИЛИ баланс кошелька) снимает гейт на AI-разбор/чат; пополнение кошелька — через YooKassa.

**Architecture:** Кошелёк = третий «ведёрко минут» у `User` (`wallet_minutes`), потребляется после bonus и monthly. Гейт на разбор/чат снимается хелпером `has_paid_access(user)` (= платная подписка ИЛИ остаток кошелька). Пополнение проходит существующий YooKassa-конвейер (`create_payment`/webhook), разветвляясь по `metadata.type` (`subscription` | `wallet`). Деньги моделируются как целые минуты (пакеты), не как float-рубли — переиспользуем существующую minute-машинерию.

**Tech Stack:** FastAPI, SQLAlchemy (async), Alembic, pytest (SQLite in-memory per `conftest.py`), Celery (sync deduction), YooKassa.

---

## Файловая структура

| Файл | Ответственность | Действие |
|---|---|---|
| `backend/app/models/user.py` | поле `wallet_minutes`, дефолт `bonus_minutes` | Modify |
| `backend/app/services/plans.py` | free-константы (проба), `has_paid_access`, `WALLET_PACKS`, `WALLET rate` | Modify |
| `backend/app/models/wallet_topup.py` | таблица идемпотентности пополнений | Create |
| `backend/app/models/__init__.py` | регистрация модели | Modify |
| `backend/app/services/payment.py` | `create_wallet_payment`, кредит баланса в `activate_*` | Modify |
| `backend/app/schemas/payment.py` | схемы topup + поле баланса | Modify |
| `backend/app/api/payments.py` | эндпоинт `/wallet`, ветка webhook по `metadata.type` | Modify |
| `backend/app/api/transcriptions.py` | upload-precheck учитывает `wallet_minutes` + 402-пейволл | Modify |
| `backend/app/api/ai_analysis.py` | гейт разбора через `has_paid_access` | Modify |
| `backend/app/api/chat.py` | гейт чата через `has_paid_access` | Modify |
| `backend/app/tasks/transcribe.py` | списание bonus→monthly→wallet | Modify |
| `backend/alembic/versions/*` | миграция полей | Create (autogenerate) |
| `backend/tests/test_wallet.py` | тесты кошелька/пейволла/доступа | Create |

**Money-модель:** баланс — целые минуты (`wallet_minutes`). Пакеты задают цену↔минуты (299₽=150мин и т.д.) в `WALLET_PACKS`. Списание — те же `math.ceil(sec/60)` минуты, что и сейчас. Никаких float-рублей в БД.

---

### Task 1: Поле `wallet_minutes` у пользователя

**Files:**
- Modify: `backend/app/models/user.py:65` (рядом с `bonus_minutes`)
- Test: `backend/tests/test_wallet.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_wallet.py
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User


async def _register(client: AsyncClient) -> tuple[str, str]:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "password1", "name": "T",
              "consent_pd_processing": True, "consent_cross_border": True},
    )
    return resp.json()["access_token"], email


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_new_user_wallet_minutes_default_zero(client: AsyncClient, db_session: AsyncSession):
    """Новый юзер: wallet_minutes = 0 по умолчанию."""
    _, email = await _register(client)
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    assert user.wallet_minutes == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run (из `backend/`): `pytest tests/test_wallet.py::test_new_user_wallet_minutes_default_zero -v`
Expected: FAIL — `AttributeError: 'User' object has no attribute 'wallet_minutes'`

- [ ] **Step 3: Add the field**

В `backend/app/models/user.py`, сразу после блока `bonus_minutes` (строка ~65):

```python
    # Кошелёк: предоплаченные минуты (пополняются через YooKassa-пакеты).
    # Третье «ведёрко» минут: расходуется ПОСЛЕ bonus_minutes и monthly-лимита.
    # reset_monthly_limits его НЕ трогает (это предоплата, не подписочный лимит).
    wallet_minutes: Mapped[int] = mapped_column(Integer, default=0)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_wallet.py::test_new_user_wallet_minutes_default_zero -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/user.py backend/tests/test_wallet.py
git commit -m "feat(wallet): add wallet_minutes field to User"
```

---

### Task 2: Хелпер `has_paid_access` + free-проба в константах

**Files:**
- Modify: `backend/app/services/plans.py` (free PlanConfig: `ai_summaries 5→1`; добавить `has_paid_access`, `WALLET_PACKS`)
- Modify: `backend/app/models/user.py:65` (`bonus_minutes` default `180 → 30` — проба)
- Test: `backend/tests/test_wallet.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_has_paid_access_logic():
    """has_paid_access: True если подписка не free ИЛИ есть минуты кошелька."""
    from app.services.plans import has_paid_access

    class U:
        def __init__(self, plan, wallet):
            self.plan = plan
            self.wallet_minutes = wallet

    assert has_paid_access(U("free", 0)) is False
    assert has_paid_access(U("free", 10)) is True     # есть кошелёк
    assert has_paid_access(U("start", 0)) is True      # платная подписка
    assert has_paid_access(U("pro", 0)) is True


def test_free_plan_proba_one_summary():
    """Free-проба: ровно 1 бесплатный разбор (ai_summaries=1)."""
    from app.services.plans import get_plan
    assert get_plan("free").ai_summaries == 1
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_wallet.py::test_has_paid_access_logic tests/test_wallet.py::test_free_plan_proba_one_summary -v`
Expected: FAIL — `ImportError: cannot import name 'has_paid_access'` и `assert 5 == 1`

- [ ] **Step 3: Implement**

В `backend/app/services/plans.py`:
1. В `PLANS["free"]` поменять `ai_summaries=5,` → `ai_summaries=1,` (проба: 1 бесплатный разбор; комментарий обновить).
2. В конец файла добавить:

```python
def has_paid_access(user) -> bool:
    """Платный доступ к AI-разбору и чату.

    True если у юзера активная платная подписка (plan != free) ИЛИ есть
    остаток на кошельке (wallet_minutes > 0). Free-юзер без кошелька получает
    только пробу (1 файл в рамках bonus + 1 разбор), дальше — пейволл.
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
```

3. В `backend/app/models/user.py` поменять дефолт `bonus_minutes`:

```python
    # Welcome-бонус (проба) минут: one-time при регистрации. Расходуется ПЕРЕД
    # monthly и wallet. reset_monthly_limits его НЕ трогает.
    bonus_minutes: Mapped[int] = mapped_column(Integer, default=30)
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_wallet.py -v -k "has_paid_access or proba"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/plans.py backend/app/models/user.py
git commit -m "feat(wallet): has_paid_access helper, WALLET_PACKS, free proba (30min + 1 analysis)"
```

---

### Task 3: Идемпотентность пополнений — таблица `wallet_topups`

**Files:**
- Create: `backend/app/models/wallet_topup.py`
- Modify: `backend/app/models/__init__.py`
- Test: `backend/tests/test_wallet.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_wallet_topup_model_exists(db_session: AsyncSession):
    """Модель WalletTopup создаётся и пишется (идемпотентность по yookassa_id)."""
    from app.models.wallet_topup import WalletTopup
    import uuid as _uuid
    t = WalletTopup(user_id=_uuid.uuid4(), yookassa_id="pay_1", minutes=150, pack="w150")
    db_session.add(t)
    await db_session.commit()
    assert t.id is not None
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_wallet.py::test_wallet_topup_model_exists -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.wallet_topup'`

- [ ] **Step 3: Implement**

`backend/app/models/wallet_topup.py`:

```python
import uuid

from sqlalchemy import ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class WalletTopup(Base, UUIDMixin, TimestampMixin):
    """Пополнение кошелька (запись для идемпотентности webhook + история).

    yookassa_id уникален — повторный webhook по тому же платежу не начислит
    минуты дважды.
    """

    __tablename__ = "wallet_topups"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE")
    )
    yookassa_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    minutes: Mapped[int] = mapped_column(Integer)
    pack: Mapped[str] = mapped_column(String(20))
```

В `backend/app/models/__init__.py` добавить импорт рядом с другими моделями:

```python
from app.models.wallet_topup import WalletTopup  # noqa: F401
```

(добавить `"WalletTopup"` в `__all__`, если он там перечислен.)

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_wallet.py::test_wallet_topup_model_exists -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/wallet_topup.py backend/app/models/__init__.py
git commit -m "feat(wallet): WalletTopup model for webhook idempotency"
```

---

### Task 4: `create_wallet_payment` + кредит баланса

**Files:**
- Modify: `backend/app/services/payment.py`
- Test: `backend/tests/test_wallet.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_credit_wallet_adds_minutes_idempotent(db_session: AsyncSession):
    """credit_wallet начисляет минуты и не дублирует по тому же yookassa_id."""
    from app.services.payment import credit_wallet
    from app.models.user import User

    user = User(email=f"w-{uuid.uuid4().hex[:6]}@e.com", password_hash="x",
                plan="free", wallet_minutes=0)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    await credit_wallet(user.id, pack="w150", yookassa_id="pay_X", db=db_session)
    await db_session.refresh(user)
    assert user.wallet_minutes == 150

    # повторный webhook тем же платежом — не начисляет второй раз
    await credit_wallet(user.id, pack="w150", yookassa_id="pay_X", db=db_session)
    await db_session.refresh(user)
    assert user.wallet_minutes == 150
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_wallet.py::test_credit_wallet_adds_minutes_idempotent -v`
Expected: FAIL — `ImportError: cannot import name 'credit_wallet'`

- [ ] **Step 3: Implement**

В `backend/app/services/payment.py` добавить (рядом с `activate_subscription`):

```python
from app.models.wallet_topup import WalletTopup
from app.services.plans import WALLET_PACKS


async def create_wallet_payment(user_id: uuid.UUID, pack: str) -> dict:
    """Создание YooKassa-платежа для пополнения кошелька (пакет минут)."""
    import httpx

    if pack not in WALLET_PACKS:
        raise ValueError(f"Недопустимый пакет: {pack}. Допустимые: {', '.join(WALLET_PACKS)}")

    cfg = WALLET_PACKS[pack]
    idempotency_key = str(uuid.uuid4())

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.yookassa.ru/v3/payments",
            auth=(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY),
            headers={"Idempotence-Key": idempotency_key},
            json={
                "amount": {"value": f"{cfg['price_rub']:.2f}", "currency": "RUB"},
                "confirmation": {"type": "redirect",
                                 "return_url": f"{settings.APP_URL}/dashboard?wallet=success"},
                "capture": True,
                "description": f"Dicto — пополнение кошелька ({cfg['minutes']} мин)",
                "metadata": {"type": "wallet", "user_id": str(user_id), "pack": pack},
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()


async def credit_wallet(
    user_id: uuid.UUID, pack: str, yookassa_id: str, db: AsyncSession
) -> None:
    """Начисление минут на кошелёк (идемпотентно по yookassa_id)."""
    if pack not in WALLET_PACKS:
        logger.error("credit_wallet: unknown pack=%s", pack)
        return

    # Идемпотентность: уже обрабатывали этот платёж?
    existing = await db.execute(
        select(WalletTopup).where(WalletTopup.yookassa_id == yookassa_id)
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("Дубль wallet-webhook, пропускаем: yookassa_id=%s", yookassa_id)
        return

    minutes = WALLET_PACKS[pack]["minutes"]
    db.add(WalletTopup(user_id=user_id, yookassa_id=yookassa_id, minutes=minutes, pack=pack))

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user:
        user.wallet_minutes += minutes

    await db.commit()
    logger.info("Wallet credited: user=%s pack=%s minutes=%s", user_id, pack, minutes)
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_wallet.py::test_credit_wallet_adds_minutes_idempotent -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/payment.py backend/tests/test_wallet.py
git commit -m "feat(wallet): create_wallet_payment + idempotent credit_wallet"
```

---

### Task 5: Эндпоинт `/api/payments/wallet` + ветка webhook

**Files:**
- Modify: `backend/app/schemas/payment.py` (схемы topup)
- Modify: `backend/app/api/payments.py` (эндпоинт + webhook branch)
- Test: `backend/tests/test_wallet.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_wallet_topup_endpoint_rejects_bad_pack(client: AsyncClient):
    """POST /api/payments/wallet с неизвестным пакетом → 400."""
    token, _ = await _register(client)
    resp = await client.post("/api/payments/wallet", headers=_h(token),
                             json={"pack": "nonexistent"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_webhook_wallet_credits_minutes(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    """payment.succeeded с metadata.type=wallet начисляет минуты на кошелёк."""
    import app.api.payments as payments_mod
    _, email = await _register(client)
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()

    async def fake_verify(pid):
        return {"status": "succeeded",
                "amount": {"value": "299.00"},
                "metadata": {"type": "wallet", "user_id": str(user.id), "pack": "w150"}}

    monkeypatch.setattr(payments_mod, "verify_payment_via_api", fake_verify)
    monkeypatch.setattr(payments_mod, "is_yookassa_ip", lambda ip: True)

    resp = await client.post(
        "/api/payments/webhook",
        json={"event": "payment.succeeded", "object": {"id": "pay_W1"}},
        headers={"x-forwarded-for": "185.71.76.1"},
    )
    assert resp.status_code == 200
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    assert user.wallet_minutes == 150
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_wallet.py -v -k "topup_endpoint or webhook_wallet"`
Expected: FAIL — 404 на `/wallet` (нет роута) и `wallet_minutes == 0` (webhook не начислил)

- [ ] **Step 3: Implement**

В `backend/app/schemas/payment.py` добавить:

```python
class WalletTopupRequest(BaseModel):
    """Запрос на пополнение кошелька."""
    pack: str  # w150 / w400 / w1000


class WalletTopupResponse(BaseModel):
    payment_id: str
    confirmation_url: str
    status: str
```

В `backend/app/api/payments.py`:
1. Импорты — добавить `WALLET_PACKS, create_wallet_payment, credit_wallet` к импортам из `app.services.payment`, и `WalletTopupRequest, WalletTopupResponse` из схем.
2. Новый эндпоинт (после `subscribe`):

```python
@router.post("/wallet", response_model=WalletTopupResponse)
async def topup_wallet(
    req: WalletTopupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создание платежа для пополнения кошелька (пакет минут)."""
    if req.pack not in WALLET_PACKS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые пакеты: {', '.join(WALLET_PACKS)}",
        )
    try:
        payment = await create_wallet_payment(user.id, req.pack)
    except Exception as e:
        logger.exception("Wallet payment creation failed: %s", e)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Ошибка при создании платежа. Попробуйте позже.")
    return WalletTopupResponse(
        payment_id=payment["id"],
        confirmation_url=payment["confirmation"]["confirmation_url"],
        status=payment["status"],
    )
```

3. В `yookassa_webhook`, в блоке после успешной верификации (`verified["status"] == "succeeded"`), ДО текущей логики подписки, разветвить по типу. Найти строку `metadata = verified.get("metadata", {})` и сразу после неё вставить:

```python
    # Ветка кошелька: пополнение баланса (не подписка).
    if metadata.get("type") == "wallet":
        pack = metadata.get("pack")
        user_id_str = metadata.get("user_id")
        if not (pack and user_id_str):
            logger.warning("Wallet webhook %s: missing pack/user_id", yookassa_id)
            return {"status": "ok"}
        expected = f"{WALLET_PACKS.get(pack, {}).get('price_rub', -1):.2f}"
        actual = (verified.get("amount") or {}).get("value")
        if pack not in WALLET_PACKS or actual != expected:
            logger.error("Wallet webhook %s: amount mismatch expected=%s got=%s pack=%s",
                         yookassa_id, expected, actual, pack)
            return {"status": "ok"}
        await credit_wallet(uuid.UUID(user_id_str), pack, yookassa_id, db)
        return {"status": "ok"}
```

(существующая подписочная логика ниже остаётся без изменений — она срабатывает, когда `type != "wallet"`.)

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_wallet.py -v -k "topup_endpoint or webhook_wallet"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/payment.py backend/app/api/payments.py backend/tests/test_wallet.py
git commit -m "feat(wallet): /api/payments/wallet endpoint + webhook wallet branch"
```

---

### Task 6: Списание минут с кошелька (Celery deduction)

**Files:**
- Modify: `backend/app/tasks/transcribe.py:96-107`
- Test: `backend/tests/test_wallet.py` (unit на чистой функции расхода)

- [ ] **Step 1: Write the failing test**

```python
def test_consume_order_bonus_monthly_wallet():
    """Расход: сначала bonus, затем monthly (до лимита), затем wallet."""
    from app.tasks.transcribe import consume_minutes

    # bonus 30, лимита нет, кошелёк 150; файл 100 мин →
    # 30 из bonus, 0 monthly, 70 из wallet.
    assert consume_minutes(bonus=30, used=0, limit=0, wallet=150, minutes=100) == \
        (0, 0, 80)   # (new_bonus, new_used, new_wallet)

    # bonus 0, monthly лимит 600 (used 0), wallet 150; файл 50 → всё из monthly.
    assert consume_minutes(bonus=0, used=0, limit=600, wallet=150, minutes=50) == \
        (0, 50, 150)

    # bonus 0, monthly исчерпан (used==limit), wallet 150; файл 40 → из wallet.
    assert consume_minutes(bonus=0, used=600, limit=600, wallet=150, minutes=40) == \
        (0, 600, 110)
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_wallet.py::test_consume_order_bonus_monthly_wallet -v`
Expected: FAIL — `ImportError: cannot import name 'consume_minutes'`

- [ ] **Step 3: Implement**

В `backend/app/tasks/transcribe.py` добавить чистую функцию (рядом с импортами/верхом модуля):

```python
def consume_minutes(bonus: int, used: int, limit: int, wallet: int, minutes: int) -> tuple[int, int, int]:
    """Расход minutes по порядку bonus → monthly(до limit) → wallet.

    Возвращает (new_bonus, new_used, new_wallet). Остаток сверх всех ведёрок
    игнорируется (минуты «сгорают» — но upload-precheck это не пропустит).
    """
    if bonus > 0:
        spent = min(bonus, minutes)
        bonus -= spent
        minutes -= spent
    if minutes > 0 and limit > 0:
        avail = max(0, limit - used)
        spent = min(avail, minutes)
        used += spent
        minutes -= spent
    if minutes > 0 and wallet > 0:
        spent = min(wallet, minutes)
        wallet -= spent
        minutes -= spent
    return bonus, used, wallet
```

Заменить блок списания (строки ~100-107) на вызов:

```python
            user = db.get(User, transcription.user_id)
            if user and result.duration_sec:
                minutes = math.ceil(result.duration_sec / 60)
                user.bonus_minutes, user.minutes_used, user.wallet_minutes = consume_minutes(
                    user.bonus_minutes, user.minutes_used, user.minutes_limit,
                    user.wallet_minutes, minutes,
                )
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_wallet.py::test_consume_order_bonus_monthly_wallet -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/tasks/transcribe.py backend/tests/test_wallet.py
git commit -m "feat(wallet): consume minutes bonus->monthly->wallet on completion"
```

---

### Task 7: Пейволл — гейт разбора/чата/загрузки + структурный 402

**Files:**
- Modify: `backend/app/api/ai_analysis.py:21-62` (`_check_analysis_limits`)
- Modify: `backend/app/api/chat.py:34-38` (гейт чата)
- Modify: `backend/app/api/transcriptions.py:165-173` + `:318-325` (upload/url precheck → 402 с путями)
- Test: `backend/tests/test_wallet.py`

- [ ] **Step 1: Write the failing tests**

```python
@pytest.mark.asyncio
async def test_free_second_analysis_blocked(client: AsyncClient, db_session: AsyncSession):
    """Free-юзер: 1-й разбор бесплатно, 2-й (другой тип) → 403 пейволл."""
    from app.models.transcription import Transcription
    from app.models.ai_analysis import AiAnalysis
    token, email = await _register(client)
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.plan = "free"; user.wallet_minutes = 0
    tr = Transcription(user_id=user.id, status="completed", full_text="привет это тест",
                       file_key="k", original_filename="a.mp3")
    db_session.add(tr)
    # уже есть 1 разбор (summary) — проба израсходована
    db_session.add(AiAnalysis(transcription_id=tr.id, type="summary", content="x",
                              length="standard", model_used="m", tokens_used=1))
    await db_session.commit()

    resp = await client.get(f"/api/transcriptions/{tr.id}/key-points", headers=_h(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_wallet_user_analysis_unlimited(client: AsyncClient, db_session: AsyncSession):
    """Юзер с кошельком (wallet>0) — разбор без free-лимита (как платный)."""
    from app.services.plans import has_paid_access
    class U:
        plan = "free"; wallet_minutes = 50; is_admin = False
    assert has_paid_access(U()) is True  # → _check_analysis_limits вернёт рано


@pytest.mark.asyncio
async def test_chat_blocked_for_free(client: AsyncClient, db_session: AsyncSession):
    """Free без кошелька → чат закрыт (403)."""
    from app.models.transcription import Transcription
    token, email = await _register(client)
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.plan = "free"; user.wallet_minutes = 0
    tr = Transcription(user_id=user.id, status="completed", full_text="t",
                       file_key="k", original_filename="a.mp3")
    db_session.add(tr); await db_session.commit()
    resp = await client.post(f"/api/transcriptions/{tr.id}/chat", headers=_h(token),
                             json={"message": "о чём запись?"})
    assert resp.status_code == 403
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_wallet.py -v -k "second_analysis or wallet_user_analysis or chat_blocked"`
Expected: FAIL — 2-й разбор отдаёт 200 (free ai_summaries был 5; теперь 1, но гейт ещё не через has_paid_access) / прочие

- [ ] **Step 3: Implement**

`backend/app/api/ai_analysis.py` — в начало `_check_analysis_limits` (после `if user.is_admin: return`) добавить платный bypass:

```python
    from app.services.plans import has_paid_access
    if has_paid_access(user):
        return  # платный доступ (подписка или кошелёк) — без free-лимитов
```

`backend/app/api/chat.py` — заменить условие гейта (строки ~34-38):

```python
    from app.services.plans import has_paid_access
    if not user.is_admin and not has_paid_access(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Чат по записи доступен на Pro или с кошелька. Пополните баланс или оформите Pro.",
        )
```

`backend/app/api/transcriptions.py` — в обоих precheck-местах (upload ~168 и url ~321) заменить расчёт и ошибку:

```python
    available_minutes = user.bonus_minutes + max(0, user.minutes_limit - user.minutes_used) + user.wallet_minutes
    if not user.is_admin and not user.is_unlimited and available_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "reason": "no_minutes",
                "message": "Минуты закончились. Пополните кошелёк или оформите Pro.",
                "paths": ["wallet", "pro"],
            },
        )
```

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_wallet.py -v -k "second_analysis or wallet_user_analysis or chat_blocked"`
Expected: PASS

- [ ] **Step 5: Run the FULL suite (regression)**

Run (из `backend/`): `pytest -q`
Expected: PASS. Если упал `test_bonus_minutes.py` или `test_limits.py` из-за смены дефолта `bonus_minutes` (180→30) — поправить ожидания в тех тестах на новое значение (это намеренное изменение, не баг).

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/ai_analysis.py backend/app/api/chat.py backend/app/api/transcriptions.py backend/tests/test_wallet.py
git commit -m "feat(wallet): paywall gating via has_paid_access (analysis/chat/upload 402)"
```

---

### Task 8: Баланс кошелька в API-ответе + миграция

**Files:**
- Modify: `backend/app/schemas/payment.py` (`SubscriptionResponse` + `wallet_minutes`)
- Modify: `backend/app/api/payments.py` (`get_subscription` отдаёт баланс)
- Create: `backend/alembic/versions/*` (миграция полей)
- Test: `backend/tests/test_wallet.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_subscription_response_includes_wallet(client: AsyncClient, db_session: AsyncSession):
    """GET /api/payments/subscription возвращает wallet_minutes."""
    token, email = await _register(client)
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.wallet_minutes = 150
    await db_session.commit()
    resp = await client.get("/api/payments/subscription", headers=_h(token))
    assert resp.status_code == 200
    assert resp.json()["wallet_minutes"] == 150
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_wallet.py::test_subscription_response_includes_wallet -v`
Expected: FAIL — KeyError/`wallet_minutes` отсутствует в ответе

- [ ] **Step 3: Implement**

В `backend/app/schemas/payment.py`, `SubscriptionResponse` добавить поле:

```python
    wallet_minutes: int = 0
```

В `backend/app/api/payments.py`, оба `return SubscriptionResponse(...)` в `get_subscription` дополнить:

```python
            wallet_minutes=user.wallet_minutes,
```

(в обеих ветках — и при активной подписке, и без неё.)

- [ ] **Step 4: Run to verify pass**

Run: `pytest tests/test_wallet.py::test_subscription_response_includes_wallet -v`
Expected: PASS

- [ ] **Step 5: Сгенерировать и применить миграцию**

Run (из `backend/`, при поднятой dev-БД):
```bash
alembic revision --autogenerate -m "wallet: wallet_minutes on users, wallet_topups table, bonus default 30"
```
Проверить сгенерированный файл: должен добавлять колонку `users.wallet_minutes` (server_default '0' для существующих строк — добавить вручную, если autogenerate не проставил: `server_default="0"`), таблицу `wallet_topups`. Затем:
```bash
alembic upgrade head
```
Expected: миграция применяется без ошибок.

> **Важно по существующим юзерам:** дефолт `bonus_minutes` 180→30 действует только для НОВЫХ. Существующие сохраняют свои значения — это ок (memory: grandfather не нужен, лишние минуты у старых не вредят тесту).

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/payment.py backend/app/api/payments.py backend/alembic/versions/
git commit -m "feat(wallet): expose wallet_minutes in subscription response + migration"
```

---

## Self-Review

**Spec coverage (§ спека → задача):**
- §3.3 кошелёк (баланс/пополнение/списание) → Tasks 1,3,4,5,6 ✅
- §3.3 граница free/Pro (гейт разбора, проба) → Tasks 2,7 ✅
- §3.3 пейволл 2 пути (структурный ответ) → Task 7 (402 + `paths:[wallet,pro]`) ✅
- §3.5 минимальный кошелёк без полного ledger → `wallet_topups` только для идемпотентности ✅
- §3.3 экспорт бесплатный → НЕ гейтим (намеренно нет задачи) ✅
- §3.2 цели Метрики (`analysis_view`/`paywall_hit`/`checkout_started`) → **ops/frontend-трек, не backend-план** (вынесено) ✅
- Pro-подписка → существует, не трогаем (Task 7 даёт ей bypass через `plan != free`) ✅

**Placeholder scan:** код полный в каждом шаге; миграция — через autogenerate (конвенция проекта), с явной проверкой server_default. Нет TBD/TODO.

**Type consistency:** `has_paid_access(user)` сигнатура едина (Tasks 2,7). `consume_minutes(bonus,used,limit,wallet,minutes)->(bonus,used,wallet)` едина (Task 6). `credit_wallet(user_id,pack,yookassa_id,db)` едина (Tasks 4,5). `WALLET_PACKS[pack]={price_rub,minutes}` едина (Tasks 2,4,5).

**Открытый риск:** смена дефолта `bonus_minutes` может уронить `test_bonus_minutes.py`/`test_limits.py` — Task 7 Step 5 ловит это полным прогоном и правит ожидания.

---

## Вне рамок этого плана (отдельные планы/треки)
- **Frontend:** пейволл-экран (2 пути), 3 лендинга, ватермарк free-экспорта, UTM — План 2.
- **Ops:** цели Метрики, пауза текущей кампании, 3 группы в Директе — отдельный трек (Direct API).
- **После теста:** полная перекройка под победителя.
