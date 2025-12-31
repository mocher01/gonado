from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.goal_share import SharePermission, ShareStatus


class GoalShareCreate(BaseModel):
    shared_with_user_id: UUID
    permission: SharePermission = SharePermission.VIEW


class GoalShareUpdate(BaseModel):
    status: ShareStatus


class UserBasicInfo(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


class GoalBasicInfo(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    category: Optional[str]
    world_theme: str

    class Config:
        from_attributes = True


class GoalShareResponse(BaseModel):
    id: UUID
    goal_id: UUID
    shared_with_user_id: UUID
    invited_by_id: UUID
    permission: SharePermission
    status: ShareStatus
    created_at: datetime
    shared_with_user: Optional[UserBasicInfo] = None
    invited_by: Optional[UserBasicInfo] = None

    class Config:
        from_attributes = True


class SharedGoalResponse(BaseModel):
    id: UUID
    goal_id: UUID
    shared_with_user_id: UUID
    invited_by_id: UUID
    permission: SharePermission
    status: ShareStatus
    created_at: datetime
    goal: Optional[GoalBasicInfo] = None
    invited_by: Optional[UserBasicInfo] = None

    class Config:
        from_attributes = True


class GoalShareListResponse(BaseModel):
    shares: List[GoalShareResponse]
    total: int


class SharedWithMeListResponse(BaseModel):
    shares: List[SharedGoalResponse]
    total: int
