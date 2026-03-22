import io

from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from app.models.transcription import Transcription


def export_txt(transcription: Transcription) -> str:
    """Экспорт транскрипции в TXT."""
    return transcription.full_text or ""


def _format_srt_time(seconds: float) -> str:
    """Форматирование секунд в SRT-формат (HH:MM:SS,mmm)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_time_short(seconds: float) -> str:
    """Форматирование секунд в короткий формат (MM:SS)."""
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"


def export_srt(transcription: Transcription) -> str:
    """Экспорт транскрипции в SRT (субтитры)."""
    segments = transcription.segments or []
    lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_srt_time(seg.get("start", 0))
        end = _format_srt_time(seg.get("end", 0))
        text = seg.get("text", "")
        speaker = seg.get("speaker", "")
        prefix = f"[{speaker}] " if speaker else ""
        lines.append(f"{i}\n{start} --> {end}\n{prefix}{text}\n")
    return "\n".join(lines)


def export_docx(transcription: Transcription) -> bytes:
    """Экспорт транскрипции в DOCX с форматированием и спикерами."""
    doc = Document()

    # Заголовок
    title_para = doc.add_heading(transcription.title or "Транскрипция", level=1)
    title_para.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # Метаданные
    meta_parts = []
    if transcription.language:
        meta_parts.append(f"Язык: {transcription.language.upper()}")
    if transcription.duration_sec:
        meta_parts.append(f"Длительность: {_format_time_short(transcription.duration_sec)}")
    if transcription.created_at:
        meta_parts.append(f"Дата: {transcription.created_at.strftime('%d.%m.%Y')}")

    if meta_parts:
        meta_para = doc.add_paragraph(" | ".join(meta_parts))
        meta_para.style.font.size = Pt(9)
        meta_para.style.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

    doc.add_paragraph("")  # Отступ

    # Сегменты с таймкодами и спикерами
    segments = transcription.segments or []
    if segments:
        for seg in segments:
            para = doc.add_paragraph()
            start = seg.get("start", 0)
            speaker = seg.get("speaker", "")
            text = seg.get("text", "")

            # Таймкод
            time_run = para.add_run(f"[{_format_time_short(start)}] ")
            time_run.font.size = Pt(8)
            time_run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

            # Спикер
            if speaker:
                speaker_run = para.add_run(f"{speaker}: ")
                speaker_run.bold = True
                speaker_run.font.size = Pt(10)
                speaker_run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

            # Текст
            text_run = para.add_run(text)
            text_run.font.size = Pt(10)
    elif transcription.full_text:
        doc.add_paragraph(transcription.full_text)

    # Сохранение в bytes
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.read()
