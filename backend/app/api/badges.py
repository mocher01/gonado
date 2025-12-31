from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.models.user import User
from app.models.gamification import Badge, UserBadge
from app.schemas.badge import (
    BadgeCreate,
    BadgeResponse,
    BadgeBase,
    UserBadgeResponse,
    BadgeProgress,
    BadgeListResponse,
    NewlyAwardedBadge,
)
from app.services.badge_checker import badge_checker_service

router = APIRouter()


async def is_admin(user: User) -> bool:
    """Check if user is an admin.

    TODO: Add proper admin role check to User model.
    For now, this can be extended to check a specific field or admin emails.
    """
    # Placeholder: implement proper admin check based on your requirements
    # For example: return user.is_admin or user.role == "admin"
    return False


@router.get("", response_model=List[BadgeResponse])
async def list_all_badges(
    category: Optional[str] = None,
    rarity: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all available badges.

    If authenticated, includes earned status for each badge.
    Can optionally filter by category or rarity.
    """
    query = select(Badge)

    if category:
        query = query.where(Badge.category == category)
    if rarity:
        query = query.where(Badge.rarity == rarity)

    query = query.order_by(Badge.created_at)
    result = await db.execute(query)
    badges = result.scalars().all()

    # Get user's earned badges if authenticated
    earned_badge_ids = set()
    earned_dates = {}

    if current_user:
        earned_result = await db.execute(
            select(UserBadge).where(UserBadge.user_id == current_user.id)
        )
        user_badges = earned_result.scalars().all()
        earned_badge_ids = {ub.badge_id for ub in user_badges}
        earned_dates = {ub.badge_id: ub.earned_at for ub in user_badges}

    return [
        BadgeResponse(
            id=badge.id,
            name=badge.name,
            description=badge.description,
            icon_url=badge.icon_url,
            criteria=badge.criteria,
            xp_reward=badge.xp_reward,
            category=badge.category,
            rarity=badge.rarity,
            created_at=badge.created_at,
            earned=badge.id in earned_badge_ids,
            earned_at=earned_dates.get(badge.id),
        )
        for badge in badges
    ]


@router.get("/progress", response_model=List[BadgeProgress])
async def get_badge_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's progress toward all unearned badges.

    Returns badges that are in progress (not yet earned) with progress details.
    """
    return await badge_checker_service.get_user_badge_progress(db, current_user.id)


@router.get("/{badge_id}", response_model=BadgeResponse)
async def get_badge_details(
    badge_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get details for a specific badge.

    If authenticated, includes whether the current user has earned it.
    """
    result = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = result.scalar_one_or_none()

    if not badge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge not found"
        )

    earned = False
    earned_at = None

    if current_user:
        ub_result = await db.execute(
            select(UserBadge).where(
                UserBadge.user_id == current_user.id,
                UserBadge.badge_id == badge_id
            )
        )
        user_badge = ub_result.scalar_one_or_none()
        if user_badge:
            earned = True
            earned_at = user_badge.earned_at

    return BadgeResponse(
        id=badge.id,
        name=badge.name,
        description=badge.description,
        icon_url=badge.icon_url,
        criteria=badge.criteria,
        xp_reward=badge.xp_reward,
        category=badge.category,
        rarity=badge.rarity,
        created_at=badge.created_at,
        earned=earned,
        earned_at=earned_at,
    )


@router.get("/users/{user_id}/badges", response_model=List[UserBadgeResponse])
async def get_user_badges(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all badges earned by a specific user.

    Returns badges with earned_at timestamps.
    """
    result = await db.execute(
        select(UserBadge)
        .where(UserBadge.user_id == user_id)
        .order_by(UserBadge.earned_at.desc())
    )
    user_badges = result.scalars().all()

    # Eagerly load badge data
    response = []
    for ub in user_badges:
        badge_result = await db.execute(select(Badge).where(Badge.id == ub.badge_id))
        badge = badge_result.scalar_one()
        response.append(
            UserBadgeResponse(
                id=ub.id,
                badge=BadgeBase(
                    id=badge.id,
                    name=badge.name,
                    description=badge.description,
                    icon_url=badge.icon_url,
                    criteria=badge.criteria,
                    xp_reward=badge.xp_reward,
                    category=badge.category,
                    rarity=badge.rarity,
                    created_at=badge.created_at,
                ),
                earned_at=ub.earned_at,
            )
        )

    return response


@router.post("", response_model=BadgeBase, status_code=status.HTTP_201_CREATED)
async def create_badge(
    badge_data: BadgeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new badge (admin only).

    Requires admin privileges.
    """
    if not await is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    # Check if badge with same name exists
    existing = await db.execute(
        select(Badge).where(Badge.name == badge_data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Badge with this name already exists"
        )

    badge = Badge(
        name=badge_data.name,
        description=badge_data.description,
        icon_url=badge_data.icon_url,
        criteria=badge_data.criteria,
        xp_reward=badge_data.xp_reward,
        category=badge_data.category,
        rarity=badge_data.rarity,
    )
    db.add(badge)
    await db.flush()
    await db.refresh(badge)

    return badge


@router.post("/check", response_model=List[NewlyAwardedBadge])
async def check_and_award_badges(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check and award any eligible badges to the current user.

    Returns list of newly awarded badges.
    """
    return await badge_checker_service.check_and_award_badges(db, current_user.id)
