from uuid import UUID
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.time_capsule import CapsuleTriggerType


class TimeCapsuleCreate(BaseModel):
    """Create a time capsule."""
    goal_id: UUID
    message: str
    trigger_type: CapsuleTriggerType
    trigger_value: Optional[str] = None  # Depends on trigger_type


class TimeCapsuleResponse(BaseModel):
    """Response for a time capsule."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sender_id: UUID
    recipient_id: UUID
    goal_id: UUID
    message: str
    trigger_type: CapsuleTriggerType
    trigger_value: Optional[str] = None
    is_delivered: bool
    is_opened: bool
    created_at: datetime
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None

    # Sender info
    sender_username: Optional[str] = None
    sender_display_name: Optional[str] = None
    sender_avatar_url: Optional[str] = None


class TimeCapsuleListResponse(BaseModel):
    """List of time capsules."""
    capsules: List[TimeCapsuleResponse]
    total: int
    unopened_count: int


class TimeCapsuleOpenResponse(BaseModel):
    """Response when opening a time capsule."""
    capsule: TimeCapsuleResponse
    message: str = "Time capsule opened!"
