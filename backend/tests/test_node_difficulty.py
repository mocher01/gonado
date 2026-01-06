"""
Tests for node difficulty levels feature.
Issue #62: Feature: Node Difficulty Levels (1-5 Scale)
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

from app.models.goal import Goal, GoalStatus
from app.models.node import Node, NodeStatus
from app.schemas.node import NodeCreate, NodeUpdate


@pytest.fixture
async def test_goal(db_session: AsyncSession, test_user):
    """Create a test goal."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Test Goal for Difficulty",
        description="A test goal",
        visibility="public",
        world_theme="mountain",
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def test_node_with_difficulty(db_session: AsyncSession, test_goal):
    """Create a test node with difficulty level 5."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=test_goal.id,
        title="Hard Task",
        description="A very difficult task",
        order=1,
        status=NodeStatus.ACTIVE,
        difficulty=5,
        position_x=100.0,
        position_y=200.0,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


class TestNodeDifficultyModel:
    """Tests for Node difficulty in the database model."""

    @pytest.mark.asyncio
    async def test_set_node_difficulty(self, db_session: AsyncSession, test_goal):
        """Test that difficulty can be set when creating a node."""
        node = Node(
            id=uuid.uuid4(),
            goal_id=test_goal.id,
            title="Hard Task",
            description="A very difficult task",
            order=1,
            status=NodeStatus.ACTIVE,
            difficulty=5,
            position_x=100.0,
            position_y=200.0,
        )
        db_session.add(node)
        await db_session.commit()
        await db_session.refresh(node)

        assert node.difficulty == 5

    @pytest.mark.asyncio
    async def test_default_difficulty(self, db_session: AsyncSession, test_goal):
        """Test that default difficulty is 3 (medium)."""
        node = Node(
            id=uuid.uuid4(),
            goal_id=test_goal.id,
            title="Default Task",
            description="A task with default difficulty",
            order=1,
            status=NodeStatus.ACTIVE,
            position_x=100.0,
            position_y=200.0,
        )
        db_session.add(node)
        await db_session.commit()
        await db_session.refresh(node)

        assert node.difficulty == 3


class TestNodeDifficultyValidation:
    """Tests for difficulty validation in Pydantic schemas."""

    def test_difficulty_validation_valid_values(self):
        """Test that valid difficulty values (1-5) pass validation."""
        for difficulty in [1, 2, 3, 4, 5]:
            node_data = NodeCreate(
                title="Test Task",
                order=1,
                difficulty=difficulty,
            )
            assert node_data.difficulty == difficulty

    def test_difficulty_validation_too_high(self):
        """Test that difficulty > 5 raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            NodeCreate(
                title="Invalid Task",
                order=1,
                difficulty=6,
            )
        assert "Difficulty must be between 1 and 5" in str(exc_info.value)

    def test_difficulty_validation_too_low(self):
        """Test that difficulty < 1 raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            NodeCreate(
                title="Invalid Task",
                order=1,
                difficulty=0,
            )
        assert "Difficulty must be between 1 and 5" in str(exc_info.value)

    def test_difficulty_validation_negative(self):
        """Test that negative difficulty raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            NodeCreate(
                title="Invalid Task",
                order=1,
                difficulty=-1,
            )
        assert "Difficulty must be between 1 and 5" in str(exc_info.value)

    def test_update_difficulty_validation(self):
        """Test that NodeUpdate also validates difficulty."""
        # Valid update
        update = NodeUpdate(difficulty=4)
        assert update.difficulty == 4

        # Invalid update
        with pytest.raises(ValidationError) as exc_info:
            NodeUpdate(difficulty=10)
        assert "Difficulty must be between 1 and 5" in str(exc_info.value)

    def test_update_difficulty_none_is_valid(self):
        """Test that None difficulty is valid for updates (partial update)."""
        update = NodeUpdate(difficulty=None)
        assert update.difficulty is None


class TestNodeDifficultyAPI:
    """Tests for difficulty through the API endpoints."""

    @pytest.mark.asyncio
    async def test_get_node_returns_difficulty(
        self, client: AsyncClient, test_node_with_difficulty
    ):
        """Test that GET /api/nodes/{id} returns difficulty."""
        response = await client.get(f"/api/nodes/{test_node_with_difficulty.id}")

        assert response.status_code == 200
        data = response.json()
        assert "difficulty" in data
        assert data["difficulty"] == 5

    @pytest.mark.asyncio
    async def test_update_node_difficulty(
        self, client: AsyncClient, test_node_with_difficulty, auth_headers
    ):
        """Test that PUT /api/nodes/{id} can update difficulty."""
        response = await client.put(
            f"/api/nodes/{test_node_with_difficulty.id}",
            json={"difficulty": 2},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["difficulty"] == 2

    @pytest.mark.asyncio
    async def test_update_node_difficulty_validation_api(
        self, client: AsyncClient, test_node_with_difficulty, auth_headers
    ):
        """Test that API rejects invalid difficulty values."""
        response = await client.put(
            f"/api/nodes/{test_node_with_difficulty.id}",
            json={"difficulty": 10},
            headers=auth_headers,
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_get_goal_nodes_returns_difficulty(
        self, client: AsyncClient, test_node_with_difficulty, test_goal
    ):
        """Test that GET /api/goals/{id}/nodes returns difficulty for each node."""
        response = await client.get(f"/api/goals/{test_goal.id}/nodes")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["difficulty"] == 5


class TestHighDifficultyStruggleDetection:
    """Tests for high difficulty (4-5) triggering struggle detection."""

    @pytest.mark.asyncio
    async def test_high_difficulty_node_detected(
        self, db_session: AsyncSession, test_goal
    ):
        """Test that high difficulty nodes (4-5) can be identified."""
        # Create nodes with various difficulties
        easy_node = Node(
            id=uuid.uuid4(),
            goal_id=test_goal.id,
            title="Easy Task",
            order=1,
            status=NodeStatus.ACTIVE,
            difficulty=1,
            position_x=100.0,
            position_y=200.0,
        )
        hard_node = Node(
            id=uuid.uuid4(),
            goal_id=test_goal.id,
            title="Hard Task",
            order=2,
            status=NodeStatus.LOCKED,
            difficulty=4,
            position_x=200.0,
            position_y=200.0,
        )
        very_hard_node = Node(
            id=uuid.uuid4(),
            goal_id=test_goal.id,
            title="Very Hard Task",
            order=3,
            status=NodeStatus.LOCKED,
            difficulty=5,
            position_x=300.0,
            position_y=200.0,
        )

        db_session.add_all([easy_node, hard_node, very_hard_node])
        await db_session.commit()

        # Verify difficulties
        await db_session.refresh(easy_node)
        await db_session.refresh(hard_node)
        await db_session.refresh(very_hard_node)

        # High difficulty nodes (4-5) should be identifiable
        assert easy_node.difficulty < 4  # Not high difficulty
        assert hard_node.difficulty >= 4  # High difficulty
        assert very_hard_node.difficulty >= 4  # High difficulty

        # These nodes could trigger struggle detection
        high_difficulty_nodes = [n for n in [easy_node, hard_node, very_hard_node] if n.difficulty >= 4]
        assert len(high_difficulty_nodes) == 2
        assert hard_node in high_difficulty_nodes
        assert very_hard_node in high_difficulty_nodes


class TestDifficultyBackwardsCompatibility:
    """Tests to ensure backwards compatibility with existing nodes."""

    @pytest.mark.asyncio
    async def test_existing_nodes_get_default_difficulty(
        self, db_session: AsyncSession, test_goal
    ):
        """Test that nodes without explicit difficulty get default value."""
        # Simulate an existing node (would have been migrated with default 3)
        node = Node(
            id=uuid.uuid4(),
            goal_id=test_goal.id,
            title="Existing Task",
            description="An existing task from before difficulty feature",
            order=1,
            status=NodeStatus.ACTIVE,
            position_x=100.0,
            position_y=200.0,
            # difficulty not explicitly set
        )
        db_session.add(node)
        await db_session.commit()
        await db_session.refresh(node)

        # Should have default difficulty of 3
        assert node.difficulty == 3
