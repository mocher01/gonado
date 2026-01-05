"""
Tests for node completion feature.
Issue #59: Feature: Complete Node (Mark as Done)
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.goal import Goal, GoalStatus
from app.models.node import Node, NodeStatus


@pytest.fixture
async def test_goal(db_session: AsyncSession, test_user):
    """Create a test goal."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Test Goal for Completion",
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
async def test_goal_with_nodes(db_session: AsyncSession, test_user):
    """Create a test goal with multiple nodes."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Test Goal with Multiple Nodes",
        description="A test goal",
        visibility="public",
        world_theme="mountain",
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.flush()

    # Create three nodes: first active, others locked
    node1 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 1",
        description="First node",
        order=1,
        status=NodeStatus.ACTIVE,
        position_x=100.0,
        position_y=200.0,
    )
    node2 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 2",
        description="Second node",
        order=2,
        status=NodeStatus.LOCKED,
        position_x=300.0,
        position_y=200.0,
    )
    node3 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 3",
        description="Third node",
        order=3,
        status=NodeStatus.LOCKED,
        position_x=500.0,
        position_y=200.0,
    )
    db_session.add_all([node1, node2, node3])
    await db_session.commit()
    await db_session.refresh(goal)
    await db_session.refresh(node1)
    await db_session.refresh(node2)
    await db_session.refresh(node3)
    return {"goal": goal, "nodes": [node1, node2, node3]}


@pytest.fixture
async def test_active_node(db_session: AsyncSession, test_goal):
    """Create an active test node."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=test_goal.id,
        title="Active Test Node",
        description="An active test node",
        order=1,
        status=NodeStatus.ACTIVE,
        position_x=100.0,
        position_y=200.0,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


@pytest.fixture
async def test_locked_node(db_session: AsyncSession, test_goal):
    """Create a locked test node."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=test_goal.id,
        title="Locked Test Node",
        description="A locked test node",
        order=2,
        status=NodeStatus.LOCKED,
        position_x=100.0,
        position_y=200.0,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


class TestNodeCompletion:
    """Tests for POST /api/nodes/{node_id}/complete endpoint."""

    @pytest.mark.asyncio
    async def test_owner_can_complete_active_node(
        self, client: AsyncClient, test_active_node, auth_headers, db_session
    ):
        """Test that goal owner can complete an active node."""
        response = await client.post(
            f"/api/nodes/{test_active_node.id}/complete",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["completed_at"] is not None
        assert data["id"] == str(test_active_node.id)

    @pytest.mark.asyncio
    async def test_cannot_complete_locked_node(
        self, client: AsyncClient, test_locked_node, auth_headers
    ):
        """Test that a locked node cannot be completed."""
        response = await client.post(
            f"/api/nodes/{test_locked_node.id}/complete",
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "not active" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_non_owner_cannot_complete_node(
        self, client: AsyncClient, test_active_node, auth_headers_user_2
    ):
        """Test that non-owner cannot complete a node."""
        response = await client.post(
            f"/api/nodes/{test_active_node.id}/complete",
            headers=auth_headers_user_2,
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_complete_node(
        self, client: AsyncClient, test_active_node
    ):
        """Test that unauthenticated user cannot complete a node."""
        response = await client.post(
            f"/api/nodes/{test_active_node.id}/complete",
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_complete_nonexistent_node_returns_404(
        self, client: AsyncClient, auth_headers
    ):
        """Test that completing a nonexistent node returns 404."""
        fake_node_id = uuid.uuid4()

        response = await client.post(
            f"/api/nodes/{fake_node_id}/complete",
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_completing_node_unlocks_next_node(
        self, client: AsyncClient, test_goal_with_nodes, auth_headers, db_session
    ):
        """Test that completing a node unlocks the next node in order."""
        nodes = test_goal_with_nodes["nodes"]
        first_node = nodes[0]
        second_node = nodes[1]

        # Complete the first node
        response = await client.post(
            f"/api/nodes/{first_node.id}/complete",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Check that the second node is now active
        await db_session.refresh(second_node)
        assert second_node.status == NodeStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_completing_last_node_completes_goal(
        self, client: AsyncClient, db_session, test_user, auth_headers
    ):
        """Test that completing all nodes marks the goal as completed."""
        # Create a goal with a single node
        goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Single Node Goal",
            description="A goal with one node",
            visibility="public",
            world_theme="mountain",
            status=GoalStatus.ACTIVE,
        )
        db_session.add(goal)
        await db_session.flush()

        node = Node(
            id=uuid.uuid4(),
            goal_id=goal.id,
            title="Only Node",
            description="The only node",
            order=1,
            status=NodeStatus.ACTIVE,
            position_x=100.0,
            position_y=200.0,
        )
        db_session.add(node)
        await db_session.commit()
        await db_session.refresh(goal)
        await db_session.refresh(node)

        # Complete the only node
        response = await client.post(
            f"/api/nodes/{node.id}/complete",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Check that the goal is now completed
        await db_session.refresh(goal)
        assert goal.status == GoalStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_completed_at_timestamp_is_set(
        self, client: AsyncClient, test_active_node, auth_headers, db_session
    ):
        """Test that completed_at timestamp is set on completion."""
        # Verify no completed_at before completion
        assert test_active_node.completed_at is None

        response = await client.post(
            f"/api/nodes/{test_active_node.id}/complete",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Verify completed_at is set
        await db_session.refresh(test_active_node)
        assert test_active_node.completed_at is not None

    @pytest.mark.asyncio
    async def test_cannot_complete_already_completed_node(
        self, client: AsyncClient, test_active_node, auth_headers
    ):
        """Test that an already completed node cannot be completed again."""
        # Complete the node
        response = await client.post(
            f"/api/nodes/{test_active_node.id}/complete",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Try to complete again
        response = await client.post(
            f"/api/nodes/{test_active_node.id}/complete",
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "not active" in response.json()["detail"].lower()


class TestNodeStatusUpdate:
    """Tests for PUT /api/nodes/{node_id}/status endpoint."""

    @pytest.mark.asyncio
    async def test_owner_can_update_status(
        self, client: AsyncClient, test_active_node, auth_headers
    ):
        """Test that goal owner can update node status."""
        response = await client.put(
            f"/api/nodes/{test_active_node.id}/status",
            json={"status": "completed"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_non_owner_cannot_update_status(
        self, client: AsyncClient, test_active_node, auth_headers_user_2
    ):
        """Test that non-owner cannot update node status."""
        response = await client.put(
            f"/api/nodes/{test_active_node.id}/status",
            json={"status": "completed"},
            headers=auth_headers_user_2,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_update_status(
        self, client: AsyncClient, test_active_node
    ):
        """Test that unauthenticated user cannot update node status."""
        response = await client.put(
            f"/api/nodes/{test_active_node.id}/status",
            json={"status": "completed"},
        )

        assert response.status_code == 401


class TestProgressCalculation:
    """Tests for goal progress calculation based on completed nodes."""

    @pytest.mark.asyncio
    async def test_progress_updates_on_node_completion(
        self, client: AsyncClient, test_goal_with_nodes, auth_headers, db_session
    ):
        """Test that completing nodes updates the overall progress."""
        goal = test_goal_with_nodes["goal"]
        nodes = test_goal_with_nodes["nodes"]

        # Initially: 0 completed out of 3 nodes (0%)
        response = await client.get(f"/api/goals/{goal.id}/nodes")
        assert response.status_code == 200
        node_data = response.json()
        completed = sum(1 for n in node_data if n["status"] == "completed")
        assert completed == 0

        # Complete first node: 1 out of 3 (33%)
        await client.post(
            f"/api/nodes/{nodes[0].id}/complete",
            headers=auth_headers,
        )

        response = await client.get(f"/api/goals/{goal.id}/nodes")
        node_data = response.json()
        completed = sum(1 for n in node_data if n["status"] == "completed")
        assert completed == 1

        # Complete second node (now active): 2 out of 3 (67%)
        # Need to refresh to get the unlocked status
        await db_session.refresh(nodes[1])
        await client.post(
            f"/api/nodes/{nodes[1].id}/complete",
            headers=auth_headers,
        )

        response = await client.get(f"/api/goals/{goal.id}/nodes")
        node_data = response.json()
        completed = sum(1 for n in node_data if n["status"] == "completed")
        assert completed == 2
