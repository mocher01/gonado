import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class BadgeCategory(str, Enum):
    ACHIEVEMENT = "achievement"  # General achievements (completing goals, nodes)
    SOCIAL = "social"            # Social interactions (followers, comments, reactions)
    STREAK = "streak"            # Streak-related badges
    MILESTONE = "milestone"      # Major milestones
    SPECIAL = "special"          # Special event or rare badges


class BadgeRarity(str, Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str] = mapped_column(String(500), nullable=True)
    criteria: Mapped[dict] = mapped_column(JSONB, default=dict)
    xp_reward: Mapped[int] = mapped_column(Integer, default=0)

    # New fields for enhanced badge system
    category: Mapped[BadgeCategory] = mapped_column(
        SQLEnum(BadgeCategory, values_callable=lambda x: [e.value for e in x]),
        default=BadgeCategory.ACHIEVEMENT
    )
    rarity: Mapped[BadgeRarity] = mapped_column(
        SQLEnum(BadgeRarity, values_callable=lambda x: [e.value for e in x]),
        default=BadgeRarity.COMMON
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user_badges = relationship("UserBadge", back_populates="badge")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    badge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("badges.id"), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="badges")
    badge = relationship("Badge", back_populates="user_badges")


class XPTransaction(Base):
    __tablename__ = "xp_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="xp_transactions")
