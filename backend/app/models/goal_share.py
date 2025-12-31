import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SharePermission(str, Enum):
    VIEW = "view"
    EDIT = "edit"


class ShareStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class GoalShare(Base):
    __tablename__ = "goal_shares"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invited_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission: Mapped[SharePermission] = mapped_column(SQLEnum(SharePermission), default=SharePermission.VIEW)
    status: Mapped[ShareStatus] = mapped_column(SQLEnum(ShareStatus), default=ShareStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('goal_id', 'shared_with_user_id', name='unique_goal_share'),
    )

    # Relationships
    goal = relationship("Goal", back_populates="shares")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id])
    invited_by = relationship("User", foreign_keys=[invited_by_id])
