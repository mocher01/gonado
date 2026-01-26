from uuid import UUID
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.time_capsule import (
    TimeCapsuleCreate, TimeCapsuleUpdate, TimeCapsuleResponse, TimeCapsuleListResponse
)
from app.models.time_capsule import TimeCapsule, UnlockType
from app.models.node import Node
from app.models.goal import Goal
from app.models.user import User
from app.services.notifications import notification_service

router = APIRouter()


def _build_capsule_response(
    capsule: TimeCapsule,
    viewer: User,
    goal_owner_id: UUID,
    hide_content: bool = False
) -> TimeCapsuleResponse:
    """
    Build TimeCapsuleResponse from model.
    Hides content if locked and viewer is the goal owner (not the sender).
    """
    is_owner = viewer.id == goal_owner_id
    is_sender = viewer.id == capsule.sender_id

    # Owner sees count but not content until unlocked
    # Sender always sees their own content
    content = capsule.content
    if not capsule.is_unlocked and is_owner and not is_sender:
        content = "[Locked until unlocked]"

    return TimeCapsuleResponse(
        id=capsule.id,
        sender_id=capsule.sender_id,
        node_id=capsule.node_id,
        content=content,
        unlock_type=capsule.unlock_type,
        unlock_date=capsule.unlock_date,
        is_unlocked=capsule.is_unlocked,
        unlocked_at=capsule.unlocked_at,
        created_at=capsule.created_at,
        sender_username=capsule.sender.username if capsule.sender else None,
        sender_display_name=capsule.sender.display_name if capsule.sender else None,
        sender_avatar_url=capsule.sender.avatar_url if capsule.sender else None,
    )


@router.post("/nodes/{node_id}", response_model=TimeCapsuleResponse, status_code=status.HTTP_201_CREATED)
async def create_time_capsule(
    node_id: UUID,
    data: TimeCapsuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a time capsule for a node. Must not be the goal owner."""
    # Get node and goal info
    result = await db.execute(
        select(Node, Goal)
        .join(Goal, Node.goal_id == Goal.id)
        .where(Node.id == node_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Node not found")

    node, goal = row

    # Cannot create capsule for your own goal
    if goal.user_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create time capsules for your own goals"
        )

    # Check goal visibility
    if goal.visibility == "private":
        raise HTTPException(
            status_code=403,
            detail="Cannot create capsules for private goals"
        )

    # Validate unlock_date if DATE type
    if data.unlock_type == UnlockType.DATE:
        if not data.unlock_date:
            raise HTTPException(
                status_code=400,
                detail="unlock_date is required when unlock_type is DATE"
            )
        if data.unlock_date <= datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="unlock_date must be in the future"
            )

    capsule = TimeCapsule(
        sender_id=current_user.id,
        node_id=node_id,
        content=data.content,
        unlock_type=data.unlock_type,
        unlock_date=data.unlock_date if data.unlock_type == UnlockType.DATE else None
    )
    db.add(capsule)
    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(TimeCapsule)
        .options(selectinload(TimeCapsule.sender))
        .where(TimeCapsule.id == capsule.id)
    )
    capsule = result.scalar_one()

    return _build_capsule_response(capsule, current_user, goal.user_id)


@router.get("/nodes/{node_id}", response_model=TimeCapsuleListResponse)
async def get_node_capsules(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get time capsules for a node.
    - Goal owner sees capsule count but NOT content until unlocked
    - Supporters see their own capsules with full content
    """
    # Get node and goal info
    result = await db.execute(
        select(Node, Goal)
        .join(Goal, Node.goal_id == Goal.id)
        .where(Node.id == node_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Node not found")

    node, goal = row

    is_owner = goal.user_id == current_user.id

    # Get capsules
    result = await db.execute(
        select(TimeCapsule)
        .options(selectinload(TimeCapsule.sender))
        .where(TimeCapsule.node_id == node_id)
        .order_by(TimeCapsule.created_at.desc())
    )
    capsules = result.scalars().all()

    locked_count = sum(1 for c in capsules if not c.is_unlocked)

    return TimeCapsuleListResponse(
        capsules=[_build_capsule_response(c, current_user, goal.user_id) for c in capsules],
        total=len(capsules),
        locked_count=locked_count
    )


@router.get("/{capsule_id}", response_model=TimeCapsuleResponse)
async def get_time_capsule(
    capsule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single time capsule."""
    result = await db.execute(
        select(TimeCapsule, Goal)
        .join(Node, TimeCapsule.node_id == Node.id)
        .join(Goal, Node.goal_id == Goal.id)
        .options(selectinload(TimeCapsule.sender))
        .where(TimeCapsule.id == capsule_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Time capsule not found")

    capsule, goal = row

    return _build_capsule_response(capsule, current_user, goal.user_id)


@router.put("/{capsule_id}", response_model=TimeCapsuleResponse)
async def update_time_capsule(
    capsule_id: UUID,
    data: TimeCapsuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a time capsule. Only sender can edit, and only before unlock."""
    result = await db.execute(
        select(TimeCapsule, Goal)
        .join(Node, TimeCapsule.node_id == Node.id)
        .join(Goal, Node.goal_id == Goal.id)
        .options(selectinload(TimeCapsule.sender))
        .where(TimeCapsule.id == capsule_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Time capsule not found")

    capsule, goal = row

    # Only sender can edit
    if capsule.sender_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the sender can edit this capsule"
        )

    # Cannot edit after unlock
    if capsule.is_unlocked:
        raise HTTPException(
            status_code=400,
            detail="Cannot edit capsule after it has been unlocked"
        )

    # Update fields
    if data.content is not None:
        capsule.content = data.content
    if data.unlock_type is not None:
        capsule.unlock_type = data.unlock_type
    if data.unlock_date is not None:
        capsule.unlock_date = data.unlock_date

    await db.flush()

    return _build_capsule_response(capsule, current_user, goal.user_id)


@router.delete("/{capsule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_capsule(
    capsule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a time capsule. Only sender can delete, and only before unlock."""
    result = await db.execute(
        select(TimeCapsule)
        .where(TimeCapsule.id == capsule_id)
    )
    capsule = result.scalar_one_or_none()
    if not capsule:
        raise HTTPException(status_code=404, detail="Time capsule not found")

    # Only sender can delete
    if capsule.sender_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the sender can delete this capsule"
        )

    # Cannot delete after unlock
    if capsule.is_unlocked:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete capsule after it has been unlocked"
        )

    await db.delete(capsule)


@router.post("/{capsule_id}/unlock", response_model=TimeCapsuleResponse)
async def unlock_time_capsule(
    capsule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manual unlock trigger for testing. In production, this is triggered automatically."""
    result = await db.execute(
        select(TimeCapsule, Goal)
        .join(Node, TimeCapsule.node_id == Node.id)
        .join(Goal, Node.goal_id == Goal.id)
        .options(selectinload(TimeCapsule.sender))
        .where(TimeCapsule.id == capsule_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Time capsule not found")

    capsule, goal = row

    if capsule.is_unlocked:
        raise HTTPException(status_code=400, detail="Capsule already unlocked")

    capsule.is_unlocked = True
    capsule.unlocked_at = datetime.utcnow()
    await db.flush()

    # Notify the goal owner that a capsule was unlocked
    sender_name = capsule.sender.display_name or capsule.sender.username
    await notification_service.create_notification(
        db=db,
        user_id=goal.user_id,
        notification_type="capsule_unlocked",
        title="A time capsule has been unlocked!",
        message=f"{sender_name} left you a message...",
        data={"capsule_id": str(capsule.id), "node_id": str(capsule.node_id)}
    )

    return _build_capsule_response(capsule, current_user, goal.user_id)
