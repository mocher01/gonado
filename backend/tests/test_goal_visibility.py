"""
Tests for goal visibility feature.

Issue #58: Goal Visibility Toggle (Public/Private)
"""
import uuid
import pytest
from sqlalchemy import select
from httpx import AsyncClient

from app.models.goal import Goal, GoalStatus, GoalVisibility
from app.models.user import User


@pytest.fixture
async def public_goal(db_session, test_user) -> Goal:
    """Create a public goal for testing."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Public Goal",
        description="This is a public goal",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def private_goal(db_session, test_user) -> Goal:
    """Create a private goal for testing."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Private Goal",
        description="This is a private goal",
        category="test",
        visibility=GoalVisibility.PRIVATE,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def other_user_public_goal(db_session, test_user_2) -> Goal:
    """Create a public goal owned by another user."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        title="Other User's Public Goal",
        description="Another user's public goal",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def other_user_private_goal(db_session, test_user_2) -> Goal:
    """Create a private goal owned by another user."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        title="Other User's Private Goal",
        description="Another user's private goal",
        category="test",
        visibility=GoalVisibility.PRIVATE,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


class TestGoalVisibilityCreate:
    """Tests for creating goals with visibility."""

    @pytest.mark.asyncio
    async def test_create_goal_default_visibility(
        self, client: AsyncClient, auth_headers
    ):
        """Test that goals default to public visibility."""
        response = await client.post(
            "/api/goals",
            json={
                "title": "New Goal",
                "description": "Test goal",
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["visibility"] == "public"

    @pytest.mark.asyncio
    async def test_create_goal_with_public_visibility(
        self, client: AsyncClient, auth_headers
    ):
        """Test creating a public goal."""
        response = await client.post(
            "/api/goals",
            json={
                "title": "Public Goal",
                "description": "A public goal",
                "visibility": "public",
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["visibility"] == "public"

    @pytest.mark.asyncio
    async def test_create_goal_with_private_visibility(
        self, client: AsyncClient, auth_headers
    ):
        """Test creating a private goal."""
        response = await client.post(
            "/api/goals",
            json={
                "title": "Private Goal",
                "description": "A private goal",
                "visibility": "private",
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["visibility"] == "private"


class TestGoalVisibilityUpdate:
    """Tests for updating goal visibility."""

    @pytest.mark.asyncio
    async def test_owner_can_toggle_visibility_to_private(
        self, client: AsyncClient, db_session, auth_headers, public_goal
    ):
        """Test that owner can change visibility from public to private."""
        response = await client.put(
            f"/api/goals/{public_goal.id}",
            json={"visibility": "private"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["visibility"] == "private"

        # Verify in database
        await db_session.refresh(public_goal)
        assert public_goal.visibility == GoalVisibility.PRIVATE

    @pytest.mark.asyncio
    async def test_owner_can_toggle_visibility_to_public(
        self, client: AsyncClient, db_session, auth_headers, private_goal
    ):
        """Test that owner can change visibility from private to public."""
        response = await client.put(
            f"/api/goals/{private_goal.id}",
            json={"visibility": "public"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["visibility"] == "public"

        # Verify in database
        await db_session.refresh(private_goal)
        assert private_goal.visibility == GoalVisibility.PUBLIC

    @pytest.mark.asyncio
    async def test_non_owner_cannot_update_visibility(
        self, client: AsyncClient, auth_headers, other_user_public_goal
    ):
        """Test that non-owner cannot change goal visibility."""
        response = await client.put(
            f"/api/goals/{other_user_public_goal.id}",
            json={"visibility": "private"},
            headers=auth_headers  # User 1 trying to modify User 2's goal
        )
        assert response.status_code == 404


class TestGoalVisibilityAccess:
    """Tests for accessing goals based on visibility."""

    @pytest.mark.asyncio
    async def test_owner_can_view_own_private_goal(
        self, client: AsyncClient, auth_headers, private_goal
    ):
        """Test that owner can view their own private goal."""
        response = await client.get(
            f"/api/goals/{private_goal.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(private_goal.id)
        assert data["visibility"] == "private"

    @pytest.mark.asyncio
    async def test_owner_can_view_own_public_goal(
        self, client: AsyncClient, auth_headers, public_goal
    ):
        """Test that owner can view their own public goal."""
        response = await client.get(
            f"/api/goals/{public_goal.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(public_goal.id)
        assert data["visibility"] == "public"

    @pytest.mark.asyncio
    async def test_other_user_can_view_public_goal(
        self, client: AsyncClient, auth_headers, other_user_public_goal
    ):
        """Test that other users can view public goals."""
        response = await client.get(
            f"/api/goals/{other_user_public_goal.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(other_user_public_goal.id)

    @pytest.mark.asyncio
    async def test_other_user_cannot_view_private_goal(
        self, client: AsyncClient, auth_headers, other_user_private_goal
    ):
        """Test that other users cannot view private goals."""
        response = await client.get(
            f"/api/goals/{other_user_private_goal.id}",
            headers=auth_headers
        )
        # Should return 404 to not leak that the goal exists
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unauthenticated_can_view_public_goal(
        self, client: AsyncClient, public_goal
    ):
        """Test that unauthenticated users can view public goals."""
        response = await client.get(f"/api/goals/{public_goal.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(public_goal.id)

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_view_private_goal(
        self, client: AsyncClient, private_goal
    ):
        """Test that unauthenticated users cannot view private goals."""
        response = await client.get(f"/api/goals/{private_goal.id}")
        assert response.status_code == 404


class TestGoalVisibilityList:
    """Tests for listing goals with visibility filtering."""

    @pytest.mark.asyncio
    async def test_discover_only_shows_public_goals(
        self, client: AsyncClient, db_session, test_user, public_goal, private_goal
    ):
        """Test that public discovery only shows public goals."""
        # Without specifying user_id, should only show public goals
        response = await client.get("/api/goals")
        assert response.status_code == 200
        data = response.json()

        goal_ids = [g["id"] for g in data["goals"]]
        assert str(public_goal.id) in goal_ids
        assert str(private_goal.id) not in goal_ids

    @pytest.mark.asyncio
    async def test_owner_sees_all_own_goals(
        self, client: AsyncClient, auth_headers, test_user, public_goal, private_goal
    ):
        """Test that owner sees all their goals including private ones."""
        response = await client.get(
            f"/api/goals?user_id={test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()

        goal_ids = [g["id"] for g in data["goals"]]
        assert str(public_goal.id) in goal_ids
        assert str(private_goal.id) in goal_ids

    @pytest.mark.asyncio
    async def test_other_user_only_sees_public_goals_of_user(
        self, client: AsyncClient, auth_headers, test_user_2,
        other_user_public_goal, other_user_private_goal
    ):
        """Test that viewing another user's goals only shows public ones."""
        response = await client.get(
            f"/api/goals?user_id={test_user_2.id}",
            headers=auth_headers  # User 1 viewing User 2's goals
        )
        assert response.status_code == 200
        data = response.json()

        goal_ids = [g["id"] for g in data["goals"]]
        assert str(other_user_public_goal.id) in goal_ids
        assert str(other_user_private_goal.id) not in goal_ids

    @pytest.mark.asyncio
    async def test_unauthenticated_only_sees_public_goals_of_user(
        self, client: AsyncClient, test_user_2,
        other_user_public_goal, other_user_private_goal
    ):
        """Test that unauthenticated users only see public goals."""
        response = await client.get(f"/api/goals?user_id={test_user_2.id}")
        assert response.status_code == 200
        data = response.json()

        goal_ids = [g["id"] for g in data["goals"]]
        assert str(other_user_public_goal.id) in goal_ids
        assert str(other_user_private_goal.id) not in goal_ids
