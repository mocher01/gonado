import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)

    # Gamification
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    streak_last_activity: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    goals = relationship("Goal", back_populates="user", lazy="selectin")
    updates = relationship("Update", back_populates="user", lazy="selectin")
    notifications = relationship("Notification", back_populates="user", lazy="selectin")
    badges = relationship("UserBadge", back_populates="user", lazy="selectin")
    xp_transactions = relationship("XPTransaction", back_populates="user", lazy="selectin")
    stats = relationship("UserStats", back_populates="user", uselist=False, lazy="selectin")
