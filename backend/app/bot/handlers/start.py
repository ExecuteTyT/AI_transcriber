"""/start (с deep-link кодом привязки) и /help."""
import logging

from aiogram import Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import Message

from app.bot import texts
from app.bot.client import DictoClient

logger = logging.getLogger(__name__)
router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject, client: DictoClient) -> None:
    """Привязка по коду из deep-link (t.me/<bot>?start=<code>) либо авто-аккаунт."""
    link_code = (command.args or "").strip() or None
    tg = message.from_user
    name = (tg.full_name if tg else "") or ""
    try:
        data = await client.auth(tg.id, name=name, link_code=link_code)
    except Exception as e:
        logger.exception("start auth failed: %s", e)
        await message.answer("Сервис временно недоступен, попробуйте через минуту.")
        return

    await message.answer(texts.WELCOME, disable_web_page_preview=True)
    if data.get("linked"):
        await message.answer(texts.LINKED)


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(texts.HELP, disable_web_page_preview=True)


@router.message(Command("balance"))
async def cmd_balance(message: Message, client: DictoClient) -> None:
    tg = message.from_user
    resp = await client.get_me(tg.id)
    if resp.status_code != 200:
        await message.answer("Не удалось получить баланс, попробуйте позже.")
        return
    u = resp.json()
    bonus = u.get("bonus_minutes", 0)
    monthly = max(0, u.get("minutes_limit", 0) - u.get("minutes_used", 0))
    wallet = u.get("wallet_minutes", 0)
    total = bonus + monthly + wallet
    await message.answer(
        f"💼 <b>Остаток: {total} мин</b>\n"
        f"• Бонус: {bonus}\n• По тарифу: {monthly}\n• Кошелёк: {wallet}\n\n"
        f"Тариф: <b>{u.get('plan', 'free')}</b>"
    )
