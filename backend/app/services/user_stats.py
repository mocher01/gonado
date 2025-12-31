from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user_stats import UserStats
from app.schemas.user_stats import UserReputation


# Level thresholds and titles
ACHIEVER_LEVELS = [
    (0, "Beginner", "Starting the journey"),
    (10, "Apprentice", "Learning the ropes"),
    (50, "Journeyman", "Making progress"),
    (100, "Expert", "Skilled achiever"),
    (250, "Master", "Goal crusher"),
    (500, "Grandmaster", "Unstoppable force"),
    (1000, "Legend", "Legendary achiever"),
]

SUPPORTER_LEVELS = [
    (0, "Observer", "Just watching"),
    (10, "Helper", "Lending a hand"),
    (50, "Encourager", "Spreading positivity"),
    (100, "Motivator", "Inspiring others"),
    (250, "Champion", "Community hero"),
    (500, "Guardian", "Pillar of support"),
    (1000, "Beacon", "Guiding light"),
]


class UserStatsService:
    @staticmethod
    def _get_level_info(score: int, levels: list) -> tuple[str, str]:
        """Get level name and title based on score."""
        level_name = levels[0][1]
        level_title = levels[0][2]
        for threshold, name, title in levels:
            if score >= threshold:
                level_name = name
                level_title = title
        return level_name, level_title

    @staticmethod
    async def get_or_create_stats(
        db: AsyncSession,
        user_id: UUID
    ) -> UserStats:
        """Get or create user stats."""
        result = await db.execute(
            select(UserStats).where(UserStats.user_id == user_id)
        )
        stats = result.scalar_one_or_none()

        if not stats:
            stats = UserStats(user_id=user_id)
            db.add(stats)
            await db.flush()

        return stats

    @staticmethod
    async def increment_stat(
        db: AsyncSession,
        user_id: UUID,
        stat_name: str,
        amount: int = 1
    ) -> UserStats:
        """Increment a specific stat for a user."""
        stats = await UserStatsService.get_or_create_stats(db, user_id)

        current_value = getattr(stats, stat_name, 0)
        setattr(stats, stat_name, current_value + amount)

        # Recalculate scores
        await UserStatsService.recalculate_scores(db, user_id)

        await db.flush()
        return stats

    @staticmethod
    async def recalculate_scores(
        db: AsyncSession,
        user_id: UUID
    ) -> UserStats:
        """Recalculate achiever and supporter scores."""
        stats = await UserStatsService.get_or_create_stats(db, user_id)

        # Achiever score: based on goals and nodes completed
        stats.achiever_score = (
            stats.goals_completed * 10 +
            stats.nodes_completed * 2 +
            stats.goals_created * 1
        )

        # Supporter score: based on social interactions
        stats.supporter_score = (
            stats.comments_given * 3 +
            stats.reactions_given * 1 +
            stats.comments_received * 2 +
            stats.reactions_received * 1 +
            stats.followers_count * 5
        )

        await db.flush()
        return stats

    @staticmethod
    async def get_reputation(
        db: AsyncSession,
        user_id: UUID
    ) -> UserReputation:
        """Get calculated reputation for a user."""
        stats = await UserStatsService.get_or_create_stats(db, user_id)
        await UserStatsService.recalculate_scores(db, user_id)

        achiever_level, achiever_title = UserStatsService._get_level_info(
            stats.achiever_score, ACHIEVER_LEVELS
        )
        supporter_level, supporter_title = UserStatsService._get_level_info(
            stats.supporter_score, SUPPORTER_LEVELS
        )

        total_score = stats.achiever_score + stats.supporter_score

        # Overall title based on total score
        if total_score >= 2000:
            overall_title = "Legendary Pioneer"
        elif total_score >= 1000:
            overall_title = "Master Adventurer"
        elif total_score >= 500:
            overall_title = "Expert Explorer"
        elif total_score >= 200:
            overall_title = "Seasoned Traveler"
        elif total_score >= 50:
            overall_title = "Aspiring Adventurer"
        else:
            overall_title = "New Explorer"

        return UserReputation(
            user_id=user_id,
            achiever_score=stats.achiever_score,
            supporter_score=stats.supporter_score,
            total_score=total_score,
            achiever_level=achiever_level,
            supporter_level=supporter_level,
            achiever_title=achiever_title,
            supporter_title=supporter_title,
            overall_title=overall_title
        )

    @staticmethod
    async def update_followers_count(
        db: AsyncSession,
        user_id: UUID,
        delta: int
    ) -> UserStats:
        """Update followers count (can be positive or negative)."""
        stats = await UserStatsService.get_or_create_stats(db, user_id)
        stats.followers_count = max(0, stats.followers_count + delta)
        await UserStatsService.recalculate_scores(db, user_id)
        await db.flush()
        return stats

    @staticmethod
    async def update_following_count(
        db: AsyncSession,
        user_id: UUID,
        delta: int
    ) -> UserStats:
        """Update following count (can be positive or negative)."""
        stats = await UserStatsService.get_or_create_stats(db, user_id)
        stats.following_count = max(0, stats.following_count + delta)
        await db.flush()
        return stats


user_stats_service = UserStatsService()
