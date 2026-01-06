from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, validator
from app.models.time_capsule import UnlockType


class TimeCapsuleCreate(BaseModel):
    """Create a time capsule."""
    content: str
    unlock_type: UnlockType
    unlock_date: Optional[datetime] = None  # Required if unlock_type is DATE

    @validator('unlock_date')
    def validate_unlock_date(cls, v, values):
        if values.get('unlock_type') == UnlockType.DATE and not v:
            raise ValueError('unlock_date is required when unlock_type is DATE')
        if values.get('unlock_type') == UnlockType.NODE_COMPLETE and v:
            raise ValueError('unlock_date should not be provided when unlock_type is NODE_COMPLETE')
        return v


class TimeCapsuleUpdate(BaseModel):
    """Update a time capsule (before unlock)."""
    content: Optional[str] = None
    unlock_type: Optional[UnlockType] = None
    unlock_date: Optional[datetime] = None


class TimeCapsuleResponse(BaseModel):
    """Response for a time capsule."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sender_id: UUID
    node_id: UUID
    content: str  # Hidden if locked and viewer is owner
    unlock_type: UnlockType
    unlock_date: Optional[datetime] = None
    is_unlocked: bool
    unlocked_at: Optional[datetime] = None
    created_at: datetime

    # Sender info
    sender_username: Optional[str] = None
    sender_display_name: Optional[str] = None
    sender_avatar_url: Optional[str] = None


class TimeCapsuleListResponse(BaseModel):
    """List of time capsules."""
    capsules: List[TimeCapsuleResponse]
    total: int
    locked_count: int  # Number of capsules still locked
