from __future__ import annotations

import datetime as dt
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Expense
from ..services.finance import format_money, get_salary_period
from ..services.users import get_or_create_user

router = Router()


@router.message(Command('analytics'))
async def analytics(message: Message, session: AsyncSession) -> None:
    user = await get_or_create_user(session, message.from_user.id)
    if not user.income_cents or not (user.salary_day or user.salary_date):
        await message.answer("Сначала настрой профиль через /start")
        return
    today = dt.date.today()
    period = get_salary_period(today, user.salary_day, user.salary_date)

    categories = await session.execute(
        select(Expense.category, func.sum(Expense.amount_cents))
        .where(Expense.user_id == user.id, Expense.created_at >= period.start)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount_cents).desc())
        .limit(5)
    )
    category_rows = categories.all()

    day_result = await session.execute(
        select(func.date(Expense.created_at), func.sum(Expense.amount_cents))
        .where(Expense.user_id == user.id, Expense.created_at >= period.start)
        .group_by(func.date(Expense.created_at))
        .order_by(func.sum(Expense.amount_cents).desc())
        .limit(1)
    )
    day_row = day_result.first()

    lines = ["Аналитика по тратам:"]
    if category_rows:
        lines.append("Топ-5 категорий:")
        for category, total in category_rows:
            lines.append(f"• {category}: {format_money(total)}")
    else:
        lines.append("Пока нет расходов для анализа.")

    if day_row:
        day, total = day_row
        if isinstance(day, dt.datetime):
            day = day.date()
        lines.append(f"Самый дорогой день: {day:%d.%m} ({format_money(total)})")

    await message.answer("\n".join(lines))
