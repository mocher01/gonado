"""Add generation queue table

Revision ID: 2add_generation_queue
Revises: 1ead3bc6bfc4
Create Date: 2025-12-30 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2add_generation_queue'
down_revision: Union[str, None] = '1ead3bc6bfc4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type for queue status
    queue_status = postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='queuestatus')
    queue_status.create(op.get_bind(), checkfirst=True)

    op.create_table('generation_queue',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('goal_text', sa.Text(), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='queuestatus', create_type=False), nullable=False),
        sa.Column('goal_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('generated_plan', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('processing_started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create index for faster pending queries
    op.create_index('ix_generation_queue_status', 'generation_queue', ['status'], unique=False)
    op.create_index('ix_generation_queue_created_at', 'generation_queue', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_generation_queue_created_at', table_name='generation_queue')
    op.drop_index('ix_generation_queue_status', table_name='generation_queue')
    op.drop_table('generation_queue')

    # Drop enum type
    queue_status = postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='queuestatus')
    queue_status.drop(op.get_bind(), checkfirst=True)
