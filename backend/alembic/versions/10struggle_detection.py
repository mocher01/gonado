"""Add struggle detection fields to goals

Revision ID: 10struggle_detection
Revises: 9mood_indicators
Create Date: 2026-01-06

Issue #68: Struggle Detection System
Adds:
- struggle_detected_at: DateTime when struggle was detected
- struggle_dismissed_at: DateTime when owner dismissed auto-detection alert
- no_progress_threshold_days: Configurable days before "no progress" triggers (default 7)
- hard_node_threshold_days: Configurable days for hard node dwell time (default 14)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10struggle_detection'
down_revision: Union[str, None] = '9mood_indicators'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add struggle_detected_at timestamp
    op.add_column('goals', sa.Column('struggle_detected_at', sa.DateTime(), nullable=True))

    # Add struggle_dismissed_at for owner to dismiss auto-detection alerts
    op.add_column('goals', sa.Column('struggle_dismissed_at', sa.DateTime(), nullable=True))

    # Configurable thresholds (stored per-goal for flexibility)
    op.add_column('goals', sa.Column('no_progress_threshold_days', sa.Integer(), nullable=True, server_default='7'))
    op.add_column('goals', sa.Column('hard_node_threshold_days', sa.Integer(), nullable=True, server_default='14'))


def downgrade() -> None:
    op.drop_column('goals', 'hard_node_threshold_days')
    op.drop_column('goals', 'no_progress_threshold_days')
    op.drop_column('goals', 'struggle_dismissed_at')
    op.drop_column('goals', 'struggle_detected_at')
