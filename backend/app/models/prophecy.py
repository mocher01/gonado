import uuid
from datetime import datetime, date
from sqlalchemy import DateTime, Date, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Prophecy(Base):
    """Predictions made by supporters about when a goal will be completed."""
    __tablename__ = "prophecies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who made the prediction
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Which goal they're predicting
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)

    # Their prediction
    predicted_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Filled in when goal completes - how many days off were they?
    accuracy_days: Mapped[int] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", lazy="selectin")
    goal = relationship("Goal", lazy="selectin")
