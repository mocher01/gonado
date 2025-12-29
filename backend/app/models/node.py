import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class NodeStatus(str, Enum):
    LOCKED = "locked"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[NodeStatus] = mapped_column(
        SQLEnum(NodeStatus), default=NodeStatus.LOCKED
    )

    # Position for quest map visualization
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)

    # Flexible extra data
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    due_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    goal = relationship("Goal", back_populates="nodes")
    updates = relationship("Update", back_populates="node", lazy="selectin")
