from __future__ import annotations

import asyncio
from typing import Any, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.exceptions import TelegramNetworkError, TelegramRetryAfter
from aiogram.types import TelegramObject


class RetryMiddleware(BaseMiddleware):
    def __init__(self, max_retries: int = 2) -> None:
        self.max_retries = max_retries
        super().__init__()

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Any],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        attempt = 0
        while True:
            try:
                return await handler(event, data)
            except TelegramRetryAfter as exc:
                attempt += 1
                if attempt > self.max_retries:
                    raise
                await asyncio.sleep(exc.retry_after)
            except TelegramNetworkError:
                attempt += 1
                if attempt > self.max_retries:
                    raise
                await asyncio.sleep(1 + attempt)
