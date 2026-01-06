import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SwapStatus(str, Enum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class Swap(Base):
    __tablename__ = "swaps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who proposed the swap
    proposer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # Who receives the swap proposal
    receiver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Proposer's goal and optional node
    proposer_goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)
    proposer_node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=True)

    # Receiver's goal and optional node (set on accept)
    receiver_goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=True)
    receiver_node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=True)

    # Proposal message
    message: Mapped[str] = mapped_column(String(500), nullable=True)

    # Status
    status: Mapped[SwapStatus] = mapped_column(
        SQLEnum(SwapStatus, values_callable=lambda enum: [e.value for e in enum]),
        default=SwapStatus.PROPOSED
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    proposer = relationship("User", foreign_keys=[proposer_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    proposer_goal = relationship("Goal", foreign_keys=[proposer_goal_id])
    proposer_node = relationship("Node", foreign_keys=[proposer_node_id])
    receiver_goal = relationship("Goal", foreign_keys=[receiver_goal_id])
    receiver_node = relationship("Node", foreign_keys=[receiver_node_id])
