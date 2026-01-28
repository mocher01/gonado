from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NodeTaskBase(BaseModel):
    day_number: int
    action: str
    why: Optional[str] = None
    tip: Optional[str] = None
    duration: Optional[str] = None


class NodeTaskCreate(NodeTaskBase):
    node_id: UUID


class NodeTaskUpdate(BaseModel):
    action: Optional[str] = None
    why: Optional[str] = None
    tip: Optional[str] = None
    duration: Optional[str] = None
    is_completed: Optional[bool] = None


class NodeTaskResponse(NodeTaskBase):
    id: UUID
    node_id: UUID
    is_completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
