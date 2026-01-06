"""Add facts_cache table

Revision ID: 002_add_facts_cache
Revises: 001_initial (if exists)
Create Date: 2026-01-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_facts_cache'
down_revision = None  # Set to previous migration if exists
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'facts_cache',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('period_hours', sa.String(10), nullable=False, default='24'),
        sa.Column('facts_json', sa.Text(), nullable=False),
        sa.Column('article_count', sa.Float(), default=0),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    # Index for faster lookups by period
    op.create_index('ix_facts_cache_period_hours', 'facts_cache', ['period_hours'])


def downgrade() -> None:
    op.drop_index('ix_facts_cache_period_hours', table_name='facts_cache')
    op.drop_table('facts_cache')
