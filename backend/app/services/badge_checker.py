"""
Badge Checker Service

This service handles the logic for checking badge criteria and awarding badges.
It defines all badge criteria types and the logic to evaluate them.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import User
from app.models.gamification import Badge, UserBadge, XPTransaction
from app.models.goal import Goal, GoalStatus
from app.models.node import Node, NodeStatus
from app.models.interaction import Interaction, InteractionType
from app.models.follow import Follow, FollowType
from app.schemas.badge import BadgeProgress, BadgeBase, NewlyAwardedBadge


# Initial badges to seed - these can be used by a migration or seed script
INITIAL_BADGES = [
    {
        "name": "First Step",
        "description": "Complete your first node on a goal",
        "icon_url": "/badges/first-step.svg",
        "criteria": {"type": "nodes_completed", "value": 1},
        "xp_reward": 25,
        "category": "achievement",
        "rarity": "common",
    },
    {
        "name": "Goal Getter",
        "description": "Complete your first goal",
        "icon_url": "/badges/goal-getter.svg",
        "criteria": {"type": "goals_completed", "value": 1},
        "xp_reward": 100,
        "category": "achievement",
        "rarity": "common",
    },
    {
        "name": "Trailblazer",
        "description": "Create 5 goals and start your journey",
        "icon_url": "/badges/trailblazer.svg",
        "criteria": {"type": "goals_created", "value": 5},
        "xp_reward": 50,
        "category": "achievement",
        "rarity": "rare",
    },
    {
        "name": "Streak Master",
        "description": "Maintain a 7-day streak",
        "icon_url": "/badges/streak-master.svg",
        "criteria": {"type": "streak_days", "value": 7},
        "xp_reward": 75,
        "category": "streak",
        "rarity": "rare",
    },
    {
        "name": "Helpful Hand",
        "description": "Give 10 reactions to others' goals and updates",
        "icon_url": "/badges/helpful-hand.svg",
        "criteria": {"type": "reactions_given", "value": 10},
        "xp_reward": 50,
        "category": "social",
        "rarity": "common",
    },
    {
        "name": "Community Voice",
        "description": "Write 10 comments on others' goals",
        "icon_url": "/badges/community-voice.svg",
        "criteria": {"type": "comments_given", "value": 10},
        "xp_reward": 75,
        "category": "social",
        "rarity": "rare",
    },
    {
        "name": "Rising Star",
        "description": "Get 10 followers",
        "icon_url": "/badges/rising-star.svg",
        "criteria": {"type": "followers_count", "value": 10},
        "xp_reward": 100,
        "category": "social",
        "rarity": "rare",
    },
    {
        "name": "Inspiration",
        "description": "Receive 50 reactions on your goals and updates",
        "icon_url": "/badges/inspiration.svg",
        "criteria": {"type": "reactions_received", "value": 50},
        "xp_reward": 150,
        "category": "social",
        "rarity": "epic",
    },
    # Additional badges for completeness
    {
        "name": "Marathon Runner",
        "description": "Maintain a 30-day streak",
        "icon_url": "/badges/marathon-runner.svg",
        "criteria": {"type": "streak_days", "value": 30},
        "xp_reward": 250,
        "category": "streak",
        "rarity": "epic",
    },
    {
        "name": "Legendary Streak",
        "description": "Maintain a 100-day streak",
        "icon_url": "/badges/legendary-streak.svg",
        "criteria": {"type": "streak_days", "value": 100},
        "xp_reward": 1000,
        "category": "streak",
        "rarity": "legendary",
    },
    {
        "name": "Achiever",
        "description": "Complete 10 goals",
        "icon_url": "/badges/achiever.svg",
        "criteria": {"type": "goals_completed", "value": 10},
        "xp_reward": 500,
        "category": "milestone",
        "rarity": "epic",
    },
    {
        "name": "Task Master",
        "description": "Complete 50 nodes",
        "icon_url": "/badges/task-master.svg",
        "criteria": {"type": "nodes_completed", "value": 50},
        "xp_reward": 200,
        "category": "achievement",
        "rarity": "rare",
    },
    {
        "name": "Influencer",
        "description": "Get 50 followers",
        "icon_url": "/badges/influencer.svg",
        "criteria": {"type": "followers_count", "value": 50},
        "xp_reward": 300,
        "category": "social",
        "rarity": "epic",
    },
    {
        "name": "Helping Legend",
        "description": "Give 100 reactions to help others",
        "icon_url": "/badges/helping-legend.svg",
        "criteria": {"type": "reactions_given", "value": 100},
        "xp_reward": 200,
        "category": "social",
        "rarity": "epic",
    },
]


class BadgeCheckerService:
    """Service for checking and awarding badges based on user activity."""

    async def get_user_stats(self, db: AsyncSession, user_id: UUID) -> Dict[str, int]:
        """
        Get all relevant stats for a user that are used in badge criteria.

        Returns a dictionary with various stat counts.
        """
        # Get user for streak info
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        if not user:
            return {}

        # Count completed goals
        goals_completed_result = await db.execute(
            select(func.count(Goal.id)).where(
                Goal.user_id == user_id,
                Goal.status == GoalStatus.COMPLETED
            )
        )
        goals_completed = goals_completed_result.scalar() or 0

        # Count all goals created
        goals_created_result = await db.execute(
            select(func.count(Goal.id)).where(Goal.user_id == user_id)
        )
        goals_created = goals_created_result.scalar() or 0

        # Count completed nodes (need to join with goals to get user's nodes)
        nodes_completed_result = await db.execute(
            select(func.count(Node.id))
            .join(Goal, Node.goal_id == Goal.id)
            .where(
                Goal.user_id == user_id,
                Node.status == NodeStatus.COMPLETED
            )
        )
        nodes_completed = nodes_completed_result.scalar() or 0

        # Count reactions given to others
        reactions_given_result = await db.execute(
            select(func.count(Interaction.id)).where(
                Interaction.user_id == user_id,
                Interaction.interaction_type == InteractionType.REACTION
            )
        )
        reactions_given = reactions_given_result.scalar() or 0

        # Count comments given to others
        comments_given_result = await db.execute(
            select(func.count(Interaction.id)).where(
                Interaction.user_id == user_id,
                Interaction.interaction_type == InteractionType.COMMENT
            )
        )
        comments_given = comments_given_result.scalar() or 0

        # Count followers (people following this user)
        followers_result = await db.execute(
            select(func.count(Follow.id)).where(
                Follow.target_id == user_id,
                Follow.follow_type == FollowType.USER
            )
        )
        followers_count = followers_result.scalar() or 0

        # Count reactions received on user's goals and updates
        # First get all user's goal IDs
        user_goals_result = await db.execute(
            select(Goal.id).where(Goal.user_id == user_id)
        )
        user_goal_ids = [g for g in user_goals_result.scalars().all()]

        reactions_received = 0
        if user_goal_ids:
            # Count reactions on user's goals
            reactions_on_goals_result = await db.execute(
                select(func.count(Interaction.id)).where(
                    Interaction.target_id.in_(user_goal_ids),
                    Interaction.interaction_type == InteractionType.REACTION,
                    Interaction.user_id != user_id  # Exclude self-reactions
                )
            )
            reactions_received = reactions_on_goals_result.scalar() or 0

        return {
            "goals_completed": goals_completed,
            "goals_created": goals_created,
            "nodes_completed": nodes_completed,
            "streak_days": user.streak_days,
            "reactions_given": reactions_given,
            "comments_given": comments_given,
            "followers_count": followers_count,
            "reactions_received": reactions_received,
        }

    async def check_criteria(
        self,
        criteria: Dict[str, Any],
        stats: Dict[str, int]
    ) -> tuple[bool, int, int]:
        """
        Check if a badge criteria is met.

        Returns:
            tuple: (is_met, current_value, target_value)
        """
        criteria_type = criteria.get("type")
        target_value = criteria.get("value", 0)

        if criteria_type in stats:
            current_value = stats[criteria_type]
            return current_value >= target_value, current_value, target_value

        # Handle special criteria types
        if criteria_type == "first_goal_completed":
            current_value = stats.get("goals_completed", 0)
            return current_value >= 1, current_value, 1

        return False, 0, target_value

    async def get_user_earned_badge_ids(
        self, db: AsyncSession, user_id: UUID
    ) -> set[UUID]:
        """Get all badge IDs that the user has already earned."""
        result = await db.execute(
            select(UserBadge.badge_id).where(UserBadge.user_id == user_id)
        )
        return {badge_id for badge_id in result.scalars().all()}

    async def check_and_award_badges(
        self, db: AsyncSession, user_id: UUID
    ) -> List[NewlyAwardedBadge]:
        """
        Check all badges and award any that the user has newly earned.

        Returns list of newly awarded badges.
        """
        # Get user stats
        stats = await self.get_user_stats(db, user_id)
        if not stats:
            return []

        # Get already earned badges
        earned_badge_ids = await self.get_user_earned_badge_ids(db, user_id)

        # Get all badges
        result = await db.execute(select(Badge))
        all_badges = result.scalars().all()

        newly_awarded = []

        for badge in all_badges:
            # Skip if already earned
            if badge.id in earned_badge_ids:
                continue

            # Check if criteria is met
            is_met, _, _ = await self.check_criteria(badge.criteria, stats)

            if is_met:
                # Award the badge
                user_badge = UserBadge(
                    user_id=user_id,
                    badge_id=badge.id,
                    earned_at=datetime.utcnow()
                )
                db.add(user_badge)

                # Award XP if badge has XP reward
                if badge.xp_reward > 0:
                    xp_transaction = XPTransaction(
                        user_id=user_id,
                        amount=badge.xp_reward,
                        reason=f"Badge earned: {badge.name}"
                    )
                    db.add(xp_transaction)

                    # Update user's XP
                    user_result = await db.execute(
                        select(User).where(User.id == user_id)
                    )
                    user = user_result.scalar_one()
                    user.xp += badge.xp_reward

                await db.flush()

                newly_awarded.append(
                    NewlyAwardedBadge(
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
                        xp_awarded=badge.xp_reward,
                        earned_at=user_badge.earned_at,
                    )
                )

        return newly_awarded

    async def get_user_badge_progress(
        self, db: AsyncSession, user_id: UUID
    ) -> List[BadgeProgress]:
        """
        Get progress for all badges the user hasn't earned yet.

        Returns list of badge progress information.
        """
        # Get user stats
        stats = await self.get_user_stats(db, user_id)
        if not stats:
            return []

        # Get already earned badges
        earned_badge_ids = await self.get_user_earned_badge_ids(db, user_id)

        # Get all badges
        result = await db.execute(select(Badge))
        all_badges = result.scalars().all()

        progress_list = []

        for badge in all_badges:
            # Skip if already earned
            if badge.id in earned_badge_ids:
                continue

            # Calculate progress
            is_met, current_value, target_value = await self.check_criteria(
                badge.criteria, stats
            )

            if target_value > 0:
                progress = min(1.0, current_value / target_value)
            else:
                progress = 1.0 if is_met else 0.0

            # Generate progress description
            criteria_type = badge.criteria.get("type", "")
            progress_desc = self._generate_progress_description(
                criteria_type, current_value, target_value
            )

            progress_list.append(
                BadgeProgress(
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
                    progress=progress,
                    current_value=current_value,
                    target_value=target_value,
                    progress_description=progress_desc,
                )
            )

        # Sort by progress (closest to completion first)
        progress_list.sort(key=lambda x: x.progress, reverse=True)

        return progress_list

    def _generate_progress_description(
        self,
        criteria_type: str,
        current: int,
        target: int
    ) -> str:
        """Generate a human-readable progress description."""
        type_labels = {
            "goals_completed": "goals completed",
            "goals_created": "goals created",
            "nodes_completed": "nodes completed",
            "streak_days": "day streak",
            "reactions_given": "reactions given",
            "comments_given": "comments written",
            "followers_count": "followers",
            "reactions_received": "reactions received",
            "first_goal_completed": "first goal completed",
        }

        label = type_labels.get(criteria_type, criteria_type)

        if criteria_type == "streak_days":
            return f"{current} of {target} {label}"

        return f"{current} of {target} {label}"


# Create a singleton instance
badge_checker_service = BadgeCheckerService()


async def seed_initial_badges(db: AsyncSession) -> List[Badge]:
    """
    Seed the initial badges into the database.

    Call this from a migration or seed script.
    Returns list of created badges.
    """
    from app.models.gamification import BadgeCategory, BadgeRarity

    created_badges = []

    for badge_data in INITIAL_BADGES:
        # Check if badge already exists
        existing = await db.execute(
            select(Badge).where(Badge.name == badge_data["name"])
        )
        if existing.scalar_one_or_none():
            continue

        badge = Badge(
            name=badge_data["name"],
            description=badge_data["description"],
            icon_url=badge_data["icon_url"],
            criteria=badge_data["criteria"],
            xp_reward=badge_data["xp_reward"],
            category=BadgeCategory(badge_data["category"]),
            rarity=BadgeRarity(badge_data["rarity"]),
        )
        db.add(badge)
        created_badges.append(badge)

    await db.flush()
    return created_badges
