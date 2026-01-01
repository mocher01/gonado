"""Fix enum values to use lowercase

Revision ID: 6fix_enum_values
Revises: 5innovative_social_features
Create Date: 2026-01-01
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '6fix_enum_values'
down_revision = '5innovative_social_features'
branch_labels = None
depends_on = None


def upgrade():
    # Fix followtype enum values
    op.execute("ALTER TYPE followtype RENAME VALUE 'USER' TO 'user'")
    op.execute("ALTER TYPE followtype RENAME VALUE 'GOAL' TO 'goal'")

    # Fix interactiontype enum values
    op.execute("ALTER TYPE interactiontype RENAME VALUE 'COMMENT' TO 'comment'")
    op.execute("ALTER TYPE interactiontype RENAME VALUE 'REACTION' TO 'reaction'")

    # Fix targettype enum values
    op.execute("ALTER TYPE targettype RENAME VALUE 'GOAL' TO 'goal'")
    op.execute("ALTER TYPE targettype RENAME VALUE 'NODE' TO 'node'")
    op.execute("ALTER TYPE targettype RENAME VALUE 'UPDATE' TO 'update'")

    # Fix updatetype enum values
    op.execute("ALTER TYPE updatetype RENAME VALUE 'PROGRESS' TO 'progress'")
    op.execute("ALTER TYPE updatetype RENAME VALUE 'MILESTONE' TO 'milestone'")
    op.execute("ALTER TYPE updatetype RENAME VALUE 'STRUGGLE' TO 'struggle'")
    op.execute("ALTER TYPE updatetype RENAME VALUE 'CELEBRATION' TO 'celebration'")


def downgrade():
    # Revert followtype enum values
    op.execute("ALTER TYPE followtype RENAME VALUE 'user' TO 'USER'")
    op.execute("ALTER TYPE followtype RENAME VALUE 'goal' TO 'GOAL'")

    # Revert interactiontype enum values
    op.execute("ALTER TYPE interactiontype RENAME VALUE 'comment' TO 'COMMENT'")
    op.execute("ALTER TYPE interactiontype RENAME VALUE 'reaction' TO 'REACTION'")

    # Revert targettype enum values
    op.execute("ALTER TYPE targettype RENAME VALUE 'goal' TO 'GOAL'")
    op.execute("ALTER TYPE targettype RENAME VALUE 'node' TO 'NODE'")
    op.execute("ALTER TYPE targettype RENAME VALUE 'update' TO 'UPDATE'")

    # Revert updatetype enum values
    op.execute("ALTER TYPE updatetype RENAME VALUE 'progress' TO 'PROGRESS'")
    op.execute("ALTER TYPE updatetype RENAME VALUE 'milestone' TO 'MILESTONE'")
    op.execute("ALTER TYPE updatetype RENAME VALUE 'struggle' TO 'STRUGGLE'")
    op.execute("ALTER TYPE updatetype RENAME VALUE 'celebration' TO 'CELEBRATION'")
