"""
Tests for node CRUD operations (Create, Read, Update, Delete).
Issue #61: Feature: Add/Edit/Delete Nodes
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.goal import Goal, GoalStatus
from app.models.node import Node, NodeStatus, NodeType


@pytest.fixture
async def test_goal(db_session: AsyncSession, test_user):
    """Create a test goal owned by test_user."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Test Goal for Node CRUD",
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
async def test_goal_user_2(db_session: AsyncSession, test_user_2):
    """Create a test goal owned by test_user_2."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        title="Other User Goal",
        description="Another user's goal",
        visibility="public",
        world_theme="forest",
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def test_node(db_session: AsyncSession, test_goal):
    """Create a test node for the test goal."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=test_goal.id,
        title="Existing Test Node",
        description="An existing node for testing",
        order=1,
        status=NodeStatus.ACTIVE,
        node_type=NodeType.TASK,
        position_x=100.0,
        position_y=200.0,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


class TestCreateNode:
    """Tests for POST /api/goals/{goal_id}/nodes endpoint."""

    @pytest.mark.asyncio
    async def test_create_node_success(
        self, client: AsyncClient, test_goal, auth_headers
    ):
        """Test that goal owner can create a new node."""
        node_data = {
            "title": "New Node",
            "description": "A new node",
            "order": 1,
            "node_type": "task",
        }

        response = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json=node_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Node"
        assert data["description"] == "A new node"
        assert data["order"] == 1
        assert data["node_type"] == "task"
        assert data["goal_id"] == str(test_goal.id)

    @pytest.mark.asyncio
    async def test_create_milestone_node(
        self, client: AsyncClient, test_goal, auth_headers
    ):
        """Test creating a milestone type node."""
        node_data = {
            "title": "Milestone Node",
            "description": "A major checkpoint",
            "order": 1,
            "node_type": "milestone",
            "estimated_duration": 4,
        }

        response = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json=node_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["node_type"] == "milestone"
        assert data["estimated_duration"] == 4

    @pytest.mark.asyncio
    async def test_create_node_with_position(
        self, client: AsyncClient, test_goal, auth_headers
    ):
        """Test creating a node with custom position."""
        node_data = {
            "title": "Positioned Node",
            "order": 1,
            "position_x": 500.0,
            "position_y": 300.0,
        }

        response = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json=node_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["position_x"] == 500.0
        assert data["position_y"] == 300.0

    @pytest.mark.asyncio
    async def test_create_node_requires_authentication(
        self, client: AsyncClient, test_goal
    ):
        """Test that creating a node requires authentication."""
        node_data = {
            "title": "New Node",
            "order": 1,
        }

        response = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json=node_data,
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_node_requires_ownership(
        self, client: AsyncClient, test_goal, auth_headers_user_2
    ):
        """Test that only goal owner can create nodes."""
        node_data = {
            "title": "Unauthorized Node",
            "order": 1,
        }

        response = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json=node_data,
            headers=auth_headers_user_2,
        )

        assert response.status_code == 404  # Goal not found (ownership check)

    @pytest.mark.asyncio
    async def test_create_node_nonexistent_goal(
        self, client: AsyncClient, auth_headers
    ):
        """Test creating node for nonexistent goal returns 404."""
        fake_goal_id = uuid.uuid4()
        node_data = {
            "title": "New Node",
            "order": 1,
        }

        response = await client.post(
            f"/api/goals/{fake_goal_id}/nodes",
            json=node_data,
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestUpdateNode:
    """Tests for PUT /api/nodes/{node_id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_node_title(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test updating node title."""
        response = await client.put(
            f"/api/nodes/{test_node.id}",
            json={"title": "Updated Title"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_node_description(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test updating node description."""
        response = await client.put(
            f"/api/nodes/{test_node.id}",
            json={"description": "New description"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "New description"

    @pytest.mark.asyncio
    async def test_update_node_type(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test updating node type."""
        response = await client.put(
            f"/api/nodes/{test_node.id}",
            json={"node_type": "milestone"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["node_type"] == "milestone"

    @pytest.mark.asyncio
    async def test_update_node_extra_data(
        self, client: AsyncClient, test_node, auth_headers
    ):
        """Test updating node extra_data (checklist)."""
        checklist = [
            {"id": "item-1", "text": "First task", "completed": False},
            {"id": "item-2", "text": "Second task", "completed": True},
        ]

        response = await client.put(
            f"/api/nodes/{test_node.id}",
            json={"extra_data": {"checklist": checklist}},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "checklist" in data["extra_data"]
        assert len(data["extra_data"]["checklist"]) == 2

    @pytest.mark.asyncio
    async def test_update_node_requires_authentication(
        self, client: AsyncClient, test_node
    ):
        """Test that updating node requires authentication."""
        response = await client.put(
            f"/api/nodes/{test_node.id}",
            json={"title": "Updated"},
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_node_requires_ownership(
        self, client: AsyncClient, test_node, auth_headers_user_2
    ):
        """Test that only goal owner can update nodes."""
        response = await client.put(
            f"/api/nodes/{test_node.id}",
            json={"title": "Unauthorized Update"},
            headers=auth_headers_user_2,
        )

        assert response.status_code == 404  # Node not found (ownership check)

    @pytest.mark.asyncio
    async def test_update_nonexistent_node(
        self, client: AsyncClient, auth_headers
    ):
        """Test updating nonexistent node returns 404."""
        fake_node_id = uuid.uuid4()

        response = await client.put(
            f"/api/nodes/{fake_node_id}",
            json={"title": "Updated"},
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestDeleteNode:
    """Tests for DELETE /api/nodes/{node_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_node_success(
        self, client: AsyncClient, test_node, auth_headers, db_session
    ):
        """Test that goal owner can delete a node."""
        node_id = test_node.id

        response = await client.delete(
            f"/api/nodes/{node_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204

        # Verify node is deleted
        result = await db_session.execute(
            select(Node).where(Node.id == node_id)
        )
        deleted_node = result.scalar_one_or_none()
        assert deleted_node is None

    @pytest.mark.asyncio
    async def test_delete_node_requires_authentication(
        self, client: AsyncClient, test_node
    ):
        """Test that deleting node requires authentication."""
        response = await client.delete(
            f"/api/nodes/{test_node.id}",
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_node_requires_ownership(
        self, client: AsyncClient, test_node, auth_headers_user_2
    ):
        """Test that only goal owner can delete nodes."""
        response = await client.delete(
            f"/api/nodes/{test_node.id}",
            headers=auth_headers_user_2,
        )

        assert response.status_code == 404  # Node not found (ownership check)

    @pytest.mark.asyncio
    async def test_delete_nonexistent_node(
        self, client: AsyncClient, auth_headers
    ):
        """Test deleting nonexistent node returns 404."""
        fake_node_id = uuid.uuid4()

        response = await client.delete(
            f"/api/nodes/{fake_node_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestGetNode:
    """Tests for GET /api/nodes/{node_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_node_success(
        self, client: AsyncClient, test_node
    ):
        """Test getting a node by ID (public - no auth required)."""
        response = await client.get(f"/api/nodes/{test_node.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_node.id)
        assert data["title"] == test_node.title

    @pytest.mark.asyncio
    async def test_get_nonexistent_node(
        self, client: AsyncClient
    ):
        """Test getting nonexistent node returns 404."""
        fake_node_id = uuid.uuid4()

        response = await client.get(f"/api/nodes/{fake_node_id}")

        assert response.status_code == 404


class TestNodeCrudPermissions:
    """Test permission-based scenarios for node CRUD."""

    @pytest.mark.asyncio
    async def test_owner_full_crud_access(
        self, client: AsyncClient, test_goal, auth_headers, db_session
    ):
        """Test that owner can create, read, update, and delete nodes."""
        # Create
        create_response = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json={"title": "CRUD Test Node", "order": 1},
            headers=auth_headers,
        )
        assert create_response.status_code == 201
        node_id = create_response.json()["id"]

        # Read
        read_response = await client.get(f"/api/nodes/{node_id}")
        assert read_response.status_code == 200
        assert read_response.json()["title"] == "CRUD Test Node"

        # Update
        update_response = await client.put(
            f"/api/nodes/{node_id}",
            json={"title": "Updated CRUD Node"},
            headers=auth_headers,
        )
        assert update_response.status_code == 200
        assert update_response.json()["title"] == "Updated CRUD Node"

        # Delete
        delete_response = await client.delete(
            f"/api/nodes/{node_id}",
            headers=auth_headers,
        )
        assert delete_response.status_code == 204

        # Verify deletion
        verify_response = await client.get(f"/api/nodes/{node_id}")
        assert verify_response.status_code == 404

    @pytest.mark.asyncio
    async def test_non_owner_cannot_modify_nodes(
        self, client: AsyncClient, test_goal, test_user_2, auth_headers, auth_headers_user_2, db_session
    ):
        """Test that non-owner cannot create, update, or delete nodes."""
        # Owner creates a node first
        create_response = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json={"title": "Protected Node", "order": 1},
            headers=auth_headers,
        )
        assert create_response.status_code == 201
        node_id = create_response.json()["id"]

        # Non-owner tries to create on owner's goal
        create_fail = await client.post(
            f"/api/goals/{test_goal.id}/nodes",
            json={"title": "Unauthorized Create", "order": 2},
            headers=auth_headers_user_2,
        )
        assert create_fail.status_code == 404

        # Non-owner tries to update
        update_fail = await client.put(
            f"/api/nodes/{node_id}",
            json={"title": "Unauthorized Update"},
            headers=auth_headers_user_2,
        )
        assert update_fail.status_code == 404

        # Non-owner tries to delete
        delete_fail = await client.delete(
            f"/api/nodes/{node_id}",
            headers=auth_headers_user_2,
        )
        assert delete_fail.status_code == 404

        # Verify node still exists
        verify_response = await client.get(f"/api/nodes/{node_id}")
        assert verify_response.status_code == 200
        assert verify_response.json()["title"] == "Protected Node"
