"""Точка входа Telegram-бота Dicto (aiogram 3.x, long-polling).

Запуск: `python -m app.bot.main`. Отдельный контейнер на образе backend.
Использует self-hosted Bot API server (TELEGRAM_BOT_API_URL, is_local=True) —
снимает лимит загрузки файлов 20МБ. Если TELEGRAM_BOT_TOKEN пуст — тихо
выходит (не падает), чтобы сервис в compose не крэшил окружение без бота.
"""
import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from app.bot.client import DictoClient
from app.bot.handlers import setup_routers
from app.config import settings

logging.basicConfig(level=logging.INFO, stream=sys.stdout,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("dicto.bot")


async def run() -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN не задан — бот не запускается (ок для окружения без бота).")
        return

    # Self-hosted Bot API server (--local) → большие файлы. Если URL пуст,
    # aiogram использует облачный api.telegram.org (лимит 20МБ).
    session = None
    if settings.TELEGRAM_BOT_API_URL:
        session = AiohttpSession(
            api=TelegramAPIServer.from_base(settings.TELEGRAM_BOT_API_URL, is_local=True)
        )

    bot = Bot(
        token=settings.TELEGRAM_BOT_TOKEN,
        session=session,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    client = DictoClient(settings.INTERNAL_API_URL, settings.BOT_INTERNAL_SECRET)
    dp = Dispatcher(storage=MemoryStorage())
    setup_routers(dp)

    # Сбрасываем возможный вебхук и накопленные апдейты, затем поллинг.
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("Dicto bot started (polling, api=%s)", settings.TELEGRAM_BOT_API_URL or "cloud")
    try:
        await dp.start_polling(bot, client=client)
    finally:
        await client.aclose()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except (KeyboardInterrupt, SystemExit):
        pass
