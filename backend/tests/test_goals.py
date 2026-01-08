"""
Tests for goals list and discovery API enhancements.

Tests search, sort, and needs_help filters for:
- GET /api/goals (list_goals)
- GET /api/goals/discover (discover_goals)
"""
import uuid
import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal, GoalStatus, GoalVisibility
from app.models.node import Node, NodeStatus
from app.models.interaction import Interaction, InteractionType, TargetType
from app.models.comment import Comment, CommentTargetType


@pytest.fixture
async def test_goals(db_session: AsyncSession, test_user, test_user_2):
    """Create test goals with various properties."""
    goals = []

    # Goal 1: Public, active, with "learning" in title
    goal1 = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Learning Python Programming",
        description="Master Python for data science",
        category="education",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    db_session.add(goal1)
    goals.append(goal1)

    # Goal 2: Public, struggling mood
    goal2 = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Get Fit and Healthy",
        description="Exercise daily and eat better",
        category="health",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
        current_mood="struggling",
        created_at=datetime.utcnow() - timedelta(days=3)
    )
    db_session.add(goal2)
    goals.append(goal2)

    # Goal 3: Public, stuck mood
    goal3 = Goal(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        title="Build a Mobile App",
        description="Create an iOS app with React Native",
        category="technology",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
        current_mood="stuck",
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    db_session.add(goal3)
    goals.append(goal3)

    # Goal 4: Public, no struggle
    goal4 = Goal(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        title="Learn Guitar",
        description="Practice guitar 30 minutes daily",
        category="music",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
        current_mood="motivated",
        created_at=datetime.utcnow() - timedelta(days=1)
    )
    db_session.add(goal4)
    goals.append(goal4)

    # Goal 5: Private (should not appear in discovery)
    goal5 = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Secret Project",
        description="Top secret",
        category="personal",
        visibility=GoalVisibility.PRIVATE,
        status=GoalStatus.ACTIVE,
        created_at=datetime.utcnow()
    )
    db_session.add(goal5)
    goals.append(goal5)

    await db_session.commit()
    for goal in goals:
        await db_session.refresh(goal)

    return goals


@pytest.fixture
async def goal_with_nodes(db_session: AsyncSession, test_user):
    """Create a goal with nodes for progress calculation."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Goal with Progress",
        description="Test progress calculation",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    db_session.add(goal)
    await db_session.flush()

    # Create 4 nodes, 3 completed (75% progress)
    for i in range(4):
        node = Node(
            id=uuid.uuid4(),
            goal_id=goal.id,
            title=f"Node {i+1}",
            order=i+1,
            status=NodeStatus.COMPLETED if i < 3 else NodeStatus.ACTIVE
        )
        db_session.add(node)

    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def trending_goal(db_session: AsyncSession, test_user, test_user_2):
    """Create a goal with recent reactions and comments."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Trending Goal",
        description="Has many interactions",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
        created_at=datetime.utcnow() - timedelta(days=7)
    )
    db_session.add(goal)
    await db_session.flush()

    # Add 5 reactions from last 7 days
    for i in range(5):
        interaction = Interaction(
            id=uuid.uuid4(),
            user_id=test_user_2.id,
            target_type=TargetType.GOAL,
            target_id=goal.id,
            interaction_type=InteractionType.REACTION,
            reaction_type="celebrate",
            created_at=datetime.utcnow() - timedelta(days=i)
        )
        db_session.add(interaction)

    # Add 3 comments
    for i in range(3):
        comment = Comment(
            id=uuid.uuid4(),
            user_id=test_user_2.id,
            target_type=CommentTargetType.GOAL,
            target_id=goal.id,
            content=f"Comment {i+1}",
            created_at=datetime.utcnow() - timedelta(days=i)
        )
        db_session.add(comment)

    await db_session.commit()
    await db_session.refresh(goal)
    return goal


class TestListGoalsSearch:
    """Tests for search parameter in list_goals."""

    @pytest.mark.asyncio
    async def test_search_by_title(self, client: AsyncClient, test_goals):
        """Test searching goals by title."""
        response = await client.get("/api/goals?search=python")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Learning Python Programming"

    @pytest.mark.asyncio
    async def test_search_by_description(self, client: AsyncClient, test_goals):
        """Test searching goals by description."""
        response = await client.get("/api/goals?search=data science")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Learning Python Programming"

    @pytest.mark.asyncio
    async def test_search_case_insensitive(self, client: AsyncClient, test_goals):
        """Test that search is case-insensitive."""
        response = await client.get("/api/goals?search=PYTHON")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Learning Python Programming"

    @pytest.mark.asyncio
    async def test_search_no_results(self, client: AsyncClient, test_goals):
        """Test search with no matching results."""
        response = await client.get("/api/goals?search=nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert len(data["goals"]) == 0


class TestListGoalsNeedsHelp:
    """Tests for needs_help parameter in list_goals."""

    @pytest.mark.asyncio
    async def test_needs_help_true(self, client: AsyncClient, test_goals):
        """Test filtering goals that need help."""
        response = await client.get("/api/goals?needs_help=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2  # Goal 2 (struggling) and Goal 3 (stuck)
        moods = [g["current_mood"] for g in data["goals"]]
        assert "struggling" in moods
        assert "stuck" in moods

    @pytest.mark.asyncio
    async def test_needs_help_false(self, client: AsyncClient, test_goals):
        """Test filtering goals that don't need help."""
        response = await client.get("/api/goals?needs_help=false")
        assert response.status_code == 200
        data = response.json()
        # Should not include goals with struggling/stuck mood
        for goal in data["goals"]:
            mood = goal.get("current_mood")
            assert mood not in ["struggling", "stuck"]


class TestListGoalsSorting:
    """Tests for sort parameter in list_goals."""

    @pytest.mark.asyncio
    async def test_sort_newest(self, client: AsyncClient, test_goals):
        """Test sorting by newest (default)."""
        response = await client.get("/api/goals?sort=newest")
        assert response.status_code == 200
        data = response.json()
        # Goals should be in reverse chronological order (newest first)
        # Goal 4 is newest (1 day ago), excluding private Goal 5
        assert data["goals"][0]["title"] == "Learn Guitar"

    @pytest.mark.asyncio
    async def test_sort_trending(self, client: AsyncClient, test_goals, trending_goal):
        """Test sorting by trending (most interactions in last 7 days)."""
        response = await client.get("/api/goals?sort=trending")
        assert response.status_code == 200
        data = response.json()
        # trending_goal should be first (has 8 total interactions)
        assert data["goals"][0]["title"] == "Trending Goal"

    @pytest.mark.asyncio
    async def test_sort_almost_done(self, client: AsyncClient, goal_with_nodes):
        """Test sorting by almost_done (progress > 50%)."""
        response = await client.get("/api/goals?sort=almost_done")
        assert response.status_code == 200
        data = response.json()
        # Only goal_with_nodes has >50% progress (75%)
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Goal with Progress"

    @pytest.mark.asyncio
    async def test_invalid_sort_parameter(self, client: AsyncClient, test_goals):
        """Test invalid sort parameter returns 422."""
        response = await client.get("/api/goals?sort=invalid")
        assert response.status_code == 422


class TestDiscoverGoals:
    """Tests for discover_goals endpoint."""

    @pytest.mark.asyncio
    async def test_discover_returns_owner_info(self, client: AsyncClient, test_goals):
        """Test that discover endpoint includes owner information."""
        response = await client.get("/api/goals/discover")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

        # Check first goal has owner info
        goal = data["goals"][0]
        assert "owner" in goal
        assert "user_id" in goal["owner"]
        assert "username" in goal["owner"]
        assert "display_name" in goal["owner"]
        assert "avatar_url" in goal["owner"]

    @pytest.mark.asyncio
    async def test_discover_only_public_goals(self, client: AsyncClient, test_goals):
        """Test that discover only returns public goals."""
        response = await client.get("/api/goals/discover")
        assert response.status_code == 200
        data = response.json()

        # Private goal should not be in results
        titles = [g["title"] for g in data["goals"]]
        assert "Secret Project" not in titles

        # All returned goals should be public
        for goal in data["goals"]:
            assert goal["visibility"] == "public"

    @pytest.mark.asyncio
    async def test_discover_with_search(self, client: AsyncClient, test_goals):
        """Test discover with search parameter."""
        response = await client.get("/api/goals/discover?search=guitar")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Learn Guitar"

    @pytest.mark.asyncio
    async def test_discover_with_category(self, client: AsyncClient, test_goals):
        """Test discover with category filter."""
        response = await client.get("/api/goals/discover?category=health")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["category"] == "health"

    @pytest.mark.asyncio
    async def test_discover_with_needs_help(self, client: AsyncClient, test_goals):
        """Test discover with needs_help filter."""
        response = await client.get("/api/goals/discover?needs_help=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2

        # All goals should have struggling/stuck mood
        for goal in data["goals"]:
            assert goal["current_mood"] in ["struggling", "stuck"]

    @pytest.mark.asyncio
    async def test_discover_with_sort_trending(self, client: AsyncClient, test_goals, trending_goal):
        """Test discover with trending sort."""
        response = await client.get("/api/goals/discover?sort=trending")
        assert response.status_code == 200
        data = response.json()
        # trending_goal should be first
        assert data["goals"][0]["title"] == "Trending Goal"

    @pytest.mark.asyncio
    async def test_discover_with_sort_almost_done(self, client: AsyncClient, goal_with_nodes):
        """Test discover with almost_done sort."""
        response = await client.get("/api/goals/discover?sort=almost_done")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Goal with Progress"

    @pytest.mark.asyncio
    async def test_discover_pagination(self, client: AsyncClient, test_goals):
        """Test discover with pagination."""
        response = await client.get("/api/goals/discover?limit=2&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data["goals"]) == 2

        # Get next page
        response2 = await client.get("/api/goals/discover?limit=2&offset=2")
        assert response2.status_code == 200
        data2 = response2.json()

        # Goals should be different
        first_ids = {g["id"] for g in data["goals"]}
        second_ids = {g["id"] for g in data2["goals"]}
        assert first_ids.isdisjoint(second_ids)


class TestListGoalsCombinedFilters:
    """Tests for combining multiple filters."""

    @pytest.mark.asyncio
    async def test_search_and_category(self, client: AsyncClient, test_goals):
        """Test combining search and category filters."""
        response = await client.get("/api/goals?search=python&category=education")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Learning Python Programming"

    @pytest.mark.asyncio
    async def test_category_and_needs_help(self, client: AsyncClient, test_goals):
        """Test combining category and needs_help filters."""
        response = await client.get("/api/goals?category=health&needs_help=true")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Get Fit and Healthy"

    @pytest.mark.asyncio
    async def test_search_and_sort(self, client: AsyncClient, test_goals):
        """Test combining search and sort."""
        response = await client.get("/api/goals?search=app&sort=newest")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["goals"][0]["title"] == "Build a Mobile App"
