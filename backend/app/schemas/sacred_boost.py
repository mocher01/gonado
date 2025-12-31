from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class SacredBoostCreate(BaseModel):
    """Give a sacred boost to a goal."""
    goal_id: UUID


class SacredBoostResponse(BaseModel):
    """Response for a sacred boost."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    giver_id: UUID
    receiver_id: UUID
    goal_id: UUID
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
    """User's boost status for the month."""
    boosts_remaining: int
    boosts_given_this_month: int
    max_boosts_per_month: int = 3
    boosts_received_total: int
    next_reset_date: str  # First of next month
