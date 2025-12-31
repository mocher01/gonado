from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class ResourceItem(BaseModel):
    """A single resource in a drop."""
    url: str
    title: str
    type: str = "link"  # link, file, voice


class ResourceDropCreate(BaseModel):
    """Create a resource drop on a node."""
    node_id: UUID
    message: Optional[str] = None
    resources: List[ResourceItem] = []


class ResourceDropResponse(BaseModel):
    """Response for a resource drop."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    node_id: UUID
    message: Optional[str] = None
    resources: List[Any] = []
    is_opened: bool
    created_at: datetime
    opened_at: Optional[datetime] = None

    # Dropper info
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ResourceDropListResponse(BaseModel):
    """List of resource drops on a node."""
    drops: List[ResourceDropResponse]
    total: int
    unopened_count: int


class NodeResourceSummary(BaseModel):
    """Summary of resources on a node (for map display)."""
    node_id: UUID
    total_drops: int
    unopened_drops: int
    contributors: List[str] = []  # List of usernames
