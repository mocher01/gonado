from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.update import UpdateType


class UpdateCreate(BaseModel):
    content: str
    media_urls: List[str] = []
    update_type: UpdateType = UpdateType.PROGRESS


class UpdateResponse(BaseModel):
    id: UUID
    node_id: UUID
    user_id: UUID
    content: str
    media_urls: List[str]
    update_type: UpdateType
    created_at: datetime

    class Config:
        from_attributes = True
