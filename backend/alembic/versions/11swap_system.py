"""Add swap table for accountability swaps

Revision ID: 11swap_system
Revises: 10struggle_detection
Create Date: 2026-01-06

Adds:
- swaps table for tracking accountability swap proposals between users
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '11swap_system'
down_revision: Union[str, None] = '10struggle_detection'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type for swap status
    swap_status = postgresql.ENUM(
        'proposed', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled',
        name='swapstatus',
        create_type=False
    )
    swap_status.create(op.get_bind(), checkfirst=True)

    # Create swaps table
    op.create_table(
        'swaps',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('proposer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('receiver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('proposer_goal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('goals.id'), nullable=False),
        sa.Column('proposer_node_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('nodes.id'), nullable=True),
        sa.Column('receiver_goal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('goals.id'), nullable=True),
        sa.Column('receiver_node_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('nodes.id'), nullable=True),
        sa.Column('message', sa.String(500), nullable=True),
        sa.Column('status', swap_status, nullable=False, server_default='proposed'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for common queries
    op.create_index('ix_swaps_proposer_id', 'swaps', ['proposer_id'])
    op.create_index('ix_swaps_receiver_id', 'swaps', ['receiver_id'])
    op.create_index('ix_swaps_status', 'swaps', ['status'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_swaps_status', table_name='swaps')
    op.drop_index('ix_swaps_receiver_id', table_name='swaps')
    op.drop_index('ix_swaps_proposer_id', table_name='swaps')

    # Drop table
    op.drop_table('swaps')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS swapstatus')
