from __future__ import annotations

import datetime as dt
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import PromoActivation, PromoCode
from ..services.users import get_or_create_user

router = Router()


@router.message(Command('promo'))
async def promo(message: Message, session: AsyncSession) -> None:
    command = message.text or ''
    parts = command.split(maxsplit=1)
    if len(parts) < 2:
        await message.answer("Введи промокод: /promo CODE")
        return
    code_text = parts[1].strip().upper()

    promo = await session.scalar(select(PromoCode).where(PromoCode.code == code_text))
    if not promo or promo.uses >= promo.max_uses:
        await message.answer("Промокод недействителен.")
        return

    user = await get_or_create_user(session, message.from_user.id)
    existing = await session.scalar(
        select(PromoActivation).where(PromoActivation.user_id == user.id, PromoActivation.promo_id == promo.id)
    )
    if existing:
        await message.answer("Промокод уже активирован.")
        return

    promo.uses += 1
    session.add(PromoActivation(user_id=user.id, promo_id=promo.id))

    today = dt.date.today()
    premium_until = user.premium_until or today
    if premium_until < today:
        premium_until = today
    user.premium_until = premium_until + dt.timedelta(days=promo.premium_days)
    user.is_premium = True

    await message.answer("Premium активирован!\nТеперь доступны цели, уведомления и безлимит расходов.")
