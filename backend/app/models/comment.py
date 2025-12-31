import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import DateTime, Text, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class CommentTargetType(str, Enum):
    NODE = "node"
    UPDATE = "update"
    GOAL = "goal"


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    target_type: Mapped[CommentTargetType] = mapped_column(SQLEnum(CommentTargetType), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    # For threading - parent_id is nullable for top-level comments
    parent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("comments.id"), nullable=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", lazy="selectin")
    parent = relationship("Comment", remote_side=[id], back_populates="replies", lazy="selectin")
    replies = relationship("Comment", back_populates="parent", lazy="selectin")
