"""Enhance sacred_boosts with message and daily rate limiting

Revision ID: 7sacred_boost_enhancements
Revises: 6fix_enum_values
Create Date: 2026-01-05

Adds:
- message: Optional encouragement message with boost
- boost_date: Date field for daily rate limiting (3 per goal per day)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import date


# revision identifiers, used by Alembic.
revision: str = '7sacred_boost_enhancements'
down_revision: Union[str, None] = '6fix_enum_values'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add message column (optional text for encouragement)
    op.add_column('sacred_boosts', sa.Column('message', sa.Text(), nullable=True))

    # Add boost_date column for daily rate limiting
    op.add_column('sacred_boosts', sa.Column('boost_date', sa.Date(), nullable=True))

    # Set default boost_date for existing records based on created_at
    op.execute("""
        UPDATE sacred_boosts
        SET boost_date = DATE(created_at)
        WHERE boost_date IS NULL
    """)

    # Make boost_date non-nullable after setting defaults
    op.alter_column('sacred_boosts', 'boost_date', nullable=False)

    # Create index on boost_date for efficient daily queries
    op.create_index('ix_sacred_boosts_boost_date', 'sacred_boosts', ['boost_date'])

    # Create composite index for daily rate limit queries
    op.create_index(
        'ix_sacred_boosts_giver_goal_date',
        'sacred_boosts',
        ['giver_id', 'goal_id', 'boost_date']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_sacred_boosts_giver_goal_date', 'sacred_boosts')
    op.drop_index('ix_sacred_boosts_boost_date', 'sacred_boosts')

    # Drop columns
    op.drop_column('sacred_boosts', 'boost_date')
    op.drop_column('sacred_boosts', 'message')
