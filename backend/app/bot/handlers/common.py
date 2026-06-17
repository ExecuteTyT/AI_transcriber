"""Общие хелперы хендлеров: пейволл, безопасная отправка длинного текста."""
import httpx
from aiogram.types import Message

from app.bot import keyboards, texts

TG_TEXT_LIMIT = 4000  # с запасом под 4096


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
