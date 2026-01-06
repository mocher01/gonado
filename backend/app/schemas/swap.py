from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.swap import SwapStatus


class SwapCreate(BaseModel):
    """Schema for proposing a new swap."""
    receiver_id: UUID
    proposer_goal_id: UUID
    proposer_node_id: Optional[UUID] = None
    message: Optional[str] = Field(None, max_length=500)


class SwapAccept(BaseModel):
    """Schema for accepting a swap (includes receiver's goal)."""
    receiver_goal_id: UUID
    receiver_node_id: Optional[UUID] = None


class SwapResponse(BaseModel):
    """Schema for swap response."""
    id: UUID
    proposer_id: UUID
    receiver_id: UUID
    proposer_goal_id: UUID
    proposer_node_id: Optional[UUID] = None
    receiver_goal_id: Optional[UUID] = None
    receiver_node_id: Optional[UUID] = None
    message: Optional[str] = None
    status: SwapStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SwapListResponse(BaseModel):
    """Schema for list of swaps."""
    swaps: List[SwapResponse]
    total: int
