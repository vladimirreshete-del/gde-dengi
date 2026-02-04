from __future__ import annotations

import time
from typing import Any, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject


class RateLimitMiddleware(BaseMiddleware):
    def __init__(self, max_per_second: float = 1.0) -> None:
        self.max_per_second = max_per_second
        self._last_call: Dict[int, float] = {}
        super().__init__()

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Any],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        user = data.get('event_from_user')
        if user:
            now = time.monotonic()
            last = self._last_call.get(user.id, 0)
            if now - last < 1 / self.max_per_second:
                return None
            self._last_call[user.id] = now
        return await handler(event, data)
