"""Приём медиа (аудио/голос/видео/документ) → расшифровка → текст + кнопки."""
import asyncio
import logging
import os
import tempfile

from aiogram import Bot, F, Router
from aiogram.types import FSInputFile, Message

from app.bot import keyboards, texts
from app.bot.client import DictoClient
from app.bot.handlers.common import detail_of, send_long, send_paywall

logger = logging.getLogger(__name__)
router = Router()

POLL_INTERVAL_SEC = 4
POLL_MAX_TRIES = 600  # ~40 мин на очень длинные файлы


def _pick_media(message: Message):
    """(media_obj, filename) для поддерживаемых типов, иначе (None, None)."""
    if message.voice:
        return message.voice, "voice.ogg"
    if message.audio:
        return message.audio, (message.audio.file_name or "audio.mp3")
    if message.video:
        return message.video, (message.video.file_name or "video.mp4")
    if message.video_note:
        return message.video_note, "video_note.mp4"
    if message.document:
        return message.document, (message.document.file_name or "file.bin")
    return None, None


@router.message(F.voice | F.audio | F.video | F.video_note | F.document)
async def handle_media(message: Message, bot: Bot, client: DictoClient) -> None:
    media, filename = _pick_media(message)
    if media is None:
        await message.answer(texts.UNSUPPORTED)
        return

    tg_id = message.from_user.id
    status_msg = await message.answer(texts.DOWNLOADING)

    tmp_path = None
    try:
        # Скачиваем во временный файл (на локальном Bot API server — чтение с общего тома).
        fd, tmp_path = tempfile.mkstemp(suffix="_" + os.path.basename(filename))
        os.close(fd)
        await bot.download(media, destination=tmp_path)

        resp = await client.upload_file(tg_id, filename, tmp_path)
        if resp.status_code == 402:
            await status_msg.delete()
            await send_paywall(message, detail_of(resp))
            return
        if resp.status_code not in (200, 201):
            await status_msg.edit_text(texts.FAILED.format(error=f"код {resp.status_code}"))
            return
        tid = resp.json()["id"]
    except Exception as e:
        logger.exception("upload failed: %s", e)
        await status_msg.edit_text(texts.FAILED.format(error="ошибка загрузки"))
        return
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    await status_msg.edit_text(texts.PROCESSING)

    # Поллинг статуса.
    for _ in range(POLL_MAX_TRIES):
        await asyncio.sleep(POLL_INTERVAL_SEC)
        st = await client.get_status(tg_id, tid)
        if st.status_code != 200:
            continue
        body = st.json()
        state = body.get("status")
        if state == "completed":
            break
        if state == "failed":
            await status_msg.edit_text(texts.FAILED.format(error=body.get("error_message") or "неизвестно"))
            return
    else:
        await status_msg.edit_text("⏳ Обработка затянулась — загляните позже через /balance или на сайт.")
        return

    tr = await client.get_transcription(tg_id, tid)
    if tr.status_code != 200:
        await status_msg.edit_text(texts.FAILED.format(error="не удалось получить текст"))
        return
    full_text = (tr.json().get("full_text") or "").strip() or "(пустая расшифровка)"
    await status_msg.delete()
    await send_long(message, full_text, reply_markup=keyboards.after_transcription(tid))
