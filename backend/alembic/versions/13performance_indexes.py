"""Add performance indexes for critical queries

Revision ID: 13performance_indexes
Revises: 12time_capsules
Create Date: 2026-01-06

Performance optimization migration to add missing database indexes for:
- Goals (user_id + visibility, discovery)
- Comments (target lookups, user lookups)
- Interactions (target lookups with type)
- Follows (target lookups)
- Nodes (goal_id + status)
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '13performance_indexes'
down_revision: Union[str, None] = '12time_capsules'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Goals indexes
    op.create_index('ix_goals_user_visibility', 'goals', ['user_id', 'visibility'], if_not_exists=True)
    op.create_index('ix_goals_discovery', 'goals', ['visibility', 'updated_at'], if_not_exists=True)

    # Comments indexes
    op.create_index('ix_comments_target', 'comments', ['target_type', 'target_id'], if_not_exists=True)
    op.create_index('ix_comments_user', 'comments', ['user_id'], if_not_exists=True)

    # Interactions indexes
    op.create_index('ix_interactions_target', 'interactions', ['target_type', 'target_id', 'interaction_type'], if_not_exists=True)

    # Follows indexes
    op.create_index('ix_follows_target', 'follows', ['target_id', 'follow_type'], if_not_exists=True)

    # Nodes indexes
    op.create_index('ix_nodes_goal_status', 'nodes', ['goal_id', 'status'], if_not_exists=True)


def downgrade() -> None:
    # Drop all indexes in reverse order
    op.drop_index('ix_nodes_goal_status', table_name='nodes', if_exists=True)
    op.drop_index('ix_follows_target', table_name='follows', if_exists=True)
    op.drop_index('ix_interactions_target', table_name='interactions', if_exists=True)
    op.drop_index('ix_comments_user', table_name='comments', if_exists=True)
    op.drop_index('ix_comments_target', table_name='comments', if_exists=True)
    op.drop_index('ix_goals_discovery', table_name='goals', if_exists=True)
    op.drop_index('ix_goals_user_visibility', table_name='goals', if_exists=True)
