import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class InteractionType(str, Enum):
    COMMENT = "comment"
    REACTION = "reaction"


class TargetType(str, Enum):
    NODE = "node"
    UPDATE = "update"
    GOAL = "goal"


class ReactionType(str, Enum):
    # Elemental reactions for unique UX
    FIRE = "fire"           # "You're on fire, keep going!"
    WATER = "water"         # "Stay cool, pace yourself"
    NATURE = "nature"       # "Growing beautifully"
    LIGHTNING = "lightning" # "Fast progress!"
    MAGIC = "magic"         # "This inspired me"


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    target_type: Mapped[TargetType] = mapped_column(
        SQLEnum(TargetType, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False
    )
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    interaction_type: Mapped[InteractionType] = mapped_column(
        SQLEnum(InteractionType, values_callable=lambda enum: [e.value for e in enum]),
        nullable=False
    )

    # For comments
    content: Mapped[str] = mapped_column(Text, nullable=True)

    # For reactions (emoji type)
    reaction_type: Mapped[str] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
