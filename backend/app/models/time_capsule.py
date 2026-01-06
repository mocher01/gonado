import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class UnlockType(str, Enum):
    DATE = "date"
    NODE_COMPLETE = "node_complete"


class TimeCapsule(Base):
    """Messages from supporters that unlock on a specific date or when a node is completed."""
    __tablename__ = "time_capsules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who sent the capsule (supporter)
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Which node this capsule is attached to
    node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)

    # The message content
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Unlock configuration
    unlock_type: Mapped[UnlockType] = mapped_column(
        SQLEnum(UnlockType, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False
    )

    # For DATE unlock type, the date when it unlocks
    unlock_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Status
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], lazy="selectin")
    node = relationship("Node", lazy="selectin")
