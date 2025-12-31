import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class GoalVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    SHARED = "shared"
    FRIENDS = "friends"


class GoalStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=True)

    visibility: Mapped[GoalVisibility] = mapped_column(
        SQLEnum(GoalVisibility), default=GoalVisibility.PUBLIC
    )
    status: Mapped[GoalStatus] = mapped_column(
        SQLEnum(GoalStatus), default=GoalStatus.PLANNING
    )

    world_theme: Mapped[str] = mapped_column(String(50), default="mountain")
    target_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="goals")
    nodes = relationship("Node", back_populates="goal", lazy="selectin", order_by="Node.order")
    shares = relationship("GoalShare", back_populates="goal", lazy="selectin", cascade="all, delete-orphan")
