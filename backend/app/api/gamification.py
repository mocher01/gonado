from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.gamification import LeaderboardEntry, BadgeResponse, UserBadgeResponse
from app.models.user import User
from app.services.gamification import gamification_service

router = APIRouter()


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get the global XP leaderboard."""
    return await gamification_service.get_leaderboard(db, limit)


@router.get("/badges", response_model=list[UserBadgeResponse])
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's badges."""
    return await gamification_service.get_user_badges(db, current_user.id)


@router.get("/stats")
async def get_my_stats(
    current_user: User = Depends(get_current_user)
):
    """Get current user's gamification stats."""
    return {
        "xp": current_user.xp,
        "level": current_user.level,
        "streak_days": current_user.streak_days
    }
