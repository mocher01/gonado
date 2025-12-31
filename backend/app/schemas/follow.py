from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.follow import FollowType


class FollowCreate(BaseModel):
    follow_type: FollowType
    target_id: UUID


class FollowResponse(BaseModel):
    id: UUID
    follower_id: UUID
    follow_type: FollowType
    target_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class FollowWithFollowerResponse(BaseModel):
    id: UUID
    follower_id: UUID
    follow_type: FollowType
    target_id: UUID
    created_at: datetime
    follower_username: str
    follower_display_name: Optional[str]
    follower_avatar_url: Optional[str]

    class Config:
        from_attributes = True


class FollowWithTargetResponse(BaseModel):
    id: UUID
    follower_id: UUID
    follow_type: FollowType
    target_id: UUID
    created_at: datetime
    target_username: Optional[str] = None
    target_display_name: Optional[str] = None
    target_avatar_url: Optional[str] = None
    target_goal_title: Optional[str] = None

    class Config:
        from_attributes = True


class FollowStats(BaseModel):
    follower_count: int
    following_count: int


class FollowCheckResponse(BaseModel):
    is_following: bool
    follow_id: Optional[UUID] = None
