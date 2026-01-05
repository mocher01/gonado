from uuid import UUID
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.schemas.sacred_boost import (
    SacredBoostCreate, SacredBoostResponse, SacredBoostListResponse, SacredBoostStatus
)
from app.models.sacred_boost import SacredBoost
from app.models.goal import Goal
from app.models.user import User
from app.services.notifications import notification_service

router = APIRouter()

MAX_BOOSTS_PER_DAY = 3
XP_PER_BOOST = 50


def _get_current_year_month() -> int:
    """Get current year-month as integer YYYYMM (legacy support)."""
    today = date.today()
    return today.year * 100 + today.month


def _build_boost_response(boost: SacredBoost) -> SacredBoostResponse:
    """Build SacredBoostResponse from model."""
    return SacredBoostResponse(
        id=boost.id,
        giver_id=boost.giver_id,
        receiver_id=boost.receiver_id,
        goal_id=boost.goal_id,
        message=boost.message,
        xp_awarded=boost.xp_awarded,
        created_at=boost.created_at,
        giver_username=boost.giver.username if boost.giver else None,
        giver_display_name=boost.giver.display_name if boost.giver else None,
        giver_avatar_url=boost.giver.avatar_url if boost.giver else None,
    )


@router.post("/goals/{goal_id}", response_model=SacredBoostResponse, status_code=status.HTTP_201_CREATED)
async def give_sacred_boost(
    goal_id: UUID,
    boost_data: Optional[SacredBoostCreate] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Give a sacred boost to a goal (limited to 3 per goal per day)."""
    # Verify goal exists
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if goal.visibility != "public" and goal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot boost private goals")

    # Cannot boost your own goal
    if goal.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot boost your own goal")

    today = date.today()

    # Check how many boosts given today for this specific goal
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.goal_id == goal_id,
            SacredBoost.boost_date == today
        )
    )
    boosts_today_for_goal = result.scalar() or 0

    if boosts_today_for_goal >= MAX_BOOSTS_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail=f"You have already given {MAX_BOOSTS_PER_DAY} sacred boosts to this goal today. Try again tomorrow!"
        )

    # Get optional message from request body
    message = boost_data.message if boost_data else None

    # Create the boost
    boost = SacredBoost(
        giver_id=current_user.id,
        receiver_id=goal.user_id,
        goal_id=goal_id,
        message=message,
        boost_date=today,
        year_month=_get_current_year_month(),  # Legacy field
        xp_awarded=XP_PER_BOOST
    )
    db.add(boost)

    # Award XP to receiver
    result = await db.execute(
        select(User).where(User.id == goal.user_id)
    )
    receiver = result.scalar_one()
    receiver.xp += XP_PER_BOOST

    await db.flush()

    # Create notification for goal owner
    giver_name = current_user.display_name or current_user.username
    notification_title = f"{giver_name} gave you a Sacred Boost!"
    notification_message = f"Your goal \"{goal.title}\" received a Sacred Boost (+{XP_PER_BOOST} XP)"
    if message:
        notification_message += f": \"{message}\""

    await notification_service.create_notification(
        db=db,
        user_id=goal.user_id,
        notification_type="sacred_boost",
        title=notification_title,
        message=notification_message,
        data={
            "goal_id": str(goal_id),
            "goal_title": goal.title,
            "giver_id": str(current_user.id),
            "giver_username": current_user.username,
            "boost_message": message,
            "xp_awarded": XP_PER_BOOST
        }
    )

    # Send real-time notification
    await notification_service.send_realtime_notification(
        user_id=goal.user_id,
        notification_type="sacred_boost",
        title=notification_title,
        message=notification_message,
        data={
            "goal_id": str(goal_id),
            "giver_username": current_user.username,
            "boost_message": message
        }
    )

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(SacredBoost)
        .options(selectinload(SacredBoost.giver))
        .where(SacredBoost.id == boost.id)
    )
    boost = result.scalar_one()

    return _build_boost_response(boost)


@router.get("/goals/{goal_id}", response_model=SacredBoostListResponse)
async def get_goal_boosts(
    goal_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all sacred boosts for a goal."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    result = await db.execute(
        select(SacredBoost)
        .options(selectinload(SacredBoost.giver))
        .where(SacredBoost.goal_id == goal_id)
        .order_by(SacredBoost.created_at.desc())
    )
    boosts = result.scalars().all()

    return SacredBoostListResponse(
        boosts=[_build_boost_response(b) for b in boosts],
        total=len(boosts)
    )


@router.get("/status", response_model=SacredBoostStatus)
async def get_boost_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's boost status for today."""
    today = date.today()

    # Count boosts given today (across all goals)
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.boost_date == today
        )
    )
    given_today = result.scalar() or 0

    # Count total boosts received
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.receiver_id == current_user.id
        )
    )
    received_total = result.scalar() or 0

    return SacredBoostStatus(
        boosts_remaining_today=MAX_BOOSTS_PER_DAY - given_today,
        boosts_given_today=given_today,
        max_boosts_per_day=MAX_BOOSTS_PER_DAY,
        boosts_received_total=received_total,
        already_boosted_goal=False  # This field is goal-specific, use check endpoint
    )


@router.get("/check/{goal_id}")
async def check_can_boost(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if user can boost a specific goal today."""
    today = date.today()

    # Check daily limit for this specific goal
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.goal_id == goal_id,
            SacredBoost.boost_date == today
        )
    )
    boosts_today_for_goal = result.scalar() or 0

    # Check total boosts today (across all goals) for status info
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.boost_date == today
        )
    )
    total_boosts_today = result.scalar() or 0

    can_boost = boosts_today_for_goal < MAX_BOOSTS_PER_DAY
    boosts_remaining_for_goal = MAX_BOOSTS_PER_DAY - boosts_today_for_goal

    return {
        "can_boost": can_boost,
        "boosts_today_for_goal": boosts_today_for_goal,
        "boosts_remaining_for_goal": boosts_remaining_for_goal,
        "total_boosts_today": total_boosts_today,
        "max_per_day": MAX_BOOSTS_PER_DAY,
        "reason": (
            f"You've reached the daily limit ({MAX_BOOSTS_PER_DAY}) for this goal"
            if not can_boost else None
        )
    }
