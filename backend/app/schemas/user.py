from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional


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


class UserPublicResponse(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    xp: int
    level: int
    streak_days: int

    class Config:
        from_attributes = True
