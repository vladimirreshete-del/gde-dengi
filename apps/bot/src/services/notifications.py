from __future__ import annotations

import asyncio
import datetime as dt
from zoneinfo import ZoneInfo
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Expense, User
from .finance import compute_daily_limit, format_money, get_salary_period


async def notify_premium_users(bot, session: AsyncSession, tz_name: str, notify_hour: int) -> None:
    tz = ZoneInfo(tz_name)
    now = dt.datetime.now(tz)
    today = now.date()

    users = (await session.execute(select(User).where(User.is_premium.is_(True)))).scalars().all()
    for user in users:
        if user.last_notified_at == today:
            continue
        period = get_salary_period(today, user.salary_day, user.salary_date)
        if period.days_left <= 0:
            days_left = 1
        else:
            days_left = period.days_left
        expenses_sum = await session.scalar(
            select(func.coalesce(func.sum(Expense.amount_cents), 0)).where(
                Expense.user_id == user.id,
                Expense.created_at >= period.start,
            )
        )
        balance = max(user.income_cents - expenses_sum, 0)
        daily_limit = compute_daily_limit(balance, days_left)
        try:
            await bot.send_message(
                user.telegram_id,
                f"Ежедневный лимит: {format_money(daily_limit)}. Осталось {format_money(balance)} до зарплаты.",
            )
            user.last_notified_at = today
        except Exception:
            continue


async def notification_loop(bot, session_factory, tz_name: str, notify_hour: int) -> None:
    tz = ZoneInfo(tz_name)
    while True:
        now = dt.datetime.now(tz)
        target = now.replace(hour=notify_hour, minute=0, second=0, microsecond=0)
        if target <= now:
            target = target + dt.timedelta(days=1)
        await asyncio.sleep((target - now).total_seconds())
        async with session_factory() as session:
            await notify_premium_users(bot, session, tz_name, notify_hour)
            await session.commit()
