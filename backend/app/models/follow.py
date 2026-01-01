import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class FollowType(str, Enum):
    USER = "user"
    GOAL = "goal"


class Follow(Base):
    __tablename__ = "follows"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    follow_type: Mapped[FollowType] = mapped_column(
        SQLEnum(FollowType, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False
    )
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('follower_id', 'follow_type', 'target_id', name='unique_follow'),
    )

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id])
