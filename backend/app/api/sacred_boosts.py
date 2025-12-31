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

router = APIRouter()

MAX_BOOSTS_PER_MONTH = 3
XP_PER_BOOST = 50


def _get_current_year_month() -> int:
    """Get current year-month as integer YYYYMM."""
    today = date.today()
    return today.year * 100 + today.month


def _get_next_reset_date() -> str:
    """Get the first day of next month."""
    today = date.today()
    if today.month == 12:
        return f"{today.year + 1}-01-01"
    return f"{today.year}-{today.month + 1:02d}-01"


def _build_boost_response(boost: SacredBoost) -> SacredBoostResponse:
    """Build SacredBoostResponse from model."""
    return SacredBoostResponse(
        id=boost.id,
        giver_id=boost.giver_id,
        receiver_id=boost.receiver_id,
        goal_id=boost.goal_id,
        xp_awarded=boost.xp_awarded,
        created_at=boost.created_at,
        giver_username=boost.giver.username if boost.giver else None,
        giver_display_name=boost.giver.display_name if boost.giver else None,
        giver_avatar_url=boost.giver.avatar_url if boost.giver else None,
    )


@router.post("/goals/{goal_id}", response_model=SacredBoostResponse, status_code=status.HTTP_201_CREATED)
async def give_sacred_boost(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Give a sacred boost to a goal (limited to 3 per month)."""
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

    current_ym = _get_current_year_month()

    # Check how many boosts given this month
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.year_month == current_ym
        )
    )
    boosts_this_month = result.scalar() or 0

    if boosts_this_month >= MAX_BOOSTS_PER_MONTH:
        raise HTTPException(
            status_code=400,
            detail=f"You have already given {MAX_BOOSTS_PER_MONTH} sacred boosts this month. Resets on {_get_next_reset_date()}"
        )

    # Check if already boosted this goal
    result = await db.execute(
        select(SacredBoost).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.goal_id == goal_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="You have already boosted this goal")

    # Create the boost
    boost = SacredBoost(
        giver_id=current_user.id,
        receiver_id=goal.user_id,
        goal_id=goal_id,
        year_month=current_ym,
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
    """Get current user's boost status."""
    current_ym = _get_current_year_month()

    # Count boosts given this month
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.year_month == current_ym
        )
    )
    given_this_month = result.scalar() or 0

    # Count total boosts received
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.receiver_id == current_user.id
        )
    )
    received_total = result.scalar() or 0

    return SacredBoostStatus(
        boosts_remaining=MAX_BOOSTS_PER_MONTH - given_this_month,
        boosts_given_this_month=given_this_month,
        max_boosts_per_month=MAX_BOOSTS_PER_MONTH,
        boosts_received_total=received_total,
        next_reset_date=_get_next_reset_date()
    )


@router.get("/check/{goal_id}")
async def check_can_boost(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if user can boost a specific goal."""
    current_ym = _get_current_year_month()

    # Check monthly limit
    result = await db.execute(
        select(func.count(SacredBoost.id)).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.year_month == current_ym
        )
    )
    given_this_month = result.scalar() or 0

    # Check if already boosted this goal
    result = await db.execute(
        select(SacredBoost).where(
            SacredBoost.giver_id == current_user.id,
            SacredBoost.goal_id == goal_id
        )
    )
    already_boosted = result.scalar_one_or_none() is not None

    return {
        "can_boost": given_this_month < MAX_BOOSTS_PER_MONTH and not already_boosted,
        "already_boosted": already_boosted,
        "boosts_remaining": MAX_BOOSTS_PER_MONTH - given_this_month,
        "reason": (
            "Already boosted this goal" if already_boosted
            else f"No boosts remaining this month" if given_this_month >= MAX_BOOSTS_PER_MONTH
            else None
        )
    }
