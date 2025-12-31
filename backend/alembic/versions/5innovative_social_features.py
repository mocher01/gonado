"""Add innovative social features

Revision ID: 5innovative_social_features
Revises: 4social_reputation_system
Create Date: 2025-12-31

Adds tables for:
- prophecies: Predictions about goal completion dates
- time_capsules: Delayed messages triggered by events
- resource_drops: Gifts/resources dropped on nodes
- sacred_boosts: Limited monthly boosts (3/month)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5innovative_social_features'
down_revision: Union[str, None] = '4social_reputation_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define enum types
capsuletriggertype = postgresql.ENUM(
    'milestone_reached', 'quest_complete', 'inactive_days', 'custom_date', 'node_complete',
    name='capsuletriggertype', create_type=False
)


def upgrade() -> None:
    # Create enum types
    capsuletriggertype.create(op.get_bind(), checkfirst=True)

    # Create prophecies table
    op.create_table('prophecies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('goal_id', sa.UUID(), nullable=False),
        sa.Column('predicted_date', sa.Date(), nullable=False),
        sa.Column('accuracy_days', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_prophecies_goal_id', 'prophecies', ['goal_id'])
    op.create_index('ix_prophecies_user_id', 'prophecies', ['user_id'])

    # Create time_capsules table
    op.create_table('time_capsules',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=False),
        sa.Column('recipient_id', sa.UUID(), nullable=False),
        sa.Column('goal_id', sa.UUID(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('trigger_type', capsuletriggertype, nullable=False),
        sa.Column('trigger_value', sa.Text(), nullable=True),
        sa.Column('is_delivered', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('is_opened', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id']),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id']),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_time_capsules_recipient_id', 'time_capsules', ['recipient_id'])
    op.create_index('ix_time_capsules_goal_id', 'time_capsules', ['goal_id'])

    # Create resource_drops table
    op.create_table('resource_drops',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('node_id', sa.UUID(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('resources', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
        sa.Column('is_opened', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['node_id'], ['nodes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_resource_drops_node_id', 'resource_drops', ['node_id'])
    op.create_index('ix_resource_drops_user_id', 'resource_drops', ['user_id'])

    # Create sacred_boosts table
    op.create_table('sacred_boosts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('giver_id', sa.UUID(), nullable=False),
        sa.Column('receiver_id', sa.UUID(), nullable=False),
        sa.Column('goal_id', sa.UUID(), nullable=False),
        sa.Column('year_month', sa.Integer(), nullable=False),
        sa.Column('xp_awarded', sa.Integer(), nullable=True, server_default='50'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['giver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['receiver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sacred_boosts_giver_id', 'sacred_boosts', ['giver_id'])
    op.create_index('ix_sacred_boosts_goal_id', 'sacred_boosts', ['goal_id'])
    op.create_index('ix_sacred_boosts_year_month', 'sacred_boosts', ['year_month'])


def downgrade() -> None:
    # Drop tables
    op.drop_index('ix_sacred_boosts_year_month', 'sacred_boosts')
    op.drop_index('ix_sacred_boosts_goal_id', 'sacred_boosts')
    op.drop_index('ix_sacred_boosts_giver_id', 'sacred_boosts')
    op.drop_table('sacred_boosts')

    op.drop_index('ix_resource_drops_user_id', 'resource_drops')
    op.drop_index('ix_resource_drops_node_id', 'resource_drops')
    op.drop_table('resource_drops')

    op.drop_index('ix_time_capsules_goal_id', 'time_capsules')
    op.drop_index('ix_time_capsules_recipient_id', 'time_capsules')
    op.drop_table('time_capsules')

    op.drop_index('ix_prophecies_user_id', 'prophecies')
    op.drop_index('ix_prophecies_goal_id', 'prophecies')
    op.drop_table('prophecies')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS capsuletriggertype')
