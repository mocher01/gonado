from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.activity import ActivityType, ActivityTargetType


class ActivityUserInfo(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


class ActivityResponse(BaseModel):
    id: UUID
    user_id: UUID
    activity_type: ActivityType
    target_type: Optional[ActivityTargetType]
    target_id: Optional[UUID]
    extra_data: Dict[str, Any]
    is_public: bool
    created_at: datetime

    # Enriched data
    user: Optional[ActivityUserInfo] = None

    class Config:
        from_attributes = True


class ActivityFeed(BaseModel):
    activities: List[ActivityResponse]
    total: int
    has_more: bool
