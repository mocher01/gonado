"""
Tests for enhanced user profile API endpoints.
Tests the following endpoints:
- GET /api/users/{username} - Enhanced with stats and badges
- GET /api/users/{username}/goals - User's public goals
- GET /api/users/{username}/badges - User's earned badges
"""
import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.user_stats import UserStats
from app.models.goal import Goal, GoalVisibility, GoalStatus
from app.models.gamification import Badge, UserBadge, BadgeCategory, BadgeRarity
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime


@pytest.mark.asyncio
async def test_get_user_profile_basic(client: AsyncClient, test_user: User):
    """Test getting basic user profile without stats or badges."""
    response = await client.get(f"/api/users/{test_user.username}")
    assert response.status_code == 200

    data = response.json()
    assert data["username"] == test_user.username
    assert data["display_name"] == test_user.display_name
    assert data["xp"] == test_user.xp
    assert data["level"] == test_user.level
    assert data["streak_days"] == test_user.streak_days
    assert "created_at" in data
    assert data["stats"] is None  # No stats created yet
    assert data["badges"] == []  # No badges earned yet


@pytest.mark.asyncio
async def test_get_user_profile_with_stats(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test getting user profile with stats."""
    # Create user stats
    stats = UserStats(
        user_id=test_user.id,
        goals_created=10,
        goals_completed=5,
        nodes_completed=25,
        comments_given=15,
        reactions_given=30,
        comments_received=20,
        reactions_received=40,
        followers_count=12,
        following_count=18,
        achiever_score=250,
        supporter_score=150
    )
    db_session.add(stats)
    await db_session.commit()

    response = await client.get(f"/api/users/{test_user.username}")
    assert response.status_code == 200

    data = response.json()
    assert data["stats"] is not None
    assert data["stats"]["goals_created"] == 10
    assert data["stats"]["goals_completed"] == 5
    assert data["stats"]["achiever_score"] == 250
    assert data["stats"]["supporter_score"] == 150
    assert data["stats"]["comments_given"] == 15
    assert data["stats"]["reactions_given"] == 30
    assert data["stats"]["followers_count"] == 12
    assert data["stats"]["following_count"] == 18


@pytest.mark.asyncio
async def test_get_user_profile_with_badges(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test getting user profile with earned badges."""
    # Create badges
    badge1 = Badge(
        name="First Goal",
        description="Created your first goal",
        icon_url="https://example.com/badge1.png",
        criteria={"goals_created": 1},
        xp_reward=50,
        category=BadgeCategory.ACHIEVEMENT,
        rarity=BadgeRarity.COMMON
    )
    badge2 = Badge(
        name="Goal Crusher",
        description="Completed 5 goals",
        icon_url="https://example.com/badge2.png",
        criteria={"goals_completed": 5},
        xp_reward=100,
        category=BadgeCategory.ACHIEVEMENT,
        rarity=BadgeRarity.RARE
    )
    db_session.add_all([badge1, badge2])
    await db_session.commit()
    await db_session.refresh(badge1)
    await db_session.refresh(badge2)

    # Award badges to user
    user_badge1 = UserBadge(user_id=test_user.id, badge_id=badge1.id)
    user_badge2 = UserBadge(user_id=test_user.id, badge_id=badge2.id)
    db_session.add_all([user_badge1, user_badge2])
    await db_session.commit()

    response = await client.get(f"/api/users/{test_user.username}")
    assert response.status_code == 200

    data = response.json()
    assert len(data["badges"]) == 2

    # Check first badge
    badge_data = next(b for b in data["badges"] if b["name"] == "First Goal")
    assert badge_data["description"] == "Created your first goal"
    assert badge_data["category"] == "achievement"
    assert badge_data["rarity"] == "common"
    assert "earned_at" in badge_data

    # Check second badge
    badge_data = next(b for b in data["badges"] if b["name"] == "Goal Crusher")
    assert badge_data["description"] == "Completed 5 goals"
    assert badge_data["rarity"] == "rare"


@pytest.mark.asyncio
async def test_get_user_profile_not_found(client: AsyncClient):
    """Test getting profile for non-existent user."""
    response = await client.get("/api/users/nonexistentuser")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_user_goals_empty(client: AsyncClient, test_user: User):
    """Test getting user goals when user has no goals."""
    response = await client.get(f"/api/users/{test_user.username}/goals")
    assert response.status_code == 200

    data = response.json()
    assert data["goals"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_get_user_goals_public_only(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test that only public goals are returned."""
    # Create public goal
    public_goal = Goal(
        user_id=test_user.id,
        title="Public Goal",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE
    )
    # Create private goal
    private_goal = Goal(
        user_id=test_user.id,
        title="Private Goal",
        visibility=GoalVisibility.PRIVATE,
        status=GoalStatus.ACTIVE
    )
    db_session.add_all([public_goal, private_goal])
    await db_session.commit()

    response = await client.get(f"/api/users/{test_user.username}/goals")
    assert response.status_code == 200

    data = response.json()
    assert len(data["goals"]) == 1
    assert data["total"] == 1
    assert data["goals"][0]["title"] == "Public Goal"
    assert data["goals"][0]["visibility"] == "public"


@pytest.mark.asyncio
async def test_get_user_goals_filter_active(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test filtering goals by active status."""
    # Create active and completed goals
    active_goal = Goal(
        user_id=test_user.id,
        title="Active Goal",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE
    )
    completed_goal = Goal(
        user_id=test_user.id,
        title="Completed Goal",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.COMPLETED
    )
    db_session.add_all([active_goal, completed_goal])
    await db_session.commit()

    response = await client.get(
        f"/api/users/{test_user.username}/goals?status_filter=active"
    )
    assert response.status_code == 200

    data = response.json()
    assert len(data["goals"]) == 1
    assert data["total"] == 1
    assert data["goals"][0]["title"] == "Active Goal"
    assert data["goals"][0]["status"] == "active"


@pytest.mark.asyncio
async def test_get_user_goals_filter_completed(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test filtering goals by completed status."""
    # Create active and completed goals
    active_goal = Goal(
        user_id=test_user.id,
        title="Active Goal",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE
    )
    completed_goal = Goal(
        user_id=test_user.id,
        title="Completed Goal",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.COMPLETED
    )
    db_session.add_all([active_goal, completed_goal])
    await db_session.commit()

    response = await client.get(
        f"/api/users/{test_user.username}/goals?status_filter=completed"
    )
    assert response.status_code == 200

    data = response.json()
    assert len(data["goals"]) == 1
    assert data["total"] == 1
    assert data["goals"][0]["title"] == "Completed Goal"
    assert data["goals"][0]["status"] == "completed"


@pytest.mark.asyncio
async def test_get_user_goals_pagination(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test pagination of user goals."""
    # Create 25 public goals
    goals = [
        Goal(
            user_id=test_user.id,
            title=f"Goal {i}",
            visibility=GoalVisibility.PUBLIC,
            status=GoalStatus.ACTIVE
        )
        for i in range(25)
    ]
    db_session.add_all(goals)
    await db_session.commit()

    # Test first page
    response = await client.get(
        f"/api/users/{test_user.username}/goals?skip=0&limit=10"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["goals"]) == 10
    assert data["total"] == 25

    # Test second page
    response = await client.get(
        f"/api/users/{test_user.username}/goals?skip=10&limit=10"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["goals"]) == 10
    assert data["total"] == 25

    # Test third page
    response = await client.get(
        f"/api/users/{test_user.username}/goals?skip=20&limit=10"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["goals"]) == 5
    assert data["total"] == 25


@pytest.mark.asyncio
async def test_get_user_goals_user_not_found(client: AsyncClient):
    """Test getting goals for non-existent user."""
    response = await client.get("/api/users/nonexistentuser/goals")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_user_badges_empty(client: AsyncClient, test_user: User):
    """Test getting user badges when user has no badges."""
    response = await client.get(f"/api/users/{test_user.username}/badges")
    assert response.status_code == 200

    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_get_user_badges_multiple(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test getting multiple user badges."""
    # Create badges
    badges = [
        Badge(
            name=f"Badge {i}",
            description=f"Badge {i} description",
            icon_url=f"https://example.com/badge{i}.png",
            criteria={"test": i},
            xp_reward=i * 10,
            category=BadgeCategory.ACHIEVEMENT,
            rarity=BadgeRarity.COMMON
        )
        for i in range(3)
    ]
    db_session.add_all(badges)
    await db_session.commit()

    # Award badges to user
    for badge in badges:
        await db_session.refresh(badge)
        user_badge = UserBadge(user_id=test_user.id, badge_id=badge.id)
        db_session.add(user_badge)
    await db_session.commit()

    response = await client.get(f"/api/users/{test_user.username}/badges")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 3

    # Verify badge structure
    for badge_data in data:
        assert "id" in badge_data
        assert "badge" in badge_data
        assert "earned_at" in badge_data
        assert "name" in badge_data["badge"]
        assert "description" in badge_data["badge"]
        assert "icon_url" in badge_data["badge"]
        assert "criteria" in badge_data["badge"]
        assert "xp_reward" in badge_data["badge"]
        assert "category" in badge_data["badge"]
        assert "rarity" in badge_data["badge"]


@pytest.mark.asyncio
async def test_get_user_badges_ordered_by_earned_at(
    client: AsyncClient,
    test_user: User,
    db_session: AsyncSession
):
    """Test that badges are ordered by most recently earned."""
    # Create badges
    badge1 = Badge(
        name="First Badge",
        category=BadgeCategory.ACHIEVEMENT,
        rarity=BadgeRarity.COMMON
    )
    badge2 = Badge(
        name="Second Badge",
        category=BadgeCategory.ACHIEVEMENT,
        rarity=BadgeRarity.COMMON
    )
    db_session.add_all([badge1, badge2])
    await db_session.commit()
    await db_session.refresh(badge1)
    await db_session.refresh(badge2)

    # Award badges with different timestamps
    user_badge1 = UserBadge(
        user_id=test_user.id,
        badge_id=badge1.id,
        earned_at=datetime(2024, 1, 1)
    )
    user_badge2 = UserBadge(
        user_id=test_user.id,
        badge_id=badge2.id,
        earned_at=datetime(2024, 1, 2)
    )
    db_session.add_all([user_badge1, user_badge2])
    await db_session.commit()

    response = await client.get(f"/api/users/{test_user.username}/badges")
    assert response.status_code == 200

    data = response.json()
    assert len(data) == 2
    # Most recent should be first
    assert data[0]["badge"]["name"] == "Second Badge"
    assert data[1]["badge"]["name"] == "First Badge"


@pytest.mark.asyncio
async def test_get_user_badges_user_not_found(client: AsyncClient):
    """Test getting badges for non-existent user."""
    response = await client.get("/api/users/nonexistentuser/badges")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
