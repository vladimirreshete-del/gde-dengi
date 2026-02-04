from __future__ import annotations

import datetime as dt
import re
from typing import Tuple

DATE_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})|(?:(\d{2})\.(\d{2})\.(\d{4}))")


def parse_salary_input(text: str) -> tuple[int | None, dt.date | None]:
    text = text.strip()
    match = DATE_RE.search(text)
    if match:
        if match.group(1):
            year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
        else:
            day, month, year = int(match.group(4)), int(match.group(5)), int(match.group(6))
        return None, dt.date(year, month, day)

    if text.isdigit():
        day = int(text)
        if 1 <= day <= 31:
            return day, None
    raise ValueError('Нужен день месяца (1-31) или дата в формате YYYY-MM-DD / DD.MM.YYYY')


def parse_expense(text: str) -> Tuple[int, str]:
    cleaned = text.strip()
    if cleaned.startswith('+'):
        cleaned = cleaned[1:].strip()
    parts = cleaned.split(maxsplit=1)
    if not parts or not parts[0].isdigit():
        raise ValueError('Укажи сумму и категорию, например: +350 еда')
    amount_rub = int(parts[0])
    category = parts[1] if len(parts) > 1 else 'прочее'
    return amount_rub * 100, category.strip()
