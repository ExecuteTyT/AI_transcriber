"""Тесты кошелька (wallet_minutes), пробы-пейволла и платного доступа."""
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


@pytest.mark.asyncio
async def test_wallet_topup_model_exists(db_session: AsyncSession):
    """Модель WalletTopup создаётся и пишется (идемпотентность по yookassa_id)."""
    from app.models.wallet_topup import WalletTopup
    t = WalletTopup(user_id=uuid.uuid4(), yookassa_id="pay_1", minutes=150, pack="w150")
    db_session.add(t)
    await db_session.commit()
    assert t.id is not None


@pytest.mark.asyncio
async def test_credit_wallet_adds_minutes_idempotent(db_session: AsyncSession):
    """credit_wallet начисляет минуты и не дублирует по тому же yookassa_id."""
    from app.services.payment import credit_wallet

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
    # credit_wallet коммитит в request-scoped сессии; сбрасываем снапшот db_session
    # (отдельное SQLite-соединение), чтобы перечитать актуальное состояние.
    await db_session.rollback()
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    assert user.wallet_minutes == 150


def test_recommend_topup_smallest_covering_pack():
    """recommend_topup: минимальный пакет, покрывающий нехватку минут."""
    from app.services.plans import recommend_topup

    # файл 60 мин, доступно 30 → нехватка 30 → w150 (150≥30), 299₽
    r = recommend_topup(file_minutes=60, available_minutes=30)
    assert r["shortfall_minutes"] == 30
    assert r["pack"] == "w150"
    assert r["price_rub"] == 299

    # файл 200 мин, доступно 30 → нехватка 170 → w400 (400≥170)
    assert recommend_topup(file_minutes=200, available_minutes=30)["pack"] == "w400"

    # файл влезает в баланс → None (докидывать не нужно)
    assert recommend_topup(file_minutes=20, available_minutes=30) is None
    assert recommend_topup(file_minutes=30, available_minutes=30) is None

    # нехватка больше самого большого пакета → fallback на максимальный (UI подскажет Pro)
    assert recommend_topup(file_minutes=5000, available_minutes=0)["pack"] == "w1000"


def test_gate_by_duration():
    """gate_by_duration — общее решение duration-gate для upload и URL-ingest."""
    from app.services.plans import gate_by_duration

    # файл влезает в баланс → None (можно расшифровывать)
    assert gate_by_duration(20 * 60, 30) is None
    assert gate_by_duration(30 * 60, 30) is None  # ровно по балансу

    # файл длиннее баланса → payload пейволла с topup
    g = gate_by_duration(60 * 60, 30)  # 60 мин > 30
    assert g["reason"] == "file_exceeds_balance"
    assert g["file_minutes"] == 60
    assert g["available_minutes"] == 30
    assert g["topup"]["pack"] == "w150"
    assert g["paths"] == ["wallet", "pro"]

    # длительность неизвестна → None (best-effort, не блокируем)
    assert gate_by_duration(None, 30) is None
    assert gate_by_duration(0, 30) is None

    # админ / безлимит → None (без гейта)
    assert gate_by_duration(999 * 60, 0, is_admin=True) is None
    assert gate_by_duration(999 * 60, 0, is_unlimited=True) is None


def test_build_payment_description_includes_email():
    """Описание платежа содержит email аккаунта (видно в кабинете ЮKassa)."""
    from app.services.payment import build_payment_description

    assert build_payment_description("Dicto — тариф Про", "oleg@e.com") == "Dicto — тариф Про · oleg@e.com"
    # без email — только база
    assert build_payment_description("Dicto — тариф Про", None) == "Dicto — тариф Про"
    assert build_payment_description("Dicto — тариф Про", "") == "Dicto — тариф Про"
    # лимит 128 символов
    assert len(build_payment_description("X" * 200, "a@b.com")) == 128


def test_consume_order_bonus_monthly_wallet():
    """Расход: сначала bonus, затем monthly (до лимита), затем wallet."""
    from app.tasks.transcribe import consume_minutes

    # bonus 30, лимита нет, кошелёк 150; файл 100 мин →
    # 30 из bonus, 0 monthly, 70 из wallet → остаётся wallet 80.
    assert consume_minutes(bonus=30, used=0, limit=0, wallet=150, minutes=100) == (0, 0, 80)

    # bonus 0, monthly лимит 600 (used 0), wallet 150; файл 50 → всё из monthly.
    assert consume_minutes(bonus=0, used=0, limit=600, wallet=150, minutes=50) == (0, 50, 150)

    # bonus 0, monthly исчерпан (used==limit), wallet 150; файл 40 → из wallet.
    assert consume_minutes(bonus=0, used=600, limit=600, wallet=150, minutes=40) == (0, 600, 110)


@pytest.mark.asyncio
async def test_free_second_analysis_blocked(client: AsyncClient, db_session: AsyncSession):
    """Free-юзер: 1-й разбор бесплатно, 2-й (другой тип) → 403 пейволл."""
    from app.models.transcription import Transcription
    from app.models.ai_analysis import AiAnalysis
    _, email = await _register(client)
    token_resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "password1"})
    token = token_resp.json()["access_token"]
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.plan = "free"
    user.wallet_minutes = 0
    tr = Transcription(user_id=user.id, status="completed", full_text="привет это тест",
                       file_key="k", original_filename="a.mp3")
    db_session.add(tr)
    await db_session.flush()
    # уже есть 1 разбор (summary) — проба израсходована
    db_session.add(AiAnalysis(transcription_id=tr.id, type="summary", content="x",
                              length="standard", model_used="m", tokens_used=1))
    await db_session.commit()
    tr_id = tr.id

    resp = await client.get(f"/api/transcriptions/{tr_id}/key-points", headers=_h(token))
    assert resp.status_code == 402
    assert resp.json()["detail"]["paths"] == ["wallet", "pro"]


def test_wallet_user_has_paid_access():
    """Юзер с кошельком (wallet>0) — платный доступ (разбор/чат без free-лимита)."""
    from app.services.plans import has_paid_access

    class U:
        plan = "free"
        wallet_minutes = 50

    assert has_paid_access(U()) is True


@pytest.mark.asyncio
async def test_chat_blocked_for_free(client: AsyncClient, db_session: AsyncSession):
    """Free без кошелька → чат закрыт (403)."""
    from app.models.transcription import Transcription
    _, email = await _register(client)
    token_resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "password1"})
    token = token_resp.json()["access_token"]
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.plan = "free"
    user.wallet_minutes = 0
    tr = Transcription(user_id=user.id, status="completed", full_text="t",
                       file_key="k", original_filename="a.mp3")
    db_session.add(tr)
    await db_session.commit()
    tr_id = tr.id
    resp = await client.post(f"/api/transcriptions/{tr_id}/chat", headers=_h(token),
                             json={"message": "о чём запись?"})
    assert resp.status_code == 402
    assert resp.json()["detail"]["paths"] == ["wallet", "pro"]


@pytest.mark.asyncio
async def test_upload_no_minutes_returns_402_paywall(client: AsyncClient, db_session: AsyncSession):
    """Free без минут (bonus+monthly+wallet=0) → 402 с путями [wallet, pro]."""
    _, email = await _register(client)
    token_resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "password1"})
    token = token_resp.json()["access_token"]
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.plan = "free"
    user.minutes_limit = 0
    user.minutes_used = 0
    user.bonus_minutes = 0
    user.wallet_minutes = 0
    await db_session.commit()

    resp = await client.post(
        "/api/transcriptions/upload", headers=_h(token),
        files={"file": ("test.mp3", b"fake", "audio/mpeg")},
    )
    assert resp.status_code == 402
    detail = resp.json()["detail"]
    assert detail["paths"] == ["wallet", "pro"]


@pytest.mark.asyncio
async def test_upload_long_file_returns_402_with_topup(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    """Файл длиннее баланса → 402 file_exceeds_balance + сколько докинуть."""
    import app.api.transcriptions as tr_api
    _, email = await _register(client)
    token_resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "password1"})
    token = token_resp.json()["access_token"]
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.plan = "free"
    user.minutes_limit = 0
    user.minutes_used = 0
    user.bonus_minutes = 30
    user.wallet_minutes = 0
    await db_session.commit()

    # файл «на час» — probe вернёт 3600 сек
    monkeypatch.setattr(tr_api, "probe_duration_sec", lambda data: 3600)

    resp = await client.post(
        "/api/transcriptions/upload", headers=_h(token),
        files={"file": ("big.mp3", b"fake-but-long", "audio/mpeg")},
    )
    assert resp.status_code == 402
    d = resp.json()["detail"]
    assert d["reason"] == "file_exceeds_balance"
    assert d["file_minutes"] == 60
    assert d["available_minutes"] == 30
    assert d["topup"]["pack"] == "w150"        # 30 мин нехватки → пакет 150 мин
    assert d["topup"]["price_rub"] == 299


@pytest.mark.asyncio
async def test_upload_unprobeable_file_proceeds(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    """probe=None (длину не определить) → не блокируем, грузим как обычно."""
    import app.api.transcriptions as tr_api
    _, email = await _register(client)
    token_resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "password1"})
    token = token_resp.json()["access_token"]
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.bonus_minutes = 30
    await db_session.commit()

    monkeypatch.setattr(tr_api, "probe_duration_sec", lambda data: None)

    resp = await client.post(
        "/api/transcriptions/upload", headers=_h(token),
        files={"file": ("x.mp3", b"fake", "audio/mpeg")},
    )
    assert resp.status_code == 201  # прошло (best-effort fallback)


@pytest.mark.asyncio
async def test_subscription_response_includes_wallet(client: AsyncClient, db_session: AsyncSession):
    """GET /api/payments/subscription возвращает wallet_minutes."""
    _, email = await _register(client)
    token_resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "password1"})
    token = token_resp.json()["access_token"]
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    user.wallet_minutes = 150
    await db_session.commit()
    resp = await client.get("/api/payments/subscription", headers=_h(token))
    assert resp.status_code == 200
    assert resp.json()["wallet_minutes"] == 150
