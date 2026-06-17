"""Текст-ссылка на запись (YouTube/VK/Rutube/Дзен) → расшифровка."""
import asyncio
import logging

from aiogram import F, Router
from aiogram.types import Message

from app.bot import texts
from app.bot.client import DictoClient
from app.bot.handlers.common import detail_of, present_transcription, send_paywall
from app.bot.handlers.media import POLL_INTERVAL_SEC, POLL_MAX_TRIES

logger = logging.getLogger(__name__)
router = Router()

_URL_HINT = ("http://", "https://")


@router.message(F.text.func(lambda t: t and any(t.strip().startswith(p) for p in _URL_HINT)))
async def handle_url(message: Message, client: DictoClient) -> None:
    tg_id = message.from_user.id
    url = message.text.strip().split()[0]
    status_msg = await message.answer(texts.PROCESSING)

    resp = await client.upload_url(tg_id, url)
    if resp.status_code == 402:
        await status_msg.delete()
        await send_paywall(message, detail_of(resp))
        return
    if resp.status_code not in (200, 201):
        detail = detail_of(resp)
        msg = detail if isinstance(detail, str) else "не удалось принять ссылку (поддерживаются YouTube/VK/Rutube/Дзен)"
        await status_msg.edit_text(texts.FAILED.format(error=msg))
        return
    tid = resp.json()["id"]

    for _ in range(POLL_MAX_TRIES):
        await asyncio.sleep(POLL_INTERVAL_SEC)
        st = await client.get_status(tg_id, tid)
        if st.status_code != 200:
            continue
        body = st.json()
        if body.get("status") == "completed":
            break
        if body.get("status") == "failed":
            await status_msg.edit_text(texts.FAILED.format(error=body.get("error_message") or "неизвестно"))
            return
    else:
        await status_msg.edit_text("⏳ Обработка затянулась — загляните позже через /balance.")
        return

    tr = await client.get_transcription(tg_id, tid)
    if tr.status_code != 200:
        await status_msg.edit_text(texts.FAILED.format(error="не удалось получить текст"))
        return
    await present_transcription(message, status_msg, tr.json(), tid)
