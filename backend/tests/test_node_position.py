"""
Tests for node position update endpoint.
Issue #43: Node dragging works as viewer but not as owner
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.models.node import Node, NodeStatus


@pytest.fixture
async def test_goal(db_session: AsyncSession, test_user):
    """Create a test goal."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Test Goal",
        description="A test goal",
        visibility="public",
        world_theme="mountain",
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def test_node(db_session: AsyncSession, test_goal):
    """Create a test node."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=test_goal.id,
        title="Test Node",
        description="A test node",
        order=1,
        status=NodeStatus.ACTIVE,
        position_x=100.0,
        position_y=200.0,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


class TestNodePositionUpdate:
    """Tests for PATCH /api/nodes/{node_id}/position endpoint."""

    @pytest.mark.asyncio
    async def test_owner_can_update_position(
        self, client: AsyncClient, test_node, auth_headers, db_session
    ):
        """Test that goal owner can update node position."""
        new_x, new_y = 300.0, 400.0

        response = await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_x": new_x, "position_y": new_y},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["position_x"] == new_x
        assert data["position_y"] == new_y
        assert data["id"] == str(test_node.id)

    @pytest.mark.asyncio
    async def test_non_owner_cannot_update_position(
        self, client: AsyncClient, test_node, auth_headers_user_2
    ):
        """Test that non-owner cannot update node position."""
        new_x, new_y = 300.0, 400.0

        response = await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_x": new_x, "position_y": new_y},
            headers=auth_headers_user_2,
        )

        assert response.status_code == 404
        assert "not found or not authorized" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_update_position(
        self, client: AsyncClient, test_node
    ):
        """Test that unauthenticated user cannot update node position."""
        new_x, new_y = 300.0, 400.0

        response = await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_x": new_x, "position_y": new_y},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_nonexistent_node_returns_404(
        self, client: AsyncClient, auth_headers
    ):
        """Test that updating a nonexistent node returns 404."""
        fake_node_id = uuid.uuid4()
        new_x, new_y = 300.0, 400.0

        response = await client.patch(
            f"/api/nodes/{fake_node_id}/position",
            json={"position_x": new_x, "position_y": new_y},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_position_update_requires_both_coordinates(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test that both position_x and position_y are required."""
        # Missing position_y
        response = await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_x": 300.0},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Missing position_x
        response = await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_y": 400.0},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_position_update_persists(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test that position updates persist and can be retrieved."""
        new_x, new_y = 500.0, 600.0

        # Update position
        await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_x": new_x, "position_y": new_y},
            headers=auth_headers,
        )

        # Retrieve node and verify position
        response = await client.get(f"/api/nodes/{test_node.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["position_x"] == new_x
        assert data["position_y"] == new_y

    @pytest.mark.asyncio
    async def test_position_accepts_negative_values(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test that negative position values are accepted."""
        new_x, new_y = -100.0, -200.0

        response = await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_x": new_x, "position_y": new_y},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["position_x"] == new_x
        assert data["position_y"] == new_y

    @pytest.mark.asyncio
    async def test_position_accepts_float_values(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test that float position values are accepted."""
        new_x, new_y = 123.456, 789.012

        response = await client.patch(
            f"/api/nodes/{test_node.id}/position",
            json={"position_x": new_x, "position_y": new_y},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert abs(data["position_x"] - new_x) < 0.001
        assert abs(data["position_y"] - new_y) < 0.001
