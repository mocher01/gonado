from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from enum import Enum
from app.models.comment import CommentTargetType


class CommentSortOrder(str, Enum):
    RECENT = "recent"
    OLDEST = "oldest"


class CommentCreate(BaseModel):
    target_type: CommentTargetType
    target_id: UUID
    content: str
    parent_id: Optional[UUID] = None


class CommentUpdate(BaseModel):
    content: str


class CommentUserInfo(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]

    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    id: UUID
    user_id: UUID
    target_type: CommentTargetType
    target_id: UUID
    parent_id: Optional[UUID]
    content: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    user: CommentUserInfo

    class Config:
        from_attributes = True


class CommentWithReplies(CommentResponse):
    replies: List["CommentWithReplies"] = []

    class Config:
        from_attributes = True


# Required for forward reference
CommentWithReplies.model_rebuild()


class CommentListResponse(BaseModel):
    """Paginated comment list response."""
    total: int
    comments: List[CommentWithReplies]
    has_more: bool
    limit: int
    offset: int
