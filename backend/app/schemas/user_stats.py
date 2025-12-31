from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserStatsResponse(BaseModel):
    id: UUID
    user_id: UUID
    goals_created: int
    goals_completed: int
    nodes_completed: int
    comments_given: int
    reactions_given: int
    comments_received: int
    reactions_received: int
    followers_count: int
    following_count: int
    achiever_score: int
    supporter_score: int
    updated_at: datetime

    class Config:
        from_attributes = True


class UserReputation(BaseModel):
    user_id: UUID
    achiever_score: int
    supporter_score: int
    total_score: int
    achiever_level: str
    supporter_level: str
    achiever_title: str
    supporter_title: str
    overall_title: str
