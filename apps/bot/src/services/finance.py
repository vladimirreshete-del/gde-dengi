from __future__ import annotations

import calendar
import datetime as dt
from dataclasses import dataclass
from dateutil.relativedelta import relativedelta


@dataclass(slots=True)
class SalaryPeriod:
    start: dt.date
    next_salary: dt.date

    @property
    def days_left(self) -> int:
        return max((self.next_salary - dt.date.today()).days, 0)


def _month_day(year: int, month: int, day: int) -> dt.date:
    last_day = calendar.monthrange(year, month)[1]
    return dt.date(year, month, min(day, last_day))


def get_salary_period(today: dt.date, salary_day: int | None, salary_date: dt.date | None) -> SalaryPeriod:
    if salary_date and salary_date >= today:
        next_salary = salary_date
        prev_salary = salary_date - relativedelta(months=1)
        return SalaryPeriod(start=prev_salary, next_salary=next_salary)

    if salary_day is None and salary_date is not None:
        salary_day = salary_date.day

    if salary_day is None:
        salary_day = today.day

    current_month_salary = _month_day(today.year, today.month, salary_day)
    if today <= current_month_salary:
        next_salary = current_month_salary
        prev_salary = _month_day((today - relativedelta(months=1)).year, (today - relativedelta(months=1)).month, salary_day)
    else:
        next_salary = _month_day((today + relativedelta(months=1)).year, (today + relativedelta(months=1)).month, salary_day)
        prev_salary = current_month_salary

    return SalaryPeriod(start=prev_salary, next_salary=next_salary)


def format_money(cents: int) -> str:
    rubles = cents / 100
    return f"{rubles:,.2f} ₽".replace(',', ' ')


def compute_daily_limit(balance_cents: int, days_left: int) -> int:
    if days_left <= 0:
        return balance_cents
    return max(balance_cents // days_left, 0)
