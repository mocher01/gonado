from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum


class BadgeCategoryEnum(str, Enum):
    ACHIEVEMENT = "achievement"
    SOCIAL = "social"
    STREAK = "streak"
    MILESTONE = "milestone"
    SPECIAL = "special"


class BadgeRarityEnum(str, Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class BadgeCreate(BaseModel):
    """Schema for creating a badge (admin only)."""
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    criteria: Dict[str, Any] = {}
    xp_reward: int = 0
    category: BadgeCategoryEnum = BadgeCategoryEnum.ACHIEVEMENT
    rarity: BadgeRarityEnum = BadgeRarityEnum.COMMON


class BadgeUpdate(BaseModel):
    """Schema for updating a badge (admin only)."""
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    criteria: Optional[Dict[str, Any]] = None
    xp_reward: Optional[int] = None
    category: Optional[BadgeCategoryEnum] = None
    rarity: Optional[BadgeRarityEnum] = None


class BadgeBase(BaseModel):
    """Base badge response schema."""
    id: UUID
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    criteria: Dict[str, Any]
    xp_reward: int
    category: BadgeCategoryEnum
    rarity: BadgeRarityEnum
    created_at: datetime

    class Config:
        from_attributes = True


class BadgeResponse(BadgeBase):
    """Badge response with earned status for current user."""
    earned: bool = False
    earned_at: Optional[datetime] = None


class UserBadgeResponse(BaseModel):
    """User's earned badge with earned_at timestamp."""
    id: UUID
    badge: BadgeBase
    earned_at: datetime

    class Config:
        from_attributes = True


class BadgeProgress(BaseModel):
    """Progress toward earning a badge."""
    badge: BadgeBase
    progress: float  # 0.0 to 1.0
    current_value: int
    target_value: int
    progress_description: str  # e.g., "3 of 5 goals completed"


class BadgeListResponse(BaseModel):
    """List of badges with optional earned status."""
    badges: List[BadgeResponse]
    total: int


class NewlyAwardedBadge(BaseModel):
    """A badge that was just awarded to a user."""
    badge: BadgeBase
    xp_awarded: int
    earned_at: datetime
