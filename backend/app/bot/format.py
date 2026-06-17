"""Форматирование для Telegram (parse_mode=HTML).

Два назначения:
1. md_to_html — конвертирует Markdown от AI-разбора (## , **bold**, списки,
   чекбоксы) в Telegram-HTML. Без этого в чат течёт сырой markdown.
2. format_transcript — превращает сегменты/полный текст расшифровки в читаемый
   вид (группировка по спикерам, абзацы) вместо «стены текста».
"""
import re


def esc(text: str) -> str:
    """Экранирование под Telegram HTML (& < > обязательны)."""
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _inline(s: str) -> str:
    """Инлайн-разметка внутри строки (текст уже экранирован)."""
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)   # **bold**
    s = re.sub(r"__(.+?)__", r"<b>\1</b>", s)        # __bold__
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)    # `code`
    s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)         # *italic* (после **)
    return s


def md_to_html(md: str) -> str:
    """Markdown → Telegram-HTML. Поддержка: заголовки, жирный/курсив/код,
    маркированные списки, чекбоксы, нумерованные списки. Всё остальное —
    как текст (экранировано)."""
    text = esc(md or "")
    out: list[str] = []
    for raw in text.split("\n"):
        line = raw.rstrip()
        # Заголовки # .. ###### → жирная строка.
        m = re.match(r"^\s{0,3}#{1,6}\s+(.*)$", line)
        if m:
            out.append(f"<b>{_inline(m.group(1).strip())}</b>")
            continue
        # Чекбоксы списка задач.
        m = re.match(r"^\s*[-*]\s+\[([ xX])\]\s+(.*)$", line)
        if m:
            box = "☑" if m.group(1).lower() == "x" else "☐"
            out.append(f"{box} {_inline(m.group(2))}")
            continue
        # Маркированный список.
        m = re.match(r"^\s*[-*]\s+(.*)$", line)
        if m:
            out.append(f"• {_inline(m.group(1))}")
            continue
        # Нумерованный список — сохраняем номер.
        m = re.match(r"^\s*(\d+)\.\s+(.*)$", line)
        if m:
            out.append(f"{m.group(1)}. {_inline(m.group(2))}")
            continue
        out.append(_inline(line))
    return "\n".join(out).strip()


def _paragraphize(text: str, per: int = 3) -> str:
    """Бьём сплошной текст на абзацы по ~3 предложения (если нет своей структуры)."""
    text = text.strip()
    if "\n" in text:
        return text
    sentences = re.split(r"(?<=[.!?…])\s+", text)
    sentences = [s for s in sentences if s]
    if len(sentences) <= per:
        return text
    paras = [" ".join(sentences[i:i + per]) for i in range(0, len(sentences), per)]
    return "\n\n".join(paras)


def format_transcript(segments: list | None, full_text: str | None) -> str:
    """Читаемый HTML-текст расшифровки.

    Если есть сегменты со спикерами — группируем подряд идущие реплики одного
    спикера, помечаем «Спикер N». Иначе — абзацы из full_text. Таймстемпы в
    чат не выводим (они в SRT/DOCX-экспорте).
    """
    if segments:
        label_map: dict[str, str] = {}

        def label(spk):
            if not spk:
                return None
            if spk not in label_map:
                label_map[spk] = f"Спикер {len(label_map) + 1}"
            return label_map[spk]

        groups: list[dict] = []
        for seg in segments:
            txt = (seg.get("text") or "").strip()
            if not txt:
                continue
            lbl = label(seg.get("speaker"))
            if groups and groups[-1]["label"] == lbl:
                groups[-1]["text"] += " " + txt
            else:
                groups.append({"label": lbl, "text": txt})

        has_speakers = any(g["label"] for g in groups)
        parts = []
        for g in groups:
            if has_speakers and g["label"]:
                parts.append(f"<b>{esc(g['label'])}</b>\n{esc(g['text'])}")
            else:
                parts.append(esc(g["text"]))
        if parts:
            return "\n\n".join(parts)

    return esc(_paragraphize(full_text or "")) or "(пустая расшифровка)"
