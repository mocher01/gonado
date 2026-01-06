from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.models.node import NodeStatus, NodeType, DependencyType


class NodeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order: int
    position_x: float = 0.0
    position_y: float = 0.0
    extra_data: Dict[str, Any] = {}
    due_date: Optional[datetime] = None
    # BPMN fields
    node_type: NodeType = NodeType.TASK
    can_parallel: bool = False
    estimated_duration: Optional[int] = None
    # Difficulty level (1-5, default 3)
    difficulty: int = 3
    # Sequential/Parallel structuring (Issue #63)
    is_sequential: bool = True
    parallel_group: Optional[int] = None

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError('Difficulty must be between 1 and 5')
        return v


class NodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None
    due_date: Optional[datetime] = None
    # BPMN fields
    node_type: Optional[NodeType] = None
    can_parallel: Optional[bool] = None
    estimated_duration: Optional[int] = None
    # Difficulty level (1-5)
    difficulty: Optional[int] = None
    # Sequential/Parallel structuring (Issue #63)
    is_sequential: Optional[bool] = None
    parallel_group: Optional[int] = None

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Difficulty must be between 1 and 5')
        return v


class NodeStatusUpdate(BaseModel):
    status: NodeStatus


class NodePositionUpdate(BaseModel):
    """Schema for updating node position only."""
    position_x: float
    position_y: float


# Dependency schemas
class DependencyCreate(BaseModel):
    depends_on_id: UUID
    dependency_type: DependencyType = DependencyType.FINISH_TO_START


class DependencyResponse(BaseModel):
    id: UUID
    node_id: UUID
    depends_on_id: UUID
    dependency_type: DependencyType
    created_at: datetime

    class Config:
        from_attributes = True


class NodeResponse(BaseModel):
    id: UUID
    goal_id: UUID
    title: str
    description: Optional[str]
    order: int
    status: NodeStatus
    position_x: float
    position_y: float
    extra_data: Dict[str, Any]
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    # BPMN fields
    node_type: NodeType
    can_parallel: bool
    estimated_duration: Optional[int]
    # Difficulty level (1-5)
    difficulty: int = 3
    # Sequential/Parallel structuring (Issue #63)
    is_sequential: bool = True
    parallel_group: Optional[int] = None
    # Computed field: can this node be interacted with?
    can_interact: bool = True

    class Config:
        from_attributes = True


class NodeWithDependenciesResponse(NodeResponse):
    """Node response including dependency information."""
    depends_on: List[DependencyResponse] = []
    dependents: List[DependencyResponse] = []


class CanInteractResponse(BaseModel):
    """Response for checking if user can interact with a node."""
    can_interact: bool
    reason: Optional[str] = None
    blocking_nodes: List[UUID] = []


# Social summary schemas
class ReactionCounts(BaseModel):
    """Counts for each reaction type."""
    fire: int = 0
    water: int = 0
    nature: int = 0
    lightning: int = 0
    magic: int = 0


class TopComment(BaseModel):
    """Preview of a top comment."""
    id: UUID
    user_id: UUID
    username: str
    display_name: Optional[str]
    content: str
    created_at: datetime
    reply_count: int = 0


class NodeSocialSummary(BaseModel):
    """Social activity summary for a single node."""
    node_id: UUID
    reactions: ReactionCounts
    reactions_total: int
    comments_count: int
    resources_count: int
    top_comments: List[TopComment] = []


class GoalNodesSocialSummary(BaseModel):
    """Batch social summary for all nodes in a goal."""
    goal_id: UUID
    nodes: Dict[str, NodeSocialSummary]  # node_id -> summary
