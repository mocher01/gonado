from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.interaction import InteractionType, TargetType


class CommentCreate(BaseModel):
    target_type: TargetType
    target_id: UUID
    content: str


class ReactionCreate(BaseModel):
    target_type: TargetType
    target_id: UUID
    reaction_type: str


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
