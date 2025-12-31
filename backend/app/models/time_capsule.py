import uuid
from datetime import datetime, date
from enum import Enum
from sqlalchemy import DateTime, Date, Text, Integer, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class CapsuleTriggerType(str, Enum):
    MILESTONE_REACHED = "milestone_reached"  # When user reaches a specific milestone
    QUEST_COMPLETE = "quest_complete"        # When goal is completed
    INACTIVE_DAYS = "inactive_days"          # When user is inactive for X days
    CUSTOM_DATE = "custom_date"              # On a specific date
    NODE_COMPLETE = "node_complete"          # When a specific node is completed


class TimeCapsule(Base):
    """Delayed messages that are delivered when certain conditions are met."""
    __tablename__ = "time_capsules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who sent the capsule
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Who receives it (goal owner)
    recipient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Which goal it's attached to
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)

    # The message content
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Trigger configuration
    trigger_type: Mapped[CapsuleTriggerType] = mapped_column(SQLEnum(CapsuleTriggerType), nullable=False)

    # Trigger value depends on type:
    # - milestone_reached: milestone node_id (as string)
    # - inactive_days: number of days (as string, e.g., "14")
    # - custom_date: date string "YYYY-MM-DD"
    # - node_complete: node_id (as string)
    trigger_value: Mapped[str] = mapped_column(Text, nullable=True)

    # Status
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=False)
    is_opened: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    delivered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], lazy="selectin")
    recipient = relationship("User", foreign_keys=[recipient_id], lazy="selectin")
    goal = relationship("Goal", lazy="selectin")
