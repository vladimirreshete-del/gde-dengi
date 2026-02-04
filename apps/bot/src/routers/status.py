from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from ..services.status import build_status_message
from ..services.users import get_or_create_user

router = Router()


@router.message(Command('status'))
async def status(message: Message, session: AsyncSession) -> None:
    user = await get_or_create_user(session, message.from_user.id)
    if not user.income_cents or not (user.salary_day or user.salary_date):
        await message.answer("Нужно заполнить профиль. Используй /start")
        return
    await message.answer(await build_status_message(session, user))
