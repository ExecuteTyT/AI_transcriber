"""Инлайн-клавиатуры бота."""
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.services.plans import WALLET_PACKS


def after_transcription(tid: str) -> InlineKeyboardMarkup:
    """Кнопки действий после готовой расшифровки."""
    b = InlineKeyboardBuilder()
    b.button(text="📝 Саммари", callback_data=f"an:summary:{tid}")
    b.button(text="📌 Тезисы", callback_data=f"an:key-points:{tid}")
    b.button(text="✅ Задачи", callback_data=f"an:action-items:{tid}")
    b.button(text="💬 Чат по записи", callback_data=f"chat:{tid}")
    b.adjust(3, 1)
    return b.as_markup()


def paywall(kind: str) -> InlineKeyboardMarkup:
    """Кнопки пейволла: пополнить кошелёк / оформить Pro."""
    b = InlineKeyboardBuilder()
    b.button(text="🪙 Пополнить кошелёк", callback_data="pay:wallet")
    b.button(text="⭐ Оформить Pro", callback_data="pay:pro")
    b.adjust(1)
    return b.as_markup()


def wallet_packs() -> InlineKeyboardMarkup:
    """Пресет-пакеты кошелька + ссылка на сайт для произвольной суммы."""
    b = InlineKeyboardBuilder()
    for code, cfg in WALLET_PACKS.items():
        b.button(
            text=f"{cfg['minutes']} мин — {cfg['price_rub']} ₽",
            callback_data=f"topup:{code}",
        )
    b.button(text="✏️ Другое количество (на сайте)", url="https://dicto.pro/subscription")
    b.adjust(1)
    return b.as_markup()


def url_button(text: str, url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=text, url=url)]])


def chat_exit() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="⬅️ Выйти из чата", callback_data="chat_exit")]]
    )
