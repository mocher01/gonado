"""Refactor time capsules for node-based unlock system

Revision ID: 12time_capsules
Revises: 11swap_system
Create Date: 2026-01-06

Issue #72: Time Capsules
Refactors time_capsules table to match new requirements:
- Supporters leave messages that unlock on date or node completion
- Owner sees capsule count but NOT content until unlocked
- Supporters can edit/delete before unlock

Changes:
- Replace goal_id + recipient_id with node_id
- Replace trigger_type/trigger_value with unlock_type/unlock_date
- Replace is_delivered/is_opened with is_unlocked
- Replace message with content
- Rename delivered_at/opened_at to unlocked_at
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '12time_capsules'
down_revision: Union[str, None] = '11swap_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old table and recreate with new schema
    # This is safe since this is a breaking change for the feature
    op.drop_table('time_capsules')

    # Drop old enum type
    op.execute('DROP TYPE IF EXISTS capsuletriggertype')

    # Create new enum type for unlock_type
    unlock_type = postgresql.ENUM(
        'date', 'node_complete',
        name='unlocktype',
        create_type=False
    )
    unlock_type.create(op.get_bind(), checkfirst=True)

    # Create new time_capsules table
    op.create_table(
        'time_capsules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('node_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('nodes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('unlock_type', unlock_type, nullable=False),
        sa.Column('unlock_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_unlocked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('unlocked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for common queries
    op.create_index('ix_time_capsules_sender_id', 'time_capsules', ['sender_id'])
    op.create_index('ix_time_capsules_node_id', 'time_capsules', ['node_id'])
    op.create_index('ix_time_capsules_is_unlocked', 'time_capsules', ['is_unlocked'])


def downgrade() -> None:
    # Drop new table
    op.drop_index('ix_time_capsules_is_unlocked', table_name='time_capsules')
    op.drop_index('ix_time_capsules_node_id', table_name='time_capsules')
    op.drop_index('ix_time_capsules_sender_id', table_name='time_capsules')
    op.drop_table('time_capsules')

    # Drop new enum type
    op.execute('DROP TYPE IF EXISTS unlocktype')

    # Recreate old table structure
    old_trigger_type = postgresql.ENUM(
        'milestone_reached', 'quest_complete', 'inactive_days', 'custom_date', 'node_complete',
        name='capsuletriggertype',
        create_type=False
    )
    old_trigger_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'time_capsules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('goal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('goals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('trigger_type', old_trigger_type, nullable=False),
        sa.Column('trigger_value', sa.Text(), nullable=True),
        sa.Column('is_delivered', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_opened', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
    )
