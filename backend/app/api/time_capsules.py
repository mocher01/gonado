from uuid import UUID
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.time_capsule import (
    TimeCapsuleCreate, TimeCapsuleResponse, TimeCapsuleListResponse, TimeCapsuleOpenResponse
)
from app.models.time_capsule import TimeCapsule, CapsuleTriggerType
from app.models.goal import Goal
from app.models.user import User

router = APIRouter()


def _build_capsule_response(capsule: TimeCapsule) -> TimeCapsuleResponse:
    """Build TimeCapsuleResponse from model."""
    return TimeCapsuleResponse(
        id=capsule.id,
        sender_id=capsule.sender_id,
        recipient_id=capsule.recipient_id,
        goal_id=capsule.goal_id,
        message=capsule.message if capsule.is_opened else "[Sealed until triggered]",
        trigger_type=capsule.trigger_type,
        trigger_value=capsule.trigger_value,
        is_delivered=capsule.is_delivered,
        is_opened=capsule.is_opened,
        created_at=capsule.created_at,
        delivered_at=capsule.delivered_at,
        opened_at=capsule.opened_at,
        sender_username=capsule.sender.username if capsule.sender else None,
        sender_display_name=capsule.sender.display_name if capsule.sender else None,
        sender_avatar_url=capsule.sender.avatar_url if capsule.sender else None,
    )


@router.post("/goals/{goal_id}", response_model=TimeCapsuleResponse, status_code=status.HTTP_201_CREATED)
async def create_time_capsule(
    goal_id: UUID,
    data: TimeCapsuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bury a time capsule for a goal owner."""
    # Verify goal exists
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if goal.visibility != "public" and goal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot create capsules for private goals")

    # Validate trigger_value based on trigger_type
    if data.trigger_type == CapsuleTriggerType.INACTIVE_DAYS:
        try:
            days = int(data.trigger_value)
            if days < 1 or days > 365:
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="inactive_days requires a number between 1-365")

    capsule = TimeCapsule(
        sender_id=current_user.id,
        recipient_id=goal.user_id,
        goal_id=goal_id,
        message=data.message,
        trigger_type=data.trigger_type,
        trigger_value=data.trigger_value
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

    return _build_capsule_response(capsule)


@router.get("/goals/{goal_id}", response_model=TimeCapsuleListResponse)
async def get_goal_capsules(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get time capsules for a goal (only goal owner sees delivered ones)."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Only goal owner can see capsules
    if goal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the goal owner can view capsules")

    result = await db.execute(
        select(TimeCapsule)
        .options(selectinload(TimeCapsule.sender))
        .where(
            TimeCapsule.goal_id == goal_id,
            TimeCapsule.recipient_id == current_user.id,
            TimeCapsule.is_delivered == True
        )
        .order_by(TimeCapsule.delivered_at.desc())
    )
    capsules = result.scalars().all()

    unopened = sum(1 for c in capsules if not c.is_opened)

    return TimeCapsuleListResponse(
        capsules=[_build_capsule_response(c) for c in capsules],
        total=len(capsules),
        unopened_count=unopened
    )


@router.post("/{capsule_id}/open", response_model=TimeCapsuleOpenResponse)
async def open_time_capsule(
    capsule_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Open a delivered time capsule."""
    result = await db.execute(
        select(TimeCapsule)
        .options(selectinload(TimeCapsule.sender))
        .where(TimeCapsule.id == capsule_id)
    )
    capsule = result.scalar_one_or_none()
    if not capsule:
        raise HTTPException(status_code=404, detail="Time capsule not found")

    if capsule.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="This capsule is not for you")

    if not capsule.is_delivered:
        raise HTTPException(status_code=400, detail="This capsule has not been delivered yet")

    if capsule.is_opened:
        raise HTTPException(status_code=400, detail="Capsule already opened")

    capsule.is_opened = True
    capsule.opened_at = datetime.utcnow()
    await db.flush()

    return TimeCapsuleOpenResponse(
        capsule=_build_capsule_response(capsule),
        message="Time capsule opened!"
    )


@router.get("/my-sent", response_model=TimeCapsuleListResponse)
async def get_my_sent_capsules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get capsules you have sent to others."""
    result = await db.execute(
        select(TimeCapsule)
        .options(selectinload(TimeCapsule.sender), selectinload(TimeCapsule.goal))
        .where(TimeCapsule.sender_id == current_user.id)
        .order_by(TimeCapsule.created_at.desc())
    )
    capsules = result.scalars().all()

    # For sent capsules, show the message
    responses = []
    for c in capsules:
        resp = TimeCapsuleResponse(
            id=c.id,
            sender_id=c.sender_id,
            recipient_id=c.recipient_id,
            goal_id=c.goal_id,
            message=c.message,  # Show full message for sender
            trigger_type=c.trigger_type,
            trigger_value=c.trigger_value,
            is_delivered=c.is_delivered,
            is_opened=c.is_opened,
            created_at=c.created_at,
            delivered_at=c.delivered_at,
            opened_at=c.opened_at,
            sender_username=c.sender.username if c.sender else None,
            sender_display_name=c.sender.display_name if c.sender else None,
            sender_avatar_url=c.sender.avatar_url if c.sender else None,
        )
        responses.append(resp)

    return TimeCapsuleListResponse(
        capsules=responses,
        total=len(capsules),
        unopened_count=0
    )
