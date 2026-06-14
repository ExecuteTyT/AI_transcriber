"""Тесты экспорта транскрипций (TXT / SRT / DOCX).

Регрессия: сегмент без тайминга (start/end = None) ронял SRT/DOCX с TypeError
(`None // 60`) → 500 при скачивании. Форматтеры времени теперь трактуют None как 0.
"""

import datetime
from types import SimpleNamespace

from app.services.export import export_docx, export_srt, export_txt


def _t(**kw):
    base = dict(
        title="Совещание Q3",
        language="ru",
        duration_sec=754.0,
        created_at=datetime.datetime(2026, 6, 3, 12, 0),
        segments=[],
        full_text="привет",
    )
    base.update(kw)
    return SimpleNamespace(**base)


def test_docx_normal_segments():
    t = _t(segments=[{"start": 0.0, "end": 5.0, "speaker": "Спикер 1", "text": "Привет"}])
    data = export_docx(t)
    assert isinstance(data, bytes) and len(data) > 0


def test_docx_segment_without_timing_does_not_crash():
    """start=None не должен ронять экспорт (раньше → TypeError → 500)."""
    t = _t(segments=[{"start": None, "end": None, "speaker": "S1", "text": "без тайминга"}])
    data = export_docx(t)
    assert isinstance(data, bytes) and len(data) > 0


def test_srt_segment_without_timing_does_not_crash():
    t = _t(segments=[{"start": None, "end": None, "text": "x"}])
    srt = export_srt(t)
    assert "00:00:00,000" in srt


def test_txt_export_returns_full_text():
    # Нет сегментов со спикерами → fallback на full_text (обратная совместимость).
    assert export_txt(_t(full_text="текст")) == "текст"


def test_speaker_label_mapping_and_grouping():
    """Сырые ID → 'Спикер N' по появлению; подряд идущие реплики склеиваются в ход."""
    from app.services.export import group_by_speaker
    segs = [
        {"start": 3, "end": 5, "speaker": "SPEAKER_00", "text": "Добрый вечер."},
        {"start": 5, "end": 7, "speaker": "SPEAKER_01", "text": "Да?"},
        {"start": 7, "end": 9, "speaker": "SPEAKER_01", "text": "Виктор?"},
        {"start": 9, "end": 12, "speaker": "SPEAKER_00", "text": "Я представитель."},
    ]
    turns = group_by_speaker(segs)
    assert [t["label"] for t in turns] == ["Спикер 1", "Спикер 2", "Спикер 1"]
    assert len(turns[1]["items"]) == 2  # две реплики Спикера 2 в одном ходе


def test_txt_grouped_by_speaker():
    t = _t(full_text="x", segments=[
        {"start": 3, "end": 5, "speaker": "A", "text": "Добрый вечер."},
        {"start": 33, "end": 35, "speaker": "A", "text": "Цель визита."},
        {"start": 57, "end": 59, "speaker": "B", "text": "Да."},
    ])
    out = export_txt(t)
    assert out.count("Спикер 1:") == 1  # шапка спикера один раз на ход
    assert "Спикер 2:" in out
    assert "00:00:03 - Добрый вечер." in out
    assert "00:00:33 - Цель визита." in out


def test_docx_grouped_contains_speaker_headers():
    import io
    from docx import Document
    t = _t(segments=[
        {"start": 3, "end": 5, "speaker": "SPEAKER_00", "text": "Добрый вечер."},
        {"start": 5, "end": 7, "speaker": "SPEAKER_01", "text": "Да."},
    ])
    doc = Document(io.BytesIO(export_docx(t)))
    txt = "\n".join(p.text for p in doc.paragraphs)
    assert "Спикер 1:" in txt and "Спикер 2:" in txt
    assert "00:00:03" in txt
