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
    # Struggle detection (Issue #68)
    struggle_detected_at: Optional[datetime] = None
    struggle_dismissed_at: Optional[datetime] = None
    no_progress_threshold_days: Optional[int] = 7
    hard_node_threshold_days: Optional[int] = 14

    class Config:
        from_attributes = True


class StruggleStatusResponse(BaseModel):
    """Response for struggle status endpoint (Issue #68)"""
    goal_id: UUID
    is_struggling: bool
    signals: List[str]  # List of active struggle signals
    struggle_detected_at: Optional[datetime] = None
    mood_signal: bool = False  # True if mood is struggling/stuck
    reaction_signal: bool = False  # True if 3+ mark-struggle reactions
    no_progress_signal: bool = False  # True if no progress for X days
    hard_node_signal: bool = False  # True if stuck on hard node for X days
    last_activity_at: Optional[datetime] = None  # When last progress was made
    days_since_progress: Optional[int] = None
    struggle_reactions_count: int = 0  # Number of mark-struggle reactions


class MoodUpdate(BaseModel):
    mood: str  # One of: motivated, confident, focused, struggling, stuck, celebrating


class GoalListResponse(BaseModel):
    goals: List[GoalResponse]
    total: int


class GoalOwnerInfo(BaseModel):
    """Basic user info for goal owner"""
    user_id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]


class GoalDiscoveryResponse(BaseModel):
    """Enriched goal response for discovery features with owner info"""
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
    struggle_detected_at: Optional[datetime] = None
    struggle_dismissed_at: Optional[datetime] = None
    no_progress_threshold_days: Optional[int] = 7
    hard_node_threshold_days: Optional[int] = 14
    # Owner info
    owner: GoalOwnerInfo
    # Progress percentage (0-100)
    progress: int = 0

    class Config:
        from_attributes = True


class GoalDiscoveryListResponse(BaseModel):
    goals: List[GoalDiscoveryResponse]
    total: int
