from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.node import NodeCreate, NodeUpdate, NodeResponse, NodeStatusUpdate
from app.models.node import Node, NodeStatus
from app.models.goal import Goal
from app.models.user import User
from app.services.gamification import gamification_service, XP_REWARDS
from app.services.notifications import notification_service

router = APIRouter()


@router.post("", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    goal_id: UUID,
    node_data: NodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new node for a goal."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    node = Node(
        goal_id=goal_id,
        **node_data.model_dump()
    )
    db.add(node)
    await db.flush()
    return node


@router.get("/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific node."""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: UUID,
    node_data: NodeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a node."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    for field, value in node_data.model_dump(exclude_unset=True).items():
        setattr(node, field, value)

    await db.flush()
    return node


@router.put("/{node_id}/status", response_model=NodeResponse)
async def update_node_status(
    node_id: UUID,
    status_data: NodeStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a node's status."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    node.status = status_data.status
    await db.flush()
    return node


@router.post("/{node_id}/complete", response_model=NodeResponse)
async def complete_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a node as completed."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    if node.status != NodeStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Node is not active")

    # Complete the node
    node.status = NodeStatus.COMPLETED
    node.completed_at = datetime.utcnow()

    # Award XP
    await gamification_service.award_xp(
        db, current_user.id, XP_REWARDS["complete_node"], f"Completed node: {node.title}"
    )

    # Update streak
    await gamification_service.update_streak(db, current_user.id)

    # Unlock next node
    result = await db.execute(
        select(Node).where(
            Node.goal_id == node.goal_id,
            Node.order == node.order + 1
        )
    )
    next_node = result.scalar_one_or_none()
    if next_node:
        next_node.status = NodeStatus.ACTIVE

    # Check if all nodes complete
    result = await db.execute(
        select(Node).where(
            Node.goal_id == node.goal_id,
            Node.status != NodeStatus.COMPLETED
        )
    )
    incomplete_nodes = result.scalars().all()
    if not incomplete_nodes:
        # Goal completed!
        goal_result = await db.execute(select(Goal).where(Goal.id == node.goal_id))
        goal = goal_result.scalar_one()
        goal.status = "completed"
        await gamification_service.award_xp(
            db, current_user.id, XP_REWARDS["complete_goal"], f"Completed goal: {goal.title}"
        )

    # Send notification
    await notification_service.broadcast_to_goal_followers(
        node.goal_id,
        "node_completed",
        f"{current_user.display_name} completed a milestone!",
        node.title,
        {"node_id": str(node.id), "node_title": node.title}
    )

    await db.flush()
    return node


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a node."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    await db.delete(node)
