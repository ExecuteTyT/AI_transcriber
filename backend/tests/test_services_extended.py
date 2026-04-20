"""Расширенные тесты сервисов: plans, storage, voxtral, markdown rendering."""
import pytest

from app.services.plans import get_plan


# ─── Plans ───

def test_free_plan_limits():
    """Free план: 30 мин/мес, 5 саммари, без action items."""
    plan = get_plan("free")
    assert plan.minutes_limit == 30
    assert plan.action_items is False
    assert plan.ai_summaries == 5
    assert plan.price_rub == 0
    assert plan.overage_rub_per_min == 4.0


def test_start_plan_limits():
    """Start план: 600 мин (10 ч), action items, безлимит саммари."""
    plan = get_plan("start")
    assert plan.minutes_limit == 600
    assert plan.action_items is True
    assert plan.ai_summaries == -1
    assert plan.price_rub == 500
    assert plan.overage_rub_per_min == 2.0


def test_pro_plan_limits():
    """Pro план: 1500 мин (25 ч), action items."""
    plan = get_plan("pro")
    assert plan.minutes_limit == 1500
    assert plan.action_items is True
    assert plan.ai_summaries == -1
    assert plan.price_rub == 820


def test_business_plan_limits():
    """Business план: 3600 мин (60 ч), 5 пользователей."""
    plan = get_plan("business")
    assert plan.minutes_limit == 3600
    assert plan.max_users == 5
    assert plan.price_rub == 2300


def test_premium_plan_limits():
    """Premium план: 7200 мин (120 ч), 10 пользователей."""
    plan = get_plan("premium")
    assert plan.minutes_limit == 7200
    assert plan.max_users == 10
    assert plan.price_rub == 4600
    assert plan.max_file_duration_sec == 6 * 60 * 60


def test_unknown_plan_defaults_to_free():
    """Неизвестный план → free (30 мин)."""
    plan = get_plan("nonexistent")
    assert plan.minutes_limit == 30
    assert plan.price_rub == 0


def test_all_plans_have_overage_rate():
    """Все тарифы имеют положительную overage-ставку (не 0)."""
    from app.services.plans import PLANS
    for code, plan in PLANS.items():
        assert plan.overage_rub_per_min > 0, f"{code} должен иметь overage"


def test_plan_margin_above_70_percent():
    """Маржа на всех платных тарифах ≥ 70% даже после 2.8% эквайринга + 6% УСН.

    Себестоимость 1 мин ≈ 0.087 ₽ (Voxtral + AI + embeddings).
    """
    from app.services.plans import PLANS
    api_cost_per_min = 0.087
    payment_overhead = 0.028 + 0.06  # YooKassa + УСН

    for code, plan in PLANS.items():
        if plan.price_rub == 0:
            continue
        api_cost = plan.minutes_limit * api_cost_per_min
        overhead = plan.price_rub * payment_overhead
        net_profit = plan.price_rub - api_cost - overhead
        margin = net_profit / plan.price_rub
        assert margin >= 0.70, f"{code}: маржа {margin:.1%} < 70%"


# ─── Local Storage ───

def test_local_storage_upload_download(tmp_path):
    """LocalStorage: upload → download → delete."""
    from app.services.storage import LocalStorage

    # Переопределяем путь
    class TestStorage(LocalStorage):
        def __init__(self):
            self.base_dir = tmp_path
            self.base_dir.mkdir(parents=True, exist_ok=True)

    storage = TestStorage()

    # Upload
    file_key = "uploads/test-file.txt"
    storage.upload_file(b"hello world", file_key, "text/plain")

    # Download
    data = storage.download_file(file_key)
    assert data == b"hello world"

    # Delete
    storage.delete_file(file_key)
    with pytest.raises(FileNotFoundError):
        storage.download_file(file_key)


def test_local_storage_file_not_found(tmp_path):
    """LocalStorage: скачивание несуществующего файла."""
    from app.services.storage import LocalStorage

    class TestStorage(LocalStorage):
        def __init__(self):
            self.base_dir = tmp_path

    storage = TestStorage()
    with pytest.raises(FileNotFoundError):
        storage.download_file("nonexistent.txt")


# ─── Storage Key Generation ───

def test_generate_file_key_preserves_extension():
    """Генерация ключа сохраняет расширение файла."""
    from app.services.storage import StorageBackend

    backend = StorageBackend()
    key = backend.generate_file_key("podcast.mp3")
    assert key.endswith(".mp3")
    assert key.startswith("uploads/")


def test_generate_file_key_no_extension():
    """Генерация ключа без расширения."""
    from app.services.storage import StorageBackend

    backend = StorageBackend()
    key = backend.generate_file_key("noext")
    assert key.startswith("uploads/")
    assert "." not in key.split("/")[-1]


# ─── Voxtral Provider ───

def test_voxtral_provider_instantiates():
    """VoxtralProvider можно создать."""
    from app.services.voxtral import VoxtralProvider

    provider = VoxtralProvider()
    assert provider.API_URL == "https://api.mistral.ai/v1/audio/transcriptions"


# ─── TranscriptionResult ───

def test_transcription_result_dataclass():
    """TranscriptionResult хранит все поля."""
    from app.services.transcription import Segment, TranscriptionResult

    result = TranscriptionResult(
        full_text="Hello",
        segments=[Segment(start=0, end=5, text="Hello", speaker="S1")],
        language="en",
        duration_sec=5,
    )
    assert result.full_text == "Hello"
    assert len(result.segments) == 1
    assert result.segments[0].speaker == "S1"
    assert result.duration_sec == 5


# ─── AI Analysis Split ───

def test_split_text_respects_sentence_boundaries():
    """Разбиение по границам предложений."""
    from app.services.ai_analysis import _split_text

    text = "Первое предложение. Второе предложение. Третье предложение. Четвёртое предложение."
    chunks = _split_text(text, 50)
    # Каждый чанк должен быть <= 50 символов
    for chunk in chunks:
        assert len(chunk) <= 50, f"Chunk too long: {len(chunk)} chars"


def test_split_text_single_chunk():
    """Короткий текст → один чанк."""
    from app.services.ai_analysis import _split_text

    chunks = _split_text("Short text.", 1000)
    assert len(chunks) == 1
    assert chunks[0] == "Short text."


def test_split_text_zero_max():
    """max_chars <= 0 → весь текст как один чанк."""
    from app.services.ai_analysis import _split_text

    assert _split_text("text", 0) == ["text"]
    assert _split_text("text", -1) == ["text"]
