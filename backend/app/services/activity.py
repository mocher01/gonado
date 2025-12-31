from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.models.activity import Activity, ActivityType, ActivityTargetType
from app.models.follow import Follow, FollowType
from app.models.goal import Goal


class ActivityService:
    @staticmethod
    async def log_activity(
        db: AsyncSession,
        user_id: UUID,
        activity_type: ActivityType,
        target_type: Optional[ActivityTargetType] = None,
        target_id: Optional[UUID] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        is_public: bool = True
    ) -> Activity:
        """Log a new activity."""
        activity = Activity(
            user_id=user_id,
            activity_type=activity_type,
            target_type=target_type,
            target_id=target_id,
            extra_data=extra_data or {},
            is_public=is_public
        )
        db.add(activity)
        await db.flush()
        return activity

    @staticmethod
    async def get_personalized_feed(
        db: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0
    ) -> tuple[List[Activity], int]:
        """Get personalized feed for a user (from followed users and goals)."""
        # Get followed users and goals
        follows_result = await db.execute(
            select(Follow).where(Follow.follower_id == user_id)
        )
        follows = follows_result.scalars().all()

        followed_user_ids = [f.target_id for f in follows if f.follow_type == FollowType.USER]
        followed_goal_ids = [f.target_id for f in follows if f.follow_type == FollowType.GOAL]

        # Build query for activities from followed users or related to followed goals
        conditions = []
        if followed_user_ids:
            conditions.append(Activity.user_id.in_(followed_user_ids))
        if followed_goal_ids:
            conditions.append(
                (Activity.target_type == ActivityTargetType.GOAL) &
                (Activity.target_id.in_(followed_goal_ids))
            )

        if not conditions:
            # No follows, return empty
            return [], 0

        query = (
            select(Activity)
            .options(selectinload(Activity.user))
            .where(
                Activity.is_public == True,
                or_(*conditions)
            )
            .order_by(Activity.created_at.desc())
        )

        # Count total
        count_query = select(Activity).where(
            Activity.is_public == True,
            or_(*conditions)
        )
        count_result = await db.execute(
            select(Activity.id).where(
                Activity.is_public == True,
                or_(*conditions)
            )
        )
        total = len(count_result.all())

        # Fetch with pagination
        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        activities = result.scalars().all()

        return list(activities), total

    @staticmethod
    async def get_user_activities(
        db: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        offset: int = 0,
        public_only: bool = True
    ) -> tuple[List[Activity], int]:
        """Get activities for a specific user."""
        query = (
            select(Activity)
            .options(selectinload(Activity.user))
            .where(Activity.user_id == user_id)
        )

        if public_only:
            query = query.where(Activity.is_public == True)

        # Count
        count_query = select(Activity).where(Activity.user_id == user_id)
        if public_only:
            count_query = count_query.where(Activity.is_public == True)
        count_result = await db.execute(
            select(Activity.id).where(Activity.user_id == user_id)
        )
        total = len(count_result.all())

        # Fetch
        query = query.order_by(Activity.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        activities = result.scalars().all()

        return list(activities), total

    @staticmethod
    async def get_goal_activities(
        db: AsyncSession,
        goal_id: UUID,
        limit: int = 20,
        offset: int = 0
    ) -> tuple[List[Activity], int]:
        """Get activities for a specific goal."""
        query = (
            select(Activity)
            .options(selectinload(Activity.user))
            .where(
                Activity.target_type == ActivityTargetType.GOAL,
                Activity.target_id == goal_id,
                Activity.is_public == True
            )
            .order_by(Activity.created_at.desc())
        )

        # Count
        count_result = await db.execute(
            select(Activity.id).where(
                Activity.target_type == ActivityTargetType.GOAL,
                Activity.target_id == goal_id,
                Activity.is_public == True
            )
        )
        total = len(count_result.all())

        # Fetch
        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        activities = result.scalars().all()

        return list(activities), total


activity_service = ActivityService()
