import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.database import Base


class UpdateType(str, Enum):
    PROGRESS = "progress"
    MILESTONE = "milestone"
    STRUGGLE = "struggle"
    CELEBRATION = "celebration"


class Update(Base):
    __tablename__ = "updates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    media_urls: Mapped[list] = mapped_column(ARRAY(String), default=list)

    update_type: Mapped[UpdateType] = mapped_column(
        SQLEnum(UpdateType), default=UpdateType.PROGRESS
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    node = relationship("Node", back_populates="updates")
    user = relationship("User", back_populates="updates")
    interactions = relationship("Interaction", back_populates="update", lazy="selectin")
