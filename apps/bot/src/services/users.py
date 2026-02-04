from __future__ import annotations

import datetime as dt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User


async def get_user_by_telegram(session: AsyncSession, telegram_id: int) -> User | None:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    return result.scalars().first()


async def get_or_create_user(session: AsyncSession, telegram_id: int) -> User:
    user = await get_user_by_telegram(session, telegram_id)
    if user:
        if user.premium_until and user.premium_until < dt.date.today():
            user.is_premium = False
        return user
    user = User(telegram_id=telegram_id)
    session.add(user)
    await session.flush()
    return user
