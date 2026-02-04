from __future__ import annotations

import datetime as dt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Expense, User
from .finance import compute_daily_limit, format_money, get_salary_period


async def build_status_message(session: AsyncSession, user: User) -> str:
    today = dt.date.today()
    period = get_salary_period(today, user.salary_day, user.salary_date)
    total_expenses = await session.scalar(
        select(func.coalesce(func.sum(Expense.amount_cents), 0)).where(
            Expense.user_id == user.id,
            Expense.created_at >= period.start,
        )
    )
    balance = max(user.income_cents - total_expenses, 0)
    days_left = max((period.next_salary - today).days, 1)
    daily_limit = compute_daily_limit(balance, days_left)
    return (
        "Статус до зарплаты:\n"
        f"• До зарплаты: {days_left} дн.\n"
        f"• Осталось: {format_money(balance)}\n"
        f"• Можно тратить в день: {format_money(daily_limit)}"
    )
