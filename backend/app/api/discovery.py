from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.schemas.goal import GoalResponse
from app.models.goal import Goal, GoalVisibility, GoalStatus
from app.models.update import Update

router = APIRouter()


@router.get("/trending", response_model=list[GoalResponse])
async def get_trending_goals(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get trending public goals (most recent activity)."""
    # Goals with most recent updates
    subquery = (
        select(Update.node_id, func.max(Update.created_at).label("last_update"))
        .group_by(Update.node_id)
        .subquery()
    )

    result = await db.execute(
        select(Goal)
        .where(
            Goal.visibility == GoalVisibility.PUBLIC,
            Goal.status == GoalStatus.ACTIVE
        )
        .order_by(Goal.updated_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/needs-help", response_model=list[GoalResponse])
async def get_goals_needing_help(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get public goals that might need help (active but stale)."""
    from datetime import datetime, timedelta

    stale_threshold = datetime.utcnow() - timedelta(days=7)

    result = await db.execute(
        select(Goal)
        .where(
            Goal.visibility == GoalVisibility.PUBLIC,
            Goal.status == GoalStatus.ACTIVE,
            Goal.updated_at < stale_threshold
        )
        .order_by(Goal.updated_at.asc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/recent", response_model=list[GoalResponse])
async def get_recent_goals(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get recently created public goals."""
    result = await db.execute(
        select(Goal)
        .where(Goal.visibility == GoalVisibility.PUBLIC)
        .order_by(Goal.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/celebrating", response_model=list[GoalResponse])
async def get_celebrating_goals(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get recently completed goals."""
    result = await db.execute(
        select(Goal)
        .where(
            Goal.visibility == GoalVisibility.PUBLIC,
            Goal.status == GoalStatus.COMPLETED
        )
        .order_by(Goal.updated_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
