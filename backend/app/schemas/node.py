from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.node import NodeStatus


class NodeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    order: int
    position_x: float = 0.0
    position_y: float = 0.0
    extra_data: Dict[str, Any] = {}
    due_date: Optional[datetime] = None


class NodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None
    due_date: Optional[datetime] = None


class NodeStatusUpdate(BaseModel):
    status: NodeStatus


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

    class Config:
        from_attributes = True
