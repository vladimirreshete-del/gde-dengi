"""init

Revision ID: 20240914_0001
Revises: 
Create Date: 2024-09-14
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = '20240914_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('telegram_id', sa.Integer(), nullable=False),
        sa.Column('income_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('salary_day', sa.Integer(), nullable=True),
        sa.Column('salary_date', sa.Date(), nullable=True),
        sa.Column('is_premium', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('premium_until', sa.Date(), nullable=True),
        sa.Column('last_notified_at', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_users_telegram_id', 'users', ['telegram_id'], unique=True)

    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=120), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_expenses_user_id', 'expenses', ['user_id'], unique=False)

    op.create_table(
        'goals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=120), nullable=False),
        sa.Column('target_cents', sa.Integer(), nullable=False),
        sa.Column('current_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_goals_user_id', 'goals', ['user_id'], unique=False)

    op.create_table(
        'promo_codes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(length=64), nullable=False),
        sa.Column('premium_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('max_uses', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('uses', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_promo_codes_code', 'promo_codes', ['code'], unique=True)

    op.create_table(
        'promo_activations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('promo_id', sa.Integer(), sa.ForeignKey('promo_codes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('activated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_promo_activations_user_id', 'promo_activations', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_promo_activations_user_id', table_name='promo_activations')
    op.drop_table('promo_activations')
    op.drop_index('ix_promo_codes_code', table_name='promo_codes')
    op.drop_table('promo_codes')
    op.drop_index('ix_goals_user_id', table_name='goals')
    op.drop_table('goals')
    op.drop_index('ix_expenses_user_id', table_name='expenses')
    op.drop_table('expenses')
    op.drop_index('ix_users_telegram_id', table_name='users')
    op.drop_table('users')
