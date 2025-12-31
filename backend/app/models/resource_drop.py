import uuid
from datetime import datetime
from sqlalchemy import DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class ResourceDrop(Base):
    """Gifts/resources dropped by supporters on specific nodes."""
    __tablename__ = "resource_drops"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who dropped the resource
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Which node it's attached to
    node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)

    # The content
    message: Mapped[str] = mapped_column(Text, nullable=True)

    # Links and attachments as JSON array
    # Format: [{"url": "https://...", "title": "Resource Name", "type": "link|file|voice"}]
    resources: Mapped[dict] = mapped_column(JSONB, default=list)

    # Has the goal owner opened this gift?
    is_opened: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    opened_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", lazy="selectin")
    node = relationship("Node", lazy="selectin")
