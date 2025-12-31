from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ProphecyCreate(BaseModel):
    """Create a new prophecy (prediction)."""
    goal_id: UUID
    predicted_date: date


class ProphecyResponse(BaseModel):
    """Response for a single prophecy."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    goal_id: UUID
    predicted_date: date
    accuracy_days: Optional[int] = None
    created_at: datetime

    # Populated user info
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ProphecyListResponse(BaseModel):
    """List of prophecies for a goal."""
    prophecies: List[ProphecyResponse]
    total: int


class ProphecyBoardResponse(BaseModel):
    """Full prophecy board with stats."""
    prophecies: List[ProphecyResponse]
    total_predictions: int
    earliest_prediction: Optional[date] = None
    latest_prediction: Optional[date] = None
    average_prediction: Optional[date] = None

    # Filled in after goal completion
    actual_completion: Optional[date] = None
    closest_prophet: Optional[ProphecyResponse] = None
