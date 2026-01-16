from uuid import UUID
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.schemas.resource_drop import (
    ResourceDropCreate, ResourceDropResponse, ResourceDropListResponse, NodeResourceSummary
)
from app.models.resource_drop import ResourceDrop
from app.models.node import Node
from app.models.goal import Goal
from app.models.user import User
from app.services.notifications import notification_service

router = APIRouter()


def _build_drop_response(drop: ResourceDrop) -> ResourceDropResponse:
    """Build ResourceDropResponse from model."""
    return ResourceDropResponse(
        id=drop.id,
        user_id=drop.user_id,
        node_id=drop.node_id,
        message=drop.message,
        resources=drop.resources or [],
        is_opened=drop.is_opened,
        created_at=drop.created_at,
        opened_at=drop.opened_at,
        username=drop.user.username if drop.user else None,
        display_name=drop.user.display_name if drop.user else None,
        avatar_url=drop.user.avatar_url if drop.user else None,
    )


@router.post("/nodes/{node_id}", response_model=ResourceDropResponse, status_code=status.HTTP_201_CREATED)
async def create_resource_drop(
    node_id: UUID,
    data: ResourceDropCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Drop resources on a node to help the goal owner."""
    # Verify node exists and get goal
    result = await db.execute(
        select(Node).options(selectinload(Node.goal)).where(Node.id == node_id)
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    goal = node.goal
    if goal.visibility != "public" and goal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot drop resources on private goals")

    # Cannot drop on your own goal
    if goal.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot drop resources on your own goal")

    # Must have message or resources
    if not data.message and not data.resources:
        raise HTTPException(status_code=400, detail="Must provide a message or resources")

    drop = ResourceDrop(
        user_id=current_user.id,
        node_id=node_id,
        message=data.message,
        resources=[r.model_dump() for r in data.resources] if data.resources else []
    )
    db.add(drop)
    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(ResourceDrop)
        .options(selectinload(ResourceDrop.user))
        .where(ResourceDrop.id == drop.id)
    )
    drop = result.scalar_one()

    # Create notification for goal owner
    await notification_service.create_notification(
        db=db,
        user_id=goal.user_id,
        notification_type="resource_drop",
        title=f"{current_user.display_name or current_user.username} dropped a resource",
        message=f"New resource on '{node.title}': {data.message or 'Check it out!'}",
        data={
            "drop_id": str(drop.id),
            "node_id": str(node_id),
            "node_title": node.title,
            "goal_id": str(goal.id),
            "goal_title": goal.title,
            "dropper_username": current_user.username,
        }
    )

    # Send real-time notification
    await notification_service.send_realtime_notification(
        user_id=goal.user_id,
        notification_type="resource_drop",
        title=f"{current_user.display_name or current_user.username} dropped a resource",
        message=f"New resource on '{node.title}'",
        data={
            "drop_id": str(drop.id),
            "node_id": str(node_id),
            "goal_id": str(goal.id),
        }
    )

    return _build_drop_response(drop)


@router.get("/nodes/{node_id}", response_model=ResourceDropListResponse)
async def get_node_drops(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all resource drops on a node."""
    # Verify node exists
    result = await db.execute(
        select(Node).options(selectinload(Node.goal)).where(Node.id == node_id)
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Only goal owner can see full drops
    is_owner = node.goal.user_id == current_user.id

    result = await db.execute(
        select(ResourceDrop)
        .options(selectinload(ResourceDrop.user))
        .where(ResourceDrop.node_id == node_id)
        .order_by(ResourceDrop.created_at.desc())
    )
    drops = result.scalars().all()

    unopened = sum(1 for d in drops if not d.is_opened)

    return ResourceDropListResponse(
        drops=[_build_drop_response(d) for d in drops],
        total=len(drops),
        unopened_count=unopened if is_owner else 0
    )


@router.post("/{drop_id}/open", response_model=ResourceDropResponse)
async def open_resource_drop(
    drop_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Open a resource drop (mark as viewed)."""
    result = await db.execute(
        select(ResourceDrop)
        .options(selectinload(ResourceDrop.user), selectinload(ResourceDrop.node))
        .where(ResourceDrop.id == drop_id)
    )
    drop = result.scalar_one_or_none()
    if not drop:
        raise HTTPException(status_code=404, detail="Resource drop not found")

    # Get goal to verify ownership
    result = await db.execute(
        select(Node).options(selectinload(Node.goal)).where(Node.id == drop.node_id)
    )
    node = result.scalar_one()

    if node.goal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the goal owner can open resource drops")

    if not drop.is_opened:
        drop.is_opened = True
        drop.opened_at = datetime.utcnow()
        await db.flush()

    return _build_drop_response(drop)


@router.get("/goals/{goal_id}/summary", response_model=list[NodeResourceSummary])
async def get_goal_resource_summary(
    goal_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a summary of resource drops for all nodes in a goal (for map display)."""
    # Verify goal exists
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get all nodes for this goal
    result = await db.execute(
        select(Node).where(Node.goal_id == goal_id)
    )
    nodes = result.scalars().all()
    node_ids = [n.id for n in nodes]

    if not node_ids:
        return []

    # Get drop counts per node
    result = await db.execute(
        select(ResourceDrop)
        .options(selectinload(ResourceDrop.user))
        .where(ResourceDrop.node_id.in_(node_ids))
    )
    drops = result.scalars().all()

    # Group by node
    node_drops = {}
    for drop in drops:
        if drop.node_id not in node_drops:
            node_drops[drop.node_id] = []
        node_drops[drop.node_id].append(drop)

    is_owner = current_user and goal.user_id == current_user.id

    summaries = []
    for node_id in node_ids:
        node_drop_list = node_drops.get(node_id, [])
        contributors = list(set(d.user.username for d in node_drop_list if d.user))

        summaries.append(NodeResourceSummary(
            node_id=node_id,
            total_drops=len(node_drop_list),
            unopened_drops=sum(1 for d in node_drop_list if not d.is_opened) if is_owner else 0,
            contributors=contributors[:5]  # Limit to 5 usernames
        ))

    return summaries


@router.get("/goals/{goal_id}/nodes", response_model=dict)
async def get_goal_nodes_resources(
    goal_id: UUID,
    limit: int = 2,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get recent resource drops for all nodes in a goal (for node card display)."""
    # Verify goal exists
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get all nodes for this goal
    result = await db.execute(
        select(Node).where(Node.goal_id == goal_id)
    )
    nodes = result.scalars().all()
    node_ids = [n.id for n in nodes]

    if not node_ids:
        return {"goal_id": str(goal_id), "nodes": {}}

    # Get all drops with user info
    result = await db.execute(
        select(ResourceDrop)
        .options(selectinload(ResourceDrop.user))
        .where(ResourceDrop.node_id.in_(node_ids))
        .order_by(ResourceDrop.created_at.desc())
    )
    drops = result.scalars().all()

    # Group by node and get recent resources
    nodes_data = {}
    for node_id in node_ids:
        node_drops = [d for d in drops if d.node_id == node_id]
        recent_resources = []
        for drop in node_drops[:limit]:
            for resource in (drop.resources or [])[:1]:  # First resource from each drop
                recent_resources.append({
                    "id": str(drop.id),
                    "title": resource.get("title", "Untitled"),
                    "type": resource.get("type", "link"),
                    "url": resource.get("url", ""),
                    "dropper": drop.user.username if drop.user else "unknown",
                })
                if len(recent_resources) >= limit:
                    break
            if len(recent_resources) >= limit:
                break

        nodes_data[str(node_id)] = {
            "node_id": str(node_id),
            "resources_count": len(node_drops),
            "recent_resources": recent_resources,
        }

    return {"goal_id": str(goal_id), "nodes": nodes_data}
