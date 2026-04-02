"""Расширенные тесты сервисов: plans, storage, voxtral, markdown rendering."""
import pytest

from app.services.plans import get_plan


# ─── Plans ───

def test_free_plan_limits():
    """Free план: 15 мин, нет action items, 3 саммари."""
    plan = get_plan("free")
    assert plan.minutes_limit == 15
    assert plan.action_items is False
    assert plan.ai_summaries == 3


def test_start_plan_limits():
    """Start план: 300 мин, нет action items, безлимит саммари."""
    plan = get_plan("start")
    assert plan.minutes_limit == 300
    assert plan.action_items is False
    assert plan.ai_summaries == -1  # безлимит


def test_pro_plan_limits():
    """Pro план: 1200 мин, есть action items."""
    plan = get_plan("pro")
    assert plan.minutes_limit == 1200
    assert plan.action_items is True
    assert plan.ai_summaries == -1


def test_unknown_plan_defaults_to_free():
    """Неизвестный план → free."""
    plan = get_plan("nonexistent")
    assert plan.minutes_limit == 15


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
