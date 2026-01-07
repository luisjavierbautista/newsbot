"""Alter facts_cache period_hours column size

Revision ID: 003_alter_facts_cache_period
Revises: 002_add_facts_cache
Create Date: 2026-01-06

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_alter_facts_cache_period'
down_revision = '002_add_facts_cache'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Increase period_hours column size to accommodate date ranges
    op.alter_column(
        'facts_cache',
        'period_hours',
        type_=sa.String(50),
        existing_type=sa.String(10)
    )


def downgrade() -> None:
    op.alter_column(
        'facts_cache',
        'period_hours',
        type_=sa.String(10),
        existing_type=sa.String(50)
    )
