from __future__ import annotations

from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    bot_token: str
    database_url: str
    redis_url: str | None = None
    admin_ids: list[int] = []
    premium_daily_notify_hour: int = 9
    log_level: str = 'INFO'
    tz: str = 'Europe/Moscow'

    @field_validator('admin_ids', mode='before')
    @classmethod
    def parse_admin_ids(cls, value: str | list[int]) -> list[int]:
        if isinstance(value, list):
            return value
        if not value:
            return []
        return [int(item.strip()) for item in str(value).split(',') if item.strip()]


@lru_cache

def get_settings() -> Settings:
    return Settings()
