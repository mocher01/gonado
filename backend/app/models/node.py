import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class NodeStatus(str, Enum):
    LOCKED = "locked"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class NodeType(str, Enum):
    TASK = "task"                    # Regular task node
    PARALLEL_START = "parallel_start"  # Fork gateway - start parallel execution
    PARALLEL_END = "parallel_end"      # Join gateway - wait for all parallel paths
    MILESTONE = "milestone"            # Celebratory checkpoint


class DependencyType(str, Enum):
    FINISH_TO_START = "finish_to_start"   # B starts after A finishes (default)
    START_TO_START = "start_to_start"     # B can start when A starts
    FINISH_TO_FINISH = "finish_to_finish" # B finishes when A finishes


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[NodeStatus] = mapped_column(
        SQLEnum(NodeStatus), default=NodeStatus.LOCKED
    )

    # BPMN-style node type
    node_type: Mapped[NodeType] = mapped_column(
        SQLEnum(NodeType), default=NodeType.TASK
    )

    # Whether this node can be done in parallel with siblings
    can_parallel: Mapped[bool] = mapped_column(Boolean, default=False)

    # Estimated duration in hours (for critical path calculation)
    estimated_duration: Mapped[int] = mapped_column(Integer, nullable=True)

    # Position for quest map visualization
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)

    # Flexible extra data
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    due_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    goal = relationship("Goal", back_populates="nodes")
    updates = relationship("Update", back_populates="node", lazy="selectin")

    # Dependency relationships
    depends_on = relationship(
        "NodeDependency",
        foreign_keys="NodeDependency.node_id",
        back_populates="node",
        lazy="selectin"
    )
    dependents = relationship(
        "NodeDependency",
        foreign_keys="NodeDependency.depends_on_id",
        back_populates="depends_on_node",
        lazy="selectin"
    )


class NodeDependency(Base):
    """Tracks dependencies between nodes (BPMN-style flow)."""
    __tablename__ = "node_dependencies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # The node that has a dependency
    node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False
    )

    # The node it depends on
    depends_on_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False
    )

    # Type of dependency
    dependency_type: Mapped[DependencyType] = mapped_column(
        SQLEnum(DependencyType),
        default=DependencyType.FINISH_TO_START
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    node = relationship("Node", foreign_keys=[node_id], back_populates="depends_on")
    depends_on_node = relationship("Node", foreign_keys=[depends_on_id], back_populates="dependents")
