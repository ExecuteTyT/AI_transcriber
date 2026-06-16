"""Сборка роутеров бота. Порядок важен: chat (state-filtered) до url/media."""
from aiogram import Dispatcher

from app.bot.handlers import actions, chat, media, start, url


def setup_routers(dp: Dispatcher) -> None:
    dp.include_router(start.router)
    dp.include_router(chat.router)      # перехватывает текст в режиме вопросов
    dp.include_router(actions.router)   # callbacks: разбор / оплата / выход из чата
    dp.include_router(media.router)     # аудио/голос/видео/документ
    dp.include_router(url.router)       # текст-ссылка
