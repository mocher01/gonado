"""Add social and reputation system tables

Revision ID: 4social_reputation_system
Revises: 3bpmn_quest_map_fields
Create Date: 2025-12-31

Adds tables for:
- goal_shares: Share goals with specific users
- comments: Threaded comments on goals, nodes, updates
- activities: Activity feed for users
- user_stats: User reputation and statistics tracking

Also adds category and rarity columns to badges table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4social_reputation_system'
down_revision: Union[str, None] = '3bpmn_quest_map_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define enum types
sharepermission = postgresql.ENUM('view', 'edit', name='sharepermission', create_type=False)
sharestatus = postgresql.ENUM('pending', 'accepted', 'declined', name='sharestatus', create_type=False)
commenttargettype = postgresql.ENUM('node', 'update', 'goal', name='commenttargettype', create_type=False)
activitytype = postgresql.ENUM(
    'goal_created', 'node_completed', 'goal_completed', 'comment_added',
    'reaction_added', 'started_following', 'badge_earned', 'milestone_reached',
    name='activitytype', create_type=False
)
activitytargettype = postgresql.ENUM('goal', 'node', 'user', 'update', 'badge', name='activitytargettype', create_type=False)
badgecategory = postgresql.ENUM('achievement', 'social', 'streak', 'milestone', 'special', name='badgecategory', create_type=False)
badgerarity = postgresql.ENUM('common', 'rare', 'epic', 'legendary', name='badgerarity', create_type=False)


def upgrade() -> None:
    # Create enum types first
    sharepermission.create(op.get_bind(), checkfirst=True)
    sharestatus.create(op.get_bind(), checkfirst=True)
    commenttargettype.create(op.get_bind(), checkfirst=True)
    activitytype.create(op.get_bind(), checkfirst=True)
    activitytargettype.create(op.get_bind(), checkfirst=True)
    badgecategory.create(op.get_bind(), checkfirst=True)
    badgerarity.create(op.get_bind(), checkfirst=True)

    # Create goal_shares table
    op.create_table('goal_shares',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('goal_id', sa.UUID(), nullable=False),
        sa.Column('shared_with_user_id', sa.UUID(), nullable=False),
        sa.Column('invited_by_id', sa.UUID(), nullable=False),
        sa.Column('permission', sharepermission, nullable=True, server_default='view'),
        sa.Column('status', sharestatus, nullable=True, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_with_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('goal_id', 'shared_with_user_id', name='unique_goal_share')
    )
    op.create_index('ix_goal_shares_goal_id', 'goal_shares', ['goal_id'])
    op.create_index('ix_goal_shares_shared_with_user_id', 'goal_shares', ['shared_with_user_id'])

    # Create comments table
    op.create_table('comments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('target_type', commenttargettype, nullable=False),
        sa.Column('target_id', sa.UUID(), nullable=False),
        sa.Column('parent_id', sa.UUID(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_edited', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['parent_id'], ['comments.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_comments_user_id', 'comments', ['user_id'])
    op.create_index('ix_comments_target', 'comments', ['target_type', 'target_id'])
    op.create_index('ix_comments_parent_id', 'comments', ['parent_id'])

    # Create activities table
    op.create_table('activities',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('activity_type', activitytype, nullable=False),
        sa.Column('target_type', activitytargettype, nullable=True),
        sa.Column('target_id', sa.UUID(), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('is_public', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_activities_user_id', 'activities', ['user_id'])
    op.create_index('ix_activities_created_at', 'activities', ['created_at'])
    op.create_index('ix_activities_target', 'activities', ['target_type', 'target_id'])

    # Create user_stats table
    op.create_table('user_stats',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('goals_created', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('goals_completed', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('nodes_completed', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('comments_given', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('reactions_given', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('comments_received', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('reactions_received', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('followers_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('following_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('achiever_score', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('supporter_score', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_stats_user_id')
    )

    # Add category and rarity columns to badges table
    op.add_column('badges', sa.Column('category', badgecategory, nullable=True))
    op.add_column('badges', sa.Column('rarity', badgerarity, nullable=True))

    # Set default values for existing badges
    op.execute("UPDATE badges SET category = 'achievement' WHERE category IS NULL")
    op.execute("UPDATE badges SET rarity = 'common' WHERE rarity IS NULL")


def downgrade() -> None:
    # Remove columns from badges
    op.drop_column('badges', 'rarity')
    op.drop_column('badges', 'category')

    # Drop tables
    op.drop_table('user_stats')
    op.drop_index('ix_activities_target', 'activities')
    op.drop_index('ix_activities_created_at', 'activities')
    op.drop_index('ix_activities_user_id', 'activities')
    op.drop_table('activities')
    op.drop_index('ix_comments_parent_id', 'comments')
    op.drop_index('ix_comments_target', 'comments')
    op.drop_index('ix_comments_user_id', 'comments')
    op.drop_table('comments')
    op.drop_index('ix_goal_shares_shared_with_user_id', 'goal_shares')
    op.drop_index('ix_goal_shares_goal_id', 'goal_shares')
    op.drop_table('goal_shares')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS badgerarity')
    op.execute('DROP TYPE IF EXISTS badgecategory')
    op.execute('DROP TYPE IF EXISTS activitytargettype')
    op.execute('DROP TYPE IF EXISTS activitytype')
    op.execute('DROP TYPE IF EXISTS commenttargettype')
    op.execute('DROP TYPE IF EXISTS sharestatus')
    op.execute('DROP TYPE IF EXISTS sharepermission')
