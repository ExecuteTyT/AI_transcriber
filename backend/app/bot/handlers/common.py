"""Общие хелперы хендлеров: пейволл, отправка длинного текста, карточка результата."""
import httpx
from aiogram.types import Message

from app.bot import keyboards, texts
from app.bot.format import esc, format_transcript

TG_TEXT_LIMIT = 4000  # с запасом под 4096

_LANG = {
    "ru": "Русский", "en": "English", "uk": "Українська", "de": "Deutsch",
    "fr": "Français", "es": "Español", "it": "Italiano", "kk": "Қазақша",
    "zh": "中文", "tr": "Türkçe", "auto": "авто",
}


def _lang_label(code: str | None) -> str:
    if not code:
        return "авто"
    return _LANG.get(code, code)


def paywall_text(detail: dict | str | None) -> str:
    """Текст пейволла из структурированного detail 402-ответа."""
    if isinstance(detail, dict):
        reason = detail.get("reason")
        if reason == "file_exceeds_balance":
            return texts.PAYWALL_FILE_TOO_LONG.format(
                file_minutes=detail.get("file_minutes", "?"),
                available_minutes=detail.get("available_minutes", 0),
            )
        if reason in ("analysis_locked", "chat_locked"):
            return texts.PAYWALL_ANALYSIS if reason == "analysis_locked" else texts.PAYWALL_CHAT
        if detail.get("message"):
            return str(detail["message"])
    return texts.PAYWALL_NO_MINUTES


def detail_of(resp: httpx.Response) -> dict | str | None:
    try:
        return resp.json().get("detail")
    except Exception:
        return None


async def send_paywall(message: Message, detail: dict | str | None) -> None:
    await message.answer(paywall_text(detail), reply_markup=keyboards.paywall("generic"))


async def send_long(message: Message, text: str, **kwargs) -> None:
    """Отправка текста кусками по лимиту Telegram. Клавиатура — на последнем куске."""
    if len(text) <= TG_TEXT_LIMIT:
        await message.answer(text, **kwargs)
        return
    chunks = [text[i:i + TG_TEXT_LIMIT] for i in range(0, len(text), TG_TEXT_LIMIT)]
    for chunk in chunks[:-1]:
        await message.answer(chunk)
    await message.answer(chunks[-1], **kwargs)


async def present_transcription(message: Message, status_msg: Message, data: dict, tid: str) -> None:
    """Карточка готовности + читаемый текст + клавиатура действий/экспорта."""
    title = data.get("title") or data.get("original_filename") or "Расшифровка"
    dur = data.get("duration_sec") or 0
    minutes = max(1, round(dur / 60)) if dur else "—"
    body = format_transcript(data.get("segments"), data.get("full_text"))
    header = texts.TRANSCRIPT_HEADER.format(
        title=esc(str(title)), minutes=minutes, language=_lang_label(data.get("language"))
    )
    await status_msg.delete()
    await message.answer(header)
    await send_long(message, body, reply_markup=keyboards.after_transcription(tid))
