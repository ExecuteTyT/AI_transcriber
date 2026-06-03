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
    assert export_txt(_t(full_text="текст")) == "текст"
