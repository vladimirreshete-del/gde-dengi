from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import PromoCode

router = Router()
settings = get_settings()


def _is_admin(user_id: int) -> bool:
    return user_id in settings.admin_ids


@router.message(Command('admin_add_promo'))
async def admin_add_promo(message: Message, session: AsyncSession) -> None:
    if not _is_admin(message.from_user.id):
        return
    parts = (message.text or '').split(maxsplit=3)
    if len(parts) < 4:
        await message.answer("Формат: /admin_add_promo CODE DAYS MAX_USES")
        return
    code = parts[1].upper()
    days = int(parts[2])
    max_uses = int(parts[3])

    existing = await session.scalar(select(PromoCode).where(PromoCode.code == code))
    if existing:
        await message.answer("Промокод уже существует.")
        return

    promo = PromoCode(code=code, premium_days=days, max_uses=max_uses)
    session.add(promo)
    await message.answer("Промокод создан.")


@router.message(Command('admin_list_promos'))
async def admin_list_promos(message: Message, session: AsyncSession) -> None:
    if not _is_admin(message.from_user.id):
        return
    promos = (await session.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))).scalars().all()
    if not promos:
        await message.answer("Промокодов нет.")
        return
    lines = ["Промокоды:"]
    for promo in promos:
        lines.append(f"{promo.code} • {promo.uses}/{promo.max_uses} • {promo.premium_days} дн.")
    await message.answer("\n".join(lines))
