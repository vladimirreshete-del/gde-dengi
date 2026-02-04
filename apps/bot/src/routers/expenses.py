from __future__ import annotations

import datetime as dt
from aiogram import F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Expense
from ..services.finance import format_money, get_salary_period
from ..services.parsing import parse_expense
from ..services.status import build_status_message
from ..services.users import get_or_create_user

router = Router()
PAGE_SIZE = 5


def _build_keyboard(page: int, has_next: bool, expense_ids: list[int]) -> InlineKeyboardMarkup:
    buttons = []
    for expense_id in expense_ids:
        buttons.append([InlineKeyboardButton(text=f"Удалить #{expense_id}", callback_data=f"del:{expense_id}:{page}")])
    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton(text="Назад", callback_data=f"page:{page - 1}"))
    if has_next:
        nav.append(InlineKeyboardButton(text="Вперед", callback_data=f"page:{page + 1}"))
    if nav:
        buttons.append(nav)
    return InlineKeyboardMarkup(inline_keyboard=buttons)


async def _render_expenses(session: AsyncSession, user_id: int, page: int) -> tuple[str, InlineKeyboardMarkup]:
    total = await session.scalar(select(func.count(Expense.id)).where(Expense.user_id == user_id))
    result = await session.execute(
        select(Expense).where(Expense.user_id == user_id).order_by(Expense.created_at.desc()).limit(PAGE_SIZE).offset(page * PAGE_SIZE)
    )
    expenses = result.scalars().all()
    if not expenses:
        return "Расходов пока нет.", InlineKeyboardMarkup(inline_keyboard=[])
    lines = ["История расходов:"]
    for expense in expenses:
        lines.append(
            f"#{expense.id} • {expense.created_at:%d.%m} • {format_money(expense.amount_cents)} • {expense.category}"
        )
    has_next = (page + 1) * PAGE_SIZE < (total or 0)
    keyboard = _build_keyboard(page, has_next, [exp.id for exp in expenses])
    return "\n".join(lines), keyboard


@router.message(Command('expenses'))
async def expenses(message: Message, session: AsyncSession) -> None:
    user = await get_or_create_user(session, message.from_user.id)
    text, keyboard = await _render_expenses(session, user.id, 0)
    await message.answer(text, reply_markup=keyboard)


@router.callback_query(F.data.startswith('page:'))
async def paginate_expenses(query: CallbackQuery, session: AsyncSession) -> None:
    page = int(query.data.split(':')[1])
    user = await get_or_create_user(session, query.from_user.id)
    text, keyboard = await _render_expenses(session, user.id, page)
    await query.message.edit_text(text, reply_markup=keyboard)
    await query.answer()


@router.callback_query(F.data.startswith('del:'))
async def delete_expense(query: CallbackQuery, session: AsyncSession) -> None:
    _, expense_id, page = query.data.split(':')
    user = await get_or_create_user(session, query.from_user.id)
    await session.execute(
        delete(Expense).where(Expense.id == int(expense_id), Expense.user_id == user.id)
    )
    text, keyboard = await _render_expenses(session, user.id, int(page))
    await query.message.edit_text(text, reply_markup=keyboard)
    await query.answer("Удалено")


@router.message(F.text.regexp(r'^(\+?\d+)'))
async def add_expense(message: Message, session: AsyncSession) -> None:
    user = await get_or_create_user(session, message.from_user.id)
    if not user.income_cents or not (user.salary_day or user.salary_date):
        await message.answer("Сначала настрой профиль через /start")
        return

    today = dt.date.today()
    period = get_salary_period(today, user.salary_day, user.salary_date)
    expenses_count = await session.scalar(
        select(func.count(Expense.id)).where(
            Expense.user_id == user.id,
            Expense.created_at >= period.start,
        )
    )
    if not user.is_premium and expenses_count >= 30:
        await message.answer("Лимит 30 расходов до зарплаты. Подключи Premium для безлимита.")
        return

    try:
        amount_cents, category = parse_expense(message.text or '')
    except ValueError as exc:
        await message.answer(str(exc))
        return

    expense = Expense(user_id=user.id, amount_cents=amount_cents, category=category)
    session.add(expense)
    await message.answer("Расход учтен. " + await build_status_message(session, user))
