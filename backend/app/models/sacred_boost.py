import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import DateTime, Integer, ForeignKey, Text, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class SacredBoost(Base):
    """
    Limited sacred boosts (3 per goal per day per user).
    A rare and meaningful way to support someone's journey.
    """
    __tablename__ = "sacred_boosts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who gave the boost
    giver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Who received it
    receiver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Which goal was boosted
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)

    # Optional encouragement message
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Date for tracking the 3/goal/day limit
    boost_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)

    # Legacy field for backward compatibility (kept for existing data)
    year_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # Format: YYYYMM (e.g., 202512)

    # XP awarded to receiver
    xp_awarded: Mapped[int] = mapped_column(Integer, default=50)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    giver = relationship("User", foreign_keys=[giver_id], lazy="selectin")
    receiver = relationship("User", foreign_keys=[receiver_id], lazy="selectin")
    goal = relationship("Goal", lazy="selectin")
