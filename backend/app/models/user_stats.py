import uuid
from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class UserStats(Base):
    __tablename__ = "user_stats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    # Achievement stats (Achiever score)
    goals_created: Mapped[int] = mapped_column(Integer, default=0)
    goals_completed: Mapped[int] = mapped_column(Integer, default=0)
    nodes_completed: Mapped[int] = mapped_column(Integer, default=0)

    # Social stats (Helper/Supporter score)
    comments_given: Mapped[int] = mapped_column(Integer, default=0)
    reactions_given: Mapped[int] = mapped_column(Integer, default=0)
    comments_received: Mapped[int] = mapped_column(Integer, default=0)
    reactions_received: Mapped[int] = mapped_column(Integer, default=0)

    # Network stats
    followers_count: Mapped[int] = mapped_column(Integer, default=0)
    following_count: Mapped[int] = mapped_column(Integer, default=0)

    # Calculated scores (updated periodically or on-demand)
    achiever_score: Mapped[int] = mapped_column(Integer, default=0)
    supporter_score: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="stats")
