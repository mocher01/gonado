from uuid import UUID
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.prophecy import (
    ProphecyCreate, ProphecyResponse, ProphecyListResponse, ProphecyBoardResponse
)
from app.models.prophecy import Prophecy
from app.models.goal import Goal
from app.models.user import User

router = APIRouter()


def _build_prophecy_response(prophecy: Prophecy) -> ProphecyResponse:
    """Build ProphecyResponse from model."""
    return ProphecyResponse(
        id=prophecy.id,
        user_id=prophecy.user_id,
        goal_id=prophecy.goal_id,
        predicted_date=prophecy.predicted_date,
        accuracy_days=prophecy.accuracy_days,
        created_at=prophecy.created_at,
        username=prophecy.user.username if prophecy.user else None,
        display_name=prophecy.user.display_name if prophecy.user else None,
        avatar_url=prophecy.user.avatar_url if prophecy.user else None,
    )


@router.post("/goals/{goal_id}", response_model=ProphecyResponse, status_code=status.HTTP_201_CREATED)
async def create_prophecy(
    goal_id: UUID,
    data: ProphecyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Make a prediction about when a goal will be completed."""
    # Verify goal exists and is public
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if goal.visibility != "public" and goal.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot make predictions on private goals")

    # Cannot predict your own goal
    if goal.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot make predictions on your own goal")

    # Check if already predicted
    result = await db.execute(
        select(Prophecy).where(
            Prophecy.goal_id == goal_id,
            Prophecy.user_id == current_user.id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="You have already made a prediction for this goal")

    # Prediction must be in the future
    if data.predicted_date <= date.today():
        raise HTTPException(status_code=400, detail="Prediction date must be in the future")

    prophecy = Prophecy(
        user_id=current_user.id,
        goal_id=goal_id,
        predicted_date=data.predicted_date
    )
    db.add(prophecy)
    await db.flush()

    # Reload with user relationship
    result = await db.execute(
        select(Prophecy)
        .options(selectinload(Prophecy.user))
        .where(Prophecy.id == prophecy.id)
    )
    prophecy = result.scalar_one()

    return _build_prophecy_response(prophecy)


@router.get("/goals/{goal_id}", response_model=ProphecyBoardResponse)
async def get_prophecy_board(
    goal_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the prophecy board for a goal."""
    # Verify goal exists
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get all prophecies
    result = await db.execute(
        select(Prophecy)
        .options(selectinload(Prophecy.user))
        .where(Prophecy.goal_id == goal_id)
        .order_by(Prophecy.predicted_date)
    )
    prophecies = result.scalars().all()

    prophecy_responses = [_build_prophecy_response(p) for p in prophecies]

    # Calculate stats
    earliest = min((p.predicted_date for p in prophecies), default=None)
    latest = max((p.predicted_date for p in prophecies), default=None)

    avg_date = None
    if prophecies:
        avg_ordinal = sum(p.predicted_date.toordinal() for p in prophecies) // len(prophecies)
        avg_date = date.fromordinal(avg_ordinal)

    # Check if goal is completed
    actual_completion = None
    closest_prophet = None
    if goal.status == "completed" and goal.completed_at:
        actual_completion = goal.completed_at.date()
        # Find closest prediction
        if prophecies:
            closest = min(prophecies, key=lambda p: abs((p.predicted_date - actual_completion).days))
            closest_prophet = _build_prophecy_response(closest)

    return ProphecyBoardResponse(
        prophecies=prophecy_responses,
        total_predictions=len(prophecies),
        earliest_prediction=earliest,
        latest_prediction=latest,
        average_prediction=avg_date,
        actual_completion=actual_completion,
        closest_prophet=closest_prophet
    )


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prophecy(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete your own prophecy."""
    result = await db.execute(
        select(Prophecy).where(
            Prophecy.goal_id == goal_id,
            Prophecy.user_id == current_user.id
        )
    )
    prophecy = result.scalar_one_or_none()
    if not prophecy:
        raise HTTPException(status_code=404, detail="Prophecy not found")

    await db.delete(prophecy)


@router.get("/my-predictions", response_model=ProphecyListResponse)
async def get_my_predictions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all predictions made by the current user."""
    result = await db.execute(
        select(Prophecy)
        .options(selectinload(Prophecy.user), selectinload(Prophecy.goal))
        .where(Prophecy.user_id == current_user.id)
        .order_by(Prophecy.created_at.desc())
    )
    prophecies = result.scalars().all()

    return ProphecyListResponse(
        prophecies=[_build_prophecy_response(p) for p in prophecies],
        total=len(prophecies)
    )
