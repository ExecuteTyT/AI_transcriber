"""FSM-режим вопросов по записи (RAG-чат)."""
import logging

from aiogram import Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

from app.bot import keyboards, texts
from app.bot.client import DictoClient
from app.bot.handlers.common import detail_of, paywall_text

logger = logging.getLogger(__name__)
router = Router()


class ChatStates(StatesGroup):
    active = State()


@router.message(ChatStates.active)
async def chat_question(message: Message, state: FSMContext, client: DictoClient) -> None:
    if not message.text:
        await message.answer("В режиме вопросов пришлите текст. «Выйти» — завершить.",
                             reply_markup=keyboards.chat_exit())
        return
    data = await state.get_data()
    tid = data.get("tid")
    if not tid:
        await state.clear()
        await message.answer(texts.NO_TRANSCRIPTION)
        return

    thinking = await message.answer(texts.CHAT_THINKING)
    resp = await client.chat(message.from_user.id, tid, message.text.strip())
    if resp.status_code == 402:
        await thinking.delete()
        await message.answer(paywall_text(detail_of(resp)), reply_markup=keyboards.paywall("chat"))
        await state.clear()
        return
    if resp.status_code != 200:
        await thinking.edit_text("Не удалось ответить, попробуйте ещё раз.")
        return
    body = resp.json()
    answer = body.get("content") or body.get("answer") or body.get("message") or "—"
    await thinking.edit_text(answer, reply_markup=keyboards.chat_exit())
