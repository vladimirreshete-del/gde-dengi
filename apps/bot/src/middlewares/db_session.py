from __future__ import annotations

from typing import Any, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject

from ..db import SessionLocal


class DbSessionMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Any],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        async with SessionLocal() as session:
            data['session'] = session
            result = await handler(event, data)
            await session.commit()
            return result
