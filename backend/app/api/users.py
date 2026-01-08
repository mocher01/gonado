from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user
from app.services.auth import AuthService
from app.schemas.user import UserResponse, UserPublicResponse, UserUpdate, UserStatsPublic, BadgePublic
from app.schemas.goal import GoalResponse, GoalListResponse
from app.schemas.badge import UserBadgeResponse, BadgeBase
from app.models.user import User
from app.models.goal import Goal, GoalVisibility
from app.models.gamification import UserBadge, Badge
from typing import List

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get the current user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the current user's profile."""
    if user_data.display_name is not None:
        current_user.display_name = user_data.display_name
    if user_data.bio is not None:
        current_user.bio = user_data.bio
    if user_data.avatar_url is not None:
        current_user.avatar_url = user_data.avatar_url

    await db.flush()
    return current_user


@router.get("/{username}", response_model=UserPublicResponse)
async def get_user_by_username(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a user's public profile by username with stats and badges."""
    # Load user with stats and badges relationships
    stmt = select(User).where(User.username == username).options(
        selectinload(User.stats),
        selectinload(User.badges).selectinload(UserBadge.badge)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build response with stats and badges
    response_data = {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "xp": user.xp,
        "level": user.level,
        "streak_days": user.streak_days,
        "created_at": user.created_at,
        "stats": None,
        "badges": []
    }

    # Add stats if available
    if user.stats:
        response_data["stats"] = UserStatsPublic(
            goals_created=user.stats.goals_created,
            goals_completed=user.stats.goals_completed,
            achiever_score=user.stats.achiever_score,
            supporter_score=user.stats.supporter_score,
            comments_given=user.stats.comments_given,
            reactions_given=user.stats.reactions_given,
            followers_count=user.stats.followers_count,
            following_count=user.stats.following_count
        )

    # Add badges if available
    if user.badges:
        response_data["badges"] = [
            BadgePublic(
                id=ub.badge.id,
                name=ub.badge.name,
                description=ub.badge.description,
                icon_url=ub.badge.icon_url,
                category=ub.badge.category.value,
                rarity=ub.badge.rarity.value,
                earned_at=ub.earned_at
            )
            for ub in user.badges
        ]

    return UserPublicResponse(**response_data)


@router.get("/{username}/goals", response_model=GoalListResponse)
async def get_user_goals(
    username: str,
    status_filter: str = Query(None, description="Filter by status: active or completed"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get a user's public goals with optional status filter and pagination."""
    # Get user by username
    user = await AuthService.get_user_by_username(db, username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build query for public goals only
    stmt = select(Goal).where(
        Goal.user_id == user.id,
        Goal.visibility == GoalVisibility.PUBLIC
    )

    # Apply status filter if provided
    if status_filter:
        from app.models.goal import GoalStatus
        if status_filter.lower() == "active":
            stmt = stmt.where(Goal.status == GoalStatus.ACTIVE)
        elif status_filter.lower() == "completed":
            stmt = stmt.where(Goal.status == GoalStatus.COMPLETED)

    # Get total count
    count_stmt = select(Goal).where(
        Goal.user_id == user.id,
        Goal.visibility == GoalVisibility.PUBLIC
    )
    if status_filter:
        if status_filter.lower() == "active":
            count_stmt = count_stmt.where(Goal.status == GoalStatus.ACTIVE)
        elif status_filter.lower() == "completed":
            count_stmt = count_stmt.where(Goal.status == GoalStatus.COMPLETED)

    from sqlalchemy import func
    total_result = await db.execute(select(func.count()).select_from(count_stmt.subquery()))
    total = total_result.scalar()

    # Apply pagination and ordering
    stmt = stmt.order_by(Goal.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    goals = result.scalars().all()

    return GoalListResponse(
        goals=[GoalResponse.model_validate(goal) for goal in goals],
        total=total
    )


@router.get("/{username}/badges", response_model=List[UserBadgeResponse])
async def get_user_badges(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all badges a user has earned."""
    # Get user by username
    user = await AuthService.get_user_by_username(db, username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Load user badges with badge details
    stmt = select(UserBadge).where(
        UserBadge.user_id == user.id
    ).options(
        selectinload(UserBadge.badge)
    ).order_by(UserBadge.earned_at.desc())

    result = await db.execute(stmt)
    user_badges = result.scalars().all()

    return [
        UserBadgeResponse(
            id=ub.id,
            badge=BadgeBase(
                id=ub.badge.id,
                name=ub.badge.name,
                description=ub.badge.description,
                icon_url=ub.badge.icon_url,
                criteria=ub.badge.criteria,
                xp_reward=ub.badge.xp_reward,
                category=ub.badge.category,
                rarity=ub.badge.rarity,
                created_at=ub.badge.created_at
            ),
            earned_at=ub.earned_at
        )
        for ub in user_badges
    ]
