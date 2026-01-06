"""Add difficulty field to nodes

Revision ID: 8node_difficulty_levels
Revises: 7sacred_boost_enhancements
Create Date: 2026-01-05

Adds:
- difficulty: Integer 1-5 scale (default 3) for node difficulty level
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8node_difficulty_levels'
down_revision: Union[str, None] = '7sacred_boost_enhancements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add difficulty column with default value of 3 (medium)
    op.add_column('nodes', sa.Column('difficulty', sa.Integer(), nullable=True, server_default='3'))

    # Set default value for existing rows
    op.execute("UPDATE nodes SET difficulty = 3 WHERE difficulty IS NULL")

    # Make difficulty not nullable now that all rows have a value
    op.alter_column('nodes', 'difficulty', nullable=False, server_default='3')

    # Create index for efficient filtering by difficulty
    op.create_index('ix_nodes_difficulty', 'nodes', ['difficulty'])


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_nodes_difficulty', 'nodes')

    # Drop column
    op.drop_column('nodes', 'difficulty')
