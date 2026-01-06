"""Add sequential/parallel node structuring fields (Issue #63)

Revision ID: 8sequential_parallel_structuring
Revises: 7sacred_boost_enhancements
Create Date: 2025-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8sequential_parallel_structuring'
down_revision: Union[str, None] = '8node_difficulty_levels'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_sequential column (defaults to True - nodes are sequential by default)
    op.add_column('nodes', sa.Column('is_sequential', sa.Boolean(), nullable=True, server_default='true'))

    # Add parallel_group column (nullable, nodes in same group can be worked on together)
    op.add_column('nodes', sa.Column('parallel_group', sa.Integer(), nullable=True))

    # Set defaults for existing rows
    op.execute("UPDATE nodes SET is_sequential = true WHERE is_sequential IS NULL")

    # Make is_sequential not nullable now that all rows have values
    op.alter_column('nodes', 'is_sequential', nullable=False)


def downgrade() -> None:
    op.drop_column('nodes', 'parallel_group')
    op.drop_column('nodes', 'is_sequential')
