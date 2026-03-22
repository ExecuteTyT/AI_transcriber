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
