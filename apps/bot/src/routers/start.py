from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from ..services.parsing import parse_salary_input
from ..services.status import build_status_message
from ..services.users import get_or_create_user

router = Router()


class Onboarding(StatesGroup):
    income = State()
    salary = State()


@router.message(CommandStart())
async def start(message: Message, state: FSMContext, session: AsyncSession) -> None:
    user = await get_or_create_user(session, message.from_user.id)
    if user.income_cents and (user.salary_day or user.salary_date):
        await message.answer(await build_status_message(session, user))
        return
    await message.answer(
        "Привет! Я помогу рассчитать лимит трат до зарплаты.\n"
        "Сначала укажи свой доход за месяц (в рублях)."
    )
    await state.set_state(Onboarding.income)


@router.message(Onboarding.income, F.text)
async def set_income(message: Message, state: FSMContext, session: AsyncSession) -> None:
    if not message.text or not message.text.isdigit():
        await message.answer("Укажи сумму в рублях, например 85000")
        return
    income_cents = int(message.text) * 100
    user = await get_or_create_user(session, message.from_user.id)
    user.income_cents = income_cents
    await message.answer(
        "Когда приходит зарплата? Введи число месяца (1-31) или дату (YYYY-MM-DD / DD.MM.YYYY)."
    )
    await state.set_state(Onboarding.salary)


@router.message(Onboarding.salary, F.text)
async def set_salary_day(message: Message, state: FSMContext, session: AsyncSession) -> None:
    try:
        salary_day, salary_date = parse_salary_input(message.text or '')
    except ValueError as exc:
        await message.answer(str(exc))
        return
    user = await get_or_create_user(session, message.from_user.id)
    user.salary_day = salary_day
    user.salary_date = salary_date
    await state.clear()
    await message.answer("Готово! " + await build_status_message(session, user))
