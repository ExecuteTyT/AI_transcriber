"""Callback-кнопки: AI-разбор, вход/выход чата, оплата."""
import logging

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

from app.bot import keyboards, texts
from app.bot.client import DictoClient
from app.bot.handlers.chat import ChatStates
from app.bot.handlers.common import detail_of, paywall_text, send_long

logger = logging.getLogger(__name__)
router = Router()

_ANALYSIS_TITLES = {"summary": "📝 Саммари", "key-points": "📌 Тезисы", "action-items": "✅ Задачи"}


@router.callback_query(F.data.startswith("an:"))
async def on_analysis(call: CallbackQuery, client: DictoClient) -> None:
    _, kind, tid = call.data.split(":", 2)
    await call.answer(_ANALYSIS_TITLES.get(kind, "Готовлю…"))
    note = await call.message.answer(f"{_ANALYSIS_TITLES.get(kind, '')} — готовлю…")
    resp = await client.get_analysis(call.from_user.id, tid, kind)
    if resp.status_code == 402:
        await note.delete()
        await call.message.answer(paywall_text(detail_of(resp)), reply_markup=keyboards.paywall("analysis"))
        return
    if resp.status_code != 200:
        await note.edit_text("Не удалось сделать разбор, попробуйте позже.")
        return
    content = (resp.json().get("content") or "").strip() or "—"
    await note.delete()
    await send_long(call.message, f"<b>{_ANALYSIS_TITLES.get(kind, '')}</b>\n\n{content}")


@router.callback_query(F.data.startswith("chat:"))
async def on_chat_enter(call: CallbackQuery, state: FSMContext) -> None:
    tid = call.data.split(":", 1)[1]
    await state.set_state(ChatStates.active)
    await state.update_data(tid=tid)
    await call.answer()
    await call.message.answer(texts.CHAT_ENTER, reply_markup=keyboards.chat_exit())


@router.callback_query(F.data == "chat_exit")
async def on_chat_exit(call: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await call.answer()
    await call.message.answer(texts.CHAT_EXIT)


@router.callback_query(F.data == "pay:wallet")
async def on_pay_wallet(call: CallbackQuery) -> None:
    await call.answer()
    await call.message.answer(texts.PAY_PROMPT, reply_markup=keyboards.wallet_packs())


@router.callback_query(F.data == "pay:pro")
async def on_pay_pro(call: CallbackQuery, client: DictoClient) -> None:
    await call.answer()
    resp = await client.subscribe(call.from_user.id, "pro")
    if resp.status_code != 200:
        await call.message.answer("Не удалось создать платёж, попробуйте позже.")
        return
    url = resp.json().get("confirmation_url")
    await call.message.answer(texts.PAY_REDIRECT, reply_markup=keyboards.url_button("⭐ Оплатить Pro", url))


@router.callback_query(F.data.startswith("topup:"))
async def on_topup(call: CallbackQuery, client: DictoClient) -> None:
    pack = call.data.split(":", 1)[1]
    await call.answer()
    resp = await client.topup(call.from_user.id, pack)
    if resp.status_code != 200:
        await call.message.answer("Не удалось создать платёж, попробуйте позже.")
        return
    url = resp.json().get("confirmation_url")
    await call.message.answer(texts.PAY_REDIRECT, reply_markup=keyboards.url_button("🪙 Оплатить пополнение", url))
