from __future__ import annotations

from aiogram import Bot, Dispatcher
from aiogram.client.session.aiohttp import AiohttpSession

from .config import get_settings
from .middlewares.db_session import DbSessionMiddleware
from .middlewares.rate_limit import RateLimitMiddleware
from .middlewares.retry import RetryMiddleware
from .routers import admin, analytics, expenses, goals, promo, start, status


def create_bot() -> Bot:
    settings = get_settings()
    session = AiohttpSession()
    return Bot(token=settings.bot_token, session=session)


def create_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.update.middleware(DbSessionMiddleware())
    dp.update.middleware(RateLimitMiddleware())
    dp.update.middleware(RetryMiddleware())

    dp.include_router(start.router)
    dp.include_router(status.router)
    dp.include_router(expenses.router)
    dp.include_router(analytics.router)
    dp.include_router(goals.router)
    dp.include_router(promo.router)
    dp.include_router(admin.router)

    return dp
