import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class ActivityType(str, Enum):
    GOAL_CREATED = "goal_created"
    NODE_COMPLETED = "node_completed"
    GOAL_COMPLETED = "goal_completed"
    COMMENT_ADDED = "comment_added"
    REACTION_ADDED = "reaction_added"
    STARTED_FOLLOWING = "started_following"
    BADGE_EARNED = "badge_earned"
    MILESTONE_REACHED = "milestone_reached"


class ActivityTargetType(str, Enum):
    GOAL = "goal"
    NODE = "node"
    USER = "user"
    UPDATE = "update"
    BADGE = "badge"


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    activity_type: Mapped[ActivityType] = mapped_column(SQLEnum(ActivityType), nullable=False)
    target_type: Mapped[ActivityTargetType] = mapped_column(SQLEnum(ActivityTargetType), nullable=True)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Extra data (e.g., node title, goal title, badge name, etc.)
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Whether this activity is visible to others
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
