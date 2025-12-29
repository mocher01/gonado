from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any


class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    message: Optional[str]
    data: Dict[str, Any]
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    read: bool = True
