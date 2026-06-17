"""Тесты форматирования для Telegram-бота (md_to_html, format_transcript)."""
from app.bot.format import format_transcript, md_to_html


def test_md_headers_and_bold():
    out = md_to_html("## Краткое содержание\nЭто **важно** и *курсив*.")
    assert "<b>Краткое содержание</b>" in out
    assert "<b>важно</b>" in out
    assert "<i>курсив</i>" in out
    assert "##" not in out and "**" not in out


def test_md_bullets_and_checkboxes():
    out = md_to_html("- пункт один\n- [ ] задача\n- [x] сделано")
    assert "• пункт один" in out
    assert "☐ задача" in out
    assert "☑ сделано" in out


def test_md_numbered_list():
    out = md_to_html("1. первый\n2. второй")
    assert "1. первый" in out and "2. второй" in out


def test_md_escapes_html():
    # Спецсимволы экранируются, чтобы не сломать Telegram HTML.
    out = md_to_html("Сравнение a < b & c > d")
    assert "&lt;" in out and "&amp;" in out and "&gt;" in out
    assert "<b" not in out  # никаких случайных тегов из текста


def test_format_transcript_with_speakers():
    segments = [
        {"start": 0, "end": 2, "speaker": "SPEAKER_00", "text": "Привет."},
        {"start": 2, "end": 4, "speaker": "SPEAKER_00", "text": "Как дела?"},
        {"start": 4, "end": 6, "speaker": "SPEAKER_01", "text": "Хорошо."},
    ]
    out = format_transcript(segments, None)
    assert "<b>Спикер 1</b>" in out
    assert "<b>Спикер 2</b>" in out
    # подряд идущие реплики одного спикера склеены
    assert "Привет. Как дела?" in out


def test_format_transcript_no_speakers_paragraphs():
    text = "Первое предложение. Второе предложение. Третье. Четвёртое. Пятое. Шестое."
    out = format_transcript(None, text)
    assert "\n\n" in out  # разбито на абзацы
    assert "&lt;" not in out  # нет спецсимволов — ничего лишнего


def test_format_transcript_escapes():
    out = format_transcript(None, "a < b & c")
    assert "&lt;" in out and "&amp;" in out


def test_format_transcript_empty():
    assert format_transcript(None, "") == "(пустая расшифровка)"
