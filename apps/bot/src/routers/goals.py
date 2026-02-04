from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Goal
from ..services.finance import format_money
from ..services.users import get_or_create_user

router = Router()


@router.message(Command('goals'))
async def goals(message: Message, session: AsyncSession) -> None:
    user = await get_or_create_user(session, message.from_user.id)
    if not user.is_premium:
        await message.answer("Цели доступны только в Premium. Используй /promo для активации.")
        return

    command = message.text or ''
    parts = command.split(maxsplit=3)
    if len(parts) >= 4 and parts[1] == 'add' and parts[2].isdigit():
        amount_text = parts[2]
        title = parts[3]
        goal = Goal(user_id=user.id, title=title.strip(), target_cents=int(amount_text) * 100)
        session.add(goal)
        await message.answer("Цель добавлена!")
        return

    goals_list = await session.execute(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at.desc()))
    goals_rows = goals_list.scalars().all()
    if not goals_rows:
        await message.answer("Пока нет целей. Добавь: /goals add 50000 Отпуск")
        return

    lines = ["Твои цели:"]
    for goal in goals_rows:
        lines.append(f"• {goal.title}: {format_money(goal.current_cents)} / {format_money(goal.target_cents)}")
    await message.answer("\n".join(lines))
