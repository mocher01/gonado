from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_optional_user
from app.schemas.user_stats import UserStatsResponse, UserReputation
from app.models.user import User
from app.services.user_stats import user_stats_service

router = APIRouter()


@router.get("/{user_id}/stats", response_model=UserStatsResponse)
async def get_user_stats(
    user_id: UUID,
    current_user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's stats."""
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stats = await user_stats_service.get_or_create_stats(db, user_id)
    return stats


@router.get("/{user_id}/reputation", response_model=UserReputation)
async def get_user_reputation(
    user_id: UUID,
    current_user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's calculated reputation."""
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reputation = await user_stats_service.get_reputation(db, user_id)
    return reputation
