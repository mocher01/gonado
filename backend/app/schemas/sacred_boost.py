from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class SacredBoostCreate(BaseModel):
    """Give a sacred boost to a goal."""
    message: Optional[str] = Field(None, max_length=500, description="Optional encouragement message")


class SacredBoostResponse(BaseModel):
    """Response for a sacred boost."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    giver_id: UUID
    receiver_id: UUID
    goal_id: UUID
    message: Optional[str] = None
    xp_awarded: int
    created_at: datetime

    # Giver info
    giver_username: Optional[str] = None
    giver_display_name: Optional[str] = None
    giver_avatar_url: Optional[str] = None


class SacredBoostListResponse(BaseModel):
    """List of boosts on a goal."""
    boosts: List[SacredBoostResponse]
    total: int


class SacredBoostStatus(BaseModel):
    """User's boost status for the day/goal."""
    boosts_remaining_today: int
    boosts_given_today: int
    max_boosts_per_day: int = 3
    boosts_received_total: int
    already_boosted_goal: bool = False
