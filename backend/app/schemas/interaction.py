from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict
from app.models.interaction import InteractionType, TargetType, ReactionType


class CommentCreate(BaseModel):
    target_type: TargetType
    target_id: UUID
    content: str


class ReactionCreate(BaseModel):
    target_type: TargetType
    target_id: UUID
    reaction_type: ReactionType


class InteractionResponse(BaseModel):
    id: UUID
    user_id: UUID
    target_type: TargetType
    target_id: UUID
    interaction_type: InteractionType
    content: Optional[str]
    reaction_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class InteractionWithUserResponse(BaseModel):
    """Interaction response with user details included."""
    id: UUID
    user_id: UUID
    target_type: TargetType
    target_id: UUID
    interaction_type: InteractionType
    content: Optional[str]
    reaction_type: Optional[str]
    created_at: datetime
    user_username: str
    user_display_name: Optional[str]
    user_avatar_url: Optional[str]

    class Config:
        from_attributes = True


class ReactionSummary(BaseModel):
    """Summary of reactions with counts per reaction type."""
    total_count: int
    counts: Dict[str, int]
    user_reactions: list[str] = []  # User can have multiple reactions
