from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    display_name: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    xp: int
    level: int
    streak_days: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserStatsPublic(BaseModel):
    """Public user stats for profile display."""
    goals_created: int
    goals_completed: int
    achiever_score: int
    supporter_score: int
    comments_given: int
    reactions_given: int
    followers_count: int
    following_count: int

    class Config:
        from_attributes = True


class BadgePublic(BaseModel):
    """Badge info for public display."""
    id: UUID
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    category: str
    rarity: str
    earned_at: datetime

    class Config:
        from_attributes = True


class UserPublicResponse(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    xp: int
    level: int
    streak_days: int
    created_at: datetime
    stats: Optional[UserStatsPublic] = None
    badges: List[BadgePublic] = []

    class Config:
        from_attributes = True
