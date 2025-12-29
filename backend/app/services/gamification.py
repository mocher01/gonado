from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.models.user import User
from app.models.gamification import Badge, UserBadge, XPTransaction

# XP rewards for different actions
XP_REWARDS = {
    "post_update": 10,
    "complete_node": 50,
    "complete_goal": 500,
    "receive_reaction": 2,
    "receive_comment": 5,
    "help_someone": 20,
    "first_goal": 100,
    "streak_7_days": 50,
    "streak_30_days": 200,
    "streak_100_days": 1000,
}

# Level thresholds
LEVEL_THRESHOLDS = [
    0,      # Level 1
    100,    # Level 2
    300,    # Level 3
    600,    # Level 4
    1000,   # Level 5
    1500,   # Level 6
    2200,   # Level 7
    3000,   # Level 8
    4000,   # Level 9
    5500,   # Level 10
    7500,   # Level 11
    10000,  # Level 12
    15000,  # Level 13
    20000,  # Level 14
    30000,  # Level 15
]


class GamificationService:
    @staticmethod
    def calculate_level(xp: int) -> int:
        """Calculate level based on XP."""
        for level, threshold in enumerate(LEVEL_THRESHOLDS, 1):
            if xp < threshold:
                return max(1, level - 1)
        return len(LEVEL_THRESHOLDS)

    @staticmethod
    async def award_xp(
        db: AsyncSession,
        user_id: UUID,
        amount: int,
        reason: str
    ) -> tuple[int, int]:
        """Award XP to a user and return (new_xp, new_level)."""
        # Create transaction record
        transaction = XPTransaction(
            user_id=user_id,
            amount=amount,
            reason=reason
        )
        db.add(transaction)

        # Update user XP
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one()
        user.xp += amount
        user.level = GamificationService.calculate_level(user.xp)

        await db.flush()
        return user.xp, user.level

    @staticmethod
    async def update_streak(db: AsyncSession, user_id: UUID) -> int:
        """Update user's streak and return new streak count."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()

        now = datetime.utcnow()
        last_activity = user.streak_last_activity

        if last_activity is None:
            # First activity
            user.streak_days = 1
        elif (now - last_activity) < timedelta(hours=24):
            # Same day, no change
            pass
        elif (now - last_activity) < timedelta(hours=48):
            # Next day, increment streak
            user.streak_days += 1
            # Check for streak badges
            await GamificationService._check_streak_badges(db, user)
        else:
            # Streak broken
            user.streak_days = 1

        user.streak_last_activity = now
        await db.flush()
        return user.streak_days

    @staticmethod
    async def _check_streak_badges(db: AsyncSession, user: User):
        """Check and award streak badges."""
        streak_badges = {
            7: "streak_7",
            30: "streak_30",
            100: "streak_100"
        }

        for days, badge_name in streak_badges.items():
            if user.streak_days >= days:
                await GamificationService.award_badge_by_name(
                    db, user.id, badge_name
                )

    @staticmethod
    async def award_badge(
        db: AsyncSession,
        user_id: UUID,
        badge_id: UUID
    ) -> Optional[UserBadge]:
        """Award a badge to a user if they don't already have it."""
        # Check if user already has the badge
        result = await db.execute(
            select(UserBadge).where(
                UserBadge.user_id == user_id,
                UserBadge.badge_id == badge_id
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return None

        user_badge = UserBadge(user_id=user_id, badge_id=badge_id)
        db.add(user_badge)

        # Get badge XP reward
        badge_result = await db.execute(select(Badge).where(Badge.id == badge_id))
        badge = badge_result.scalar_one()
        if badge.xp_reward > 0:
            await GamificationService.award_xp(
                db, user_id, badge.xp_reward, f"Badge: {badge.name}"
            )

        await db.flush()
        return user_badge

    @staticmethod
    async def award_badge_by_name(
        db: AsyncSession,
        user_id: UUID,
        badge_name: str
    ) -> Optional[UserBadge]:
        """Award a badge by name."""
        result = await db.execute(select(Badge).where(Badge.name == badge_name))
        badge = result.scalar_one_or_none()
        if not badge:
            return None
        return await GamificationService.award_badge(db, user_id, badge.id)

    @staticmethod
    async def get_leaderboard(
        db: AsyncSession,
        limit: int = 10
    ) -> List[dict]:
        """Get top users by XP."""
        result = await db.execute(
            select(User)
            .order_by(User.xp.desc())
            .limit(limit)
        )
        users = result.scalars().all()

        return [
            {
                "rank": i + 1,
                "user_id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "xp": user.xp,
                "level": user.level
            }
            for i, user in enumerate(users)
        ]

    @staticmethod
    async def get_user_badges(
        db: AsyncSession,
        user_id: UUID
    ) -> List[UserBadge]:
        """Get all badges for a user."""
        result = await db.execute(
            select(UserBadge)
            .where(UserBadge.user_id == user_id)
            .order_by(UserBadge.earned_at.desc())
        )
        return result.scalars().all()


gamification_service = GamificationService()
