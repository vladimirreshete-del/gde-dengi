from __future__ import annotations

import datetime as dt
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    income_cents: Mapped[int] = mapped_column(Integer, default=0)
    salary_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    premium_until: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    last_notified_at: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    expenses: Mapped[list['Expense']] = relationship(back_populates='user', cascade='all, delete-orphan')
    goals: Mapped[list['Goal']] = relationship(back_populates='user', cascade='all, delete-orphan')


class Expense(Base):
    __tablename__ = 'expenses'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(120))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates='expenses')


class Goal(Base):
    __tablename__ = 'goals'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    title: Mapped[str] = mapped_column(String(120))
    target_cents: Mapped[int] = mapped_column(Integer)
    current_cents: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates='goals')


class PromoCode(Base):
    __tablename__ = 'promo_codes'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    premium_days: Mapped[int] = mapped_column(Integer, default=30)
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    uses: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PromoActivation(Base):
    __tablename__ = 'promo_activations'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    promo_id: Mapped[int] = mapped_column(ForeignKey('promo_codes.id', ondelete='CASCADE'))
    activated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
