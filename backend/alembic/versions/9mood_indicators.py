"""Add mood field to goals

Revision ID: 9mood_indicators
Revises: 8sequential_parallel_structuring
Create Date: 2026-01-06

Adds:
- current_mood: String field for mood indicator (nullable)
- mood_updated_at: DateTime for mood history tracking
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9mood_indicators'
down_revision: Union[str, None] = '8sequential_parallel_structuring'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add current_mood column (nullable string)
    op.add_column('goals', sa.Column('current_mood', sa.String(50), nullable=True))

    # Add mood_updated_at for tracking when mood was last changed
    op.add_column('goals', sa.Column('mood_updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Drop columns
    op.drop_column('goals', 'mood_updated_at')
    op.drop_column('goals', 'current_mood')
