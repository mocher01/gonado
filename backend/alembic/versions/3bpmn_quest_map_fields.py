"""Add BPMN fields for quest map visualization

Revision ID: 3bpmn_quest_map_fields
Revises: cd8f0b04570b
Create Date: 2025-12-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3bpmn_quest_map_fields'
down_revision: Union[str, None] = 'cd8f0b04570b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define enum types explicitly
nodetype = postgresql.ENUM('task', 'parallel_start', 'parallel_end', 'milestone', name='nodetype', create_type=False)
dependencytype = postgresql.ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', name='dependencytype', create_type=False)


def upgrade() -> None:
    # Create enum types first
    nodetype.create(op.get_bind(), checkfirst=True)
    dependencytype.create(op.get_bind(), checkfirst=True)

    # Add new columns to nodes table
    op.add_column('nodes', sa.Column('node_type', nodetype, nullable=True))
    op.add_column('nodes', sa.Column('can_parallel', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('nodes', sa.Column('estimated_duration', sa.Integer(), nullable=True))

    # Set default value for existing rows
    op.execute("UPDATE nodes SET node_type = 'task' WHERE node_type IS NULL")
    op.execute("UPDATE nodes SET can_parallel = false WHERE can_parallel IS NULL")

    # Make node_type not nullable now that all rows have a value
    op.alter_column('nodes', 'node_type', nullable=False, server_default='task')

    # Create node_dependencies table
    op.create_table('node_dependencies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('node_id', sa.UUID(), nullable=False),
        sa.Column('depends_on_id', sa.UUID(), nullable=False),
        sa.Column('dependency_type', dependencytype, nullable=True, server_default='finish_to_start'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['node_id'], ['nodes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_id'], ['nodes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('node_id', 'depends_on_id', name='uq_node_dependency')
    )

    # Create index for faster dependency lookups
    op.create_index('ix_node_dependencies_node_id', 'node_dependencies', ['node_id'])
    op.create_index('ix_node_dependencies_depends_on_id', 'node_dependencies', ['depends_on_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_node_dependencies_depends_on_id', 'node_dependencies')
    op.drop_index('ix_node_dependencies_node_id', 'node_dependencies')

    # Drop node_dependencies table
    op.drop_table('node_dependencies')

    # Remove columns from nodes
    op.drop_column('nodes', 'estimated_duration')
    op.drop_column('nodes', 'can_parallel')
    op.drop_column('nodes', 'node_type')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS dependencytype')
    op.execute('DROP TYPE IF EXISTS nodetype')
