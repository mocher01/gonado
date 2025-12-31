from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.schemas.activity import ActivityResponse, ActivityFeed, ActivityUserInfo
from app.models.user import User
from app.models.goal import Goal, GoalVisibility
from app.services.activity import activity_service
from sqlalchemy import select

router = APIRouter()


def _enrich_activity(activity) -> ActivityResponse:
    """Convert activity model to response with user info."""
    user_info = None
    if activity.user:
        user_info = ActivityUserInfo(
            id=activity.user.id,
            username=activity.user.username,
            display_name=activity.user.display_name,
            avatar_url=activity.user.avatar_url
        )

    return ActivityResponse(
        id=activity.id,
        user_id=activity.user_id,
        activity_type=activity.activity_type,
        target_type=activity.target_type,
        target_id=activity.target_id,
        extra_data=activity.extra_data,
        is_public=activity.is_public,
        created_at=activity.created_at,
        user=user_info
    )


@router.get("/feed", response_model=ActivityFeed)
async def get_activity_feed(
    limit: int = Query(20, le=50),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get personalized activity feed (from followed users/goals)."""
    activities, total = await activity_service.get_personalized_feed(
        db, current_user.id, limit, offset
    )

    return ActivityFeed(
        activities=[_enrich_activity(a) for a in activities],
        total=total,
        has_more=offset + len(activities) < total
    )


@router.get("/user/{user_id}", response_model=ActivityFeed)
async def get_user_activities(
    user_id: UUID,
    limit: int = Query(20, le=50),
    offset: int = 0,
    current_user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get public activities for a specific user."""
    # Only show public activities unless viewing own profile
    public_only = current_user is None or current_user.id != user_id

    activities, total = await activity_service.get_user_activities(
        db, user_id, limit, offset, public_only=public_only
    )

    return ActivityFeed(
        activities=[_enrich_activity(a) for a in activities],
        total=total,
        has_more=offset + len(activities) < total
    )


@router.get("/goal/{goal_id}", response_model=ActivityFeed)
async def get_goal_activities(
    goal_id: UUID,
    limit: int = Query(20, le=50),
    offset: int = 0,
    current_user: User = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get activities for a specific goal."""
    # Verify goal exists and is accessible
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check visibility
    if goal.visibility != GoalVisibility.PUBLIC:
        if not current_user or current_user.id != goal.user_id:
            raise HTTPException(status_code=404, detail="Goal not found")

    activities, total = await activity_service.get_goal_activities(
        db, goal_id, limit, offset
    )

    return ActivityFeed(
        activities=[_enrich_activity(a) for a in activities],
        total=total,
        has_more=offset + len(activities) < total
    )
