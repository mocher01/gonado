from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any


class BadgeResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    criteria: Dict[str, Any]
    xp_reward: int

    class Config:
        from_attributes = True


class UserBadgeResponse(BaseModel):
    badge: BadgeResponse
    earned_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    xp: int
    level: int


class XPTransactionResponse(BaseModel):
    id: UUID
    amount: int
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True
