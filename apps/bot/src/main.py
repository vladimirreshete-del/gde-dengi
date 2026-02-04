from __future__ import annotations

import asyncio
import logging
import structlog

from .bot import create_bot, create_dispatcher
from .config import get_settings
from .db import SessionLocal, engine
from .models import Base
from .services.notifications import notification_loop


def setup_logging() -> None:
    logging.basicConfig(level=get_settings().log_level)
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(get_settings().log_level)),
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )


async def run() -> None:
    setup_logging()
    bot = create_bot()
    dp = create_dispatcher()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    settings = get_settings()
    notify_task = asyncio.create_task(
        notification_loop(bot, SessionLocal, settings.tz, settings.premium_daily_notify_hour)
    )

    try:
        await dp.start_polling(bot)
    finally:
        notify_task.cancel()
        await bot.session.close()


if __name__ == '__main__':
    asyncio.run(run())
