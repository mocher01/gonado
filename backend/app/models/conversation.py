"""
Conversation models for AI chat-based goal creation.

This enables a real-time chat interface where:
1. User sends messages through the frontend
2. Claude (via CLI script) sees and responds to messages
3. Back-and-forth conversation until plan is generated
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class ConversationStatus(str, Enum):
    ACTIVE = "active"           # Conversation ongoing
    WAITING = "waiting"         # Waiting for Claude response
    PLANNING = "planning"       # Claude is generating the plan
    COMPLETED = "completed"     # Goal created successfully
    ABANDONED = "abandoned"     # User left without completing


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Base):
    """A goal creation conversation session."""
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Conversation state
    status = Column(
        SQLEnum(ConversationStatus, values_callable=lambda x: [e.value for e in x]),
        default=ConversationStatus.ACTIVE
    )

    # Result (when completed)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", backref="conversations")
    goal = relationship("Goal", backref="source_conversation")
    messages = relationship("ConversationMessage", back_populates="conversation", order_by="ConversationMessage.sequence")


class ConversationMessage(Base):
    """Individual message in a conversation."""
    __tablename__ = "conversation_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)

    # Message content
    role = Column(
        SQLEnum(MessageRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    content = Column(Text, nullable=False)

    # Ordering
    sequence = Column(Integer, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
