from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.goal import GoalVisibility, GoalStatus


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    visibility: GoalVisibility = GoalVisibility.PUBLIC
    world_theme: str = "mountain"
    target_date: Optional[datetime] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[GoalVisibility] = None
    status: Optional[GoalStatus] = None
    target_date: Optional[datetime] = None


class GoalResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str]
    category: Optional[str]
    visibility: GoalVisibility
    status: GoalStatus
    world_theme: str
    target_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    current_mood: Optional[str] = None
    mood_updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MoodUpdate(BaseModel):
    mood: str  # One of: motivated, confident, focused, struggling, stuck, celebrating


class GoalListResponse(BaseModel):
    goals: List[GoalResponse]
    total: int
