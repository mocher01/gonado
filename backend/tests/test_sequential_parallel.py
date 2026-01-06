"""
Tests for Sequential/Parallel Node Structuring (Issue #63)

Test specifications from the issue:
- test_sequential_node_locking: Sequential nodes are locked until dependencies complete
- test_parallel_nodes_all_accessible: Parallel nodes in same group are all accessible
- test_circular_dependency_prevention: Circular dependencies are prevented
"""
import uuid
import pytest
from sqlalchemy import select
from httpx import AsyncClient

from app.models.goal import Goal, GoalStatus, GoalVisibility
from app.models.node import Node, NodeStatus, NodeDependency, DependencyType


@pytest.fixture
async def goal_with_sequential_nodes(db_session, test_user) -> Goal:
    """Create a goal with sequential nodes for testing."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Sequential Test Goal",
        description="Testing sequential node locking",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.flush()

    # Create sequential nodes
    node1 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 1",
        description="First sequential node",
        order=1,
        status=NodeStatus.ACTIVE,
        is_sequential=True,
    )
    node2 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 2",
        description="Second sequential node (depends on node1)",
        order=2,
        status=NodeStatus.LOCKED,
        is_sequential=True,
    )
    node3 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 3",
        description="Third sequential node (depends on node2)",
        order=3,
        status=NodeStatus.LOCKED,
        is_sequential=True,
    )
    db_session.add_all([node1, node2, node3])
    await db_session.flush()

    # Add explicit dependencies
    dep1 = NodeDependency(
        node_id=node2.id,
        depends_on_id=node1.id,
        dependency_type=DependencyType.FINISH_TO_START,
    )
    dep2 = NodeDependency(
        node_id=node3.id,
        depends_on_id=node2.id,
        dependency_type=DependencyType.FINISH_TO_START,
    )
    db_session.add_all([dep1, dep2])
    await db_session.commit()

    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def goal_with_parallel_nodes(db_session, test_user) -> Goal:
    """Create a goal with parallel nodes for testing."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Parallel Test Goal",
        description="Testing parallel node accessibility",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.flush()

    # Create parallel nodes (same parallel_group)
    node1 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Parallel Node 1",
        description="First parallel node",
        order=1,
        status=NodeStatus.ACTIVE,
        is_sequential=False,
        parallel_group=1,
        can_parallel=True,
    )
    node2 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Parallel Node 2",
        description="Second parallel node",
        order=2,
        status=NodeStatus.ACTIVE,
        is_sequential=False,
        parallel_group=1,
        can_parallel=True,
    )
    node3 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Final Node",
        description="Depends on both parallel nodes",
        order=3,
        status=NodeStatus.LOCKED,
        is_sequential=True,
    )
    db_session.add_all([node1, node2, node3])
    await db_session.flush()

    # Final node depends on both parallel nodes
    dep1 = NodeDependency(
        node_id=node3.id,
        depends_on_id=node1.id,
        dependency_type=DependencyType.FINISH_TO_START,
    )
    dep2 = NodeDependency(
        node_id=node3.id,
        depends_on_id=node2.id,
        dependency_type=DependencyType.FINISH_TO_START,
    )
    db_session.add_all([dep1, dep2])
    await db_session.commit()

    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def goal_for_circular_test(db_session, test_user) -> Goal:
    """Create a goal with nodes for circular dependency testing."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Circular Dependency Test Goal",
        description="Testing circular dependency prevention",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.flush()

    # Create nodes A -> B -> C
    node_a = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node A",
        order=1,
        status=NodeStatus.ACTIVE,
        is_sequential=True,
    )
    node_b = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node B",
        order=2,
        status=NodeStatus.LOCKED,
        is_sequential=True,
    )
    node_c = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node C",
        order=3,
        status=NodeStatus.LOCKED,
        is_sequential=True,
    )
    db_session.add_all([node_a, node_b, node_c])
    await db_session.flush()

    # B depends on A, C depends on B
    dep1 = NodeDependency(
        node_id=node_b.id,
        depends_on_id=node_a.id,
        dependency_type=DependencyType.FINISH_TO_START,
    )
    dep2 = NodeDependency(
        node_id=node_c.id,
        depends_on_id=node_b.id,
        dependency_type=DependencyType.FINISH_TO_START,
    )
    db_session.add_all([dep1, dep2])
    await db_session.commit()

    await db_session.refresh(goal)
    return goal


class TestSequentialNodeLocking:
    """Tests for sequential node locking behavior."""

    @pytest.mark.asyncio
    async def test_sequential_node_locking(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_with_sequential_nodes
    ):
        """
        Test that sequential nodes are locked until dependencies complete.
        From Issue #63 test spec:
        - n2 is locked when n1 is not complete
        - n2 is accessible after n1 is complete
        """
        goal = goal_with_sequential_nodes
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node1, node2, node3 = nodes

        # n2 should not be interactable initially
        response = await client.get(f"/api/nodes/{node2.id}/can-interact")
        assert response.status_code == 200
        data = response.json()
        assert data["can_interact"] == False
        assert str(node1.id) in [str(b) for b in data["blocking_nodes"]]

        # Complete n1
        response = await client.post(
            f"/api/nodes/{node1.id}/complete",
            headers=auth_headers
        )
        assert response.status_code == 200

        # Refresh nodes from DB
        await db_session.refresh(node2)

        # n2 should now be active (unlocked by completing n1)
        assert node2.status == NodeStatus.ACTIVE

        # n2 should now be interactable
        response = await client.get(f"/api/nodes/{node2.id}/can-interact")
        assert response.status_code == 200
        data = response.json()
        assert data["can_interact"] == True

    @pytest.mark.asyncio
    async def test_cannot_complete_locked_node(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_with_sequential_nodes
    ):
        """Test that locked nodes cannot be completed."""
        goal = goal_with_sequential_nodes
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        _, node2, _ = nodes

        # Try to complete locked node
        response = await client.post(
            f"/api/nodes/{node2.id}/complete",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "not active" in response.json()["detail"].lower()


class TestParallelNodesAccessibility:
    """Tests for parallel nodes accessibility."""

    @pytest.mark.asyncio
    async def test_parallel_nodes_all_accessible(
        self, client: AsyncClient, db_session, test_user, goal_with_parallel_nodes
    ):
        """
        Test that parallel nodes in the same group are all accessible.
        From Issue #63 test spec:
        - n1 in parallel_group=1 is accessible
        - n2 in parallel_group=1 is accessible
        """
        goal = goal_with_parallel_nodes
        nodes_result = await db_session.execute(
            select(Node).where(
                Node.goal_id == goal.id,
                Node.parallel_group == 1
            )
        )
        parallel_nodes = nodes_result.scalars().all()

        # Both parallel nodes should be accessible
        for node in parallel_nodes:
            response = await client.get(f"/api/nodes/{node.id}/can-interact")
            assert response.status_code == 200
            data = response.json()
            assert data["can_interact"] == True, f"Node {node.title} should be accessible"

    @pytest.mark.asyncio
    async def test_final_node_blocked_by_parallel_nodes(
        self, client: AsyncClient, db_session, goal_with_parallel_nodes
    ):
        """Test that node depending on parallel nodes is blocked until all complete."""
        goal = goal_with_parallel_nodes
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node1, node2, final_node = nodes

        # Final node should be blocked
        response = await client.get(f"/api/nodes/{final_node.id}/can-interact")
        assert response.status_code == 200
        data = response.json()
        assert data["can_interact"] == False
        # Should show both parallel nodes as blocking
        blocking_ids = [str(b) for b in data["blocking_nodes"]]
        assert str(node1.id) in blocking_ids or str(node2.id) in blocking_ids

    @pytest.mark.asyncio
    async def test_parallel_nodes_completion_unlocks_dependent(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_with_parallel_nodes
    ):
        """Test that completing all parallel nodes unlocks the dependent node."""
        goal = goal_with_parallel_nodes
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node1, node2, final_node = nodes

        # Complete both parallel nodes
        response1 = await client.post(f"/api/nodes/{node1.id}/complete", headers=auth_headers)
        assert response1.status_code == 200

        response2 = await client.post(f"/api/nodes/{node2.id}/complete", headers=auth_headers)
        assert response2.status_code == 200

        # Refresh final node
        await db_session.refresh(final_node)

        # Final node should now be active
        assert final_node.status == NodeStatus.ACTIVE


class TestCircularDependencyPrevention:
    """Tests for circular dependency prevention."""

    @pytest.mark.asyncio
    async def test_circular_dependency_prevention(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_for_circular_test
    ):
        """
        Test that circular dependencies are prevented.
        Given: A -> B -> C
        Trying to add: A depends on C should fail
        """
        goal = goal_for_circular_test
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node_a, node_b, node_c = nodes

        # Try to add C -> A dependency (would create A -> B -> C -> A cycle)
        response = await client.post(
            f"/api/nodes/{node_a.id}/dependencies",
            headers=auth_headers,
            json={
                "depends_on_id": str(node_c.id),
                "dependency_type": "finish_to_start"
            }
        )
        assert response.status_code == 400
        assert "circular" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_self_dependency_prevention(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_for_circular_test
    ):
        """Test that a node cannot depend on itself."""
        goal = goal_for_circular_test
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node_a = nodes[0]

        # Try to add self-dependency
        response = await client.post(
            f"/api/nodes/{node_a.id}/dependencies",
            headers=auth_headers,
            json={
                "depends_on_id": str(node_a.id),
                "dependency_type": "finish_to_start"
            }
        )
        assert response.status_code == 400
        assert "itself" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_valid_dependency_allowed(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_for_circular_test
    ):
        """Test that valid (non-circular) dependencies are allowed."""
        goal = goal_for_circular_test
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node_a, node_b, node_c = nodes

        # Add C -> A dependency (C depends on A completing)
        # This is valid because A doesn't depend on C
        response = await client.post(
            f"/api/nodes/{node_c.id}/dependencies",
            headers=auth_headers,
            json={
                "depends_on_id": str(node_a.id),
                "dependency_type": "finish_to_start"
            }
        )
        assert response.status_code == 201


class TestNodeInteractionEndpoint:
    """Tests for the can-interact endpoint."""

    @pytest.mark.asyncio
    async def test_can_interact_endpoint_returns_correct_format(
        self, client: AsyncClient, db_session, goal_with_sequential_nodes
    ):
        """Test that can-interact endpoint returns the correct response format."""
        goal = goal_with_sequential_nodes
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node1 = nodes[0]

        response = await client.get(f"/api/nodes/{node1.id}/can-interact")
        assert response.status_code == 200

        data = response.json()
        assert "can_interact" in data
        assert "reason" in data
        assert "blocking_nodes" in data
        assert isinstance(data["can_interact"], bool)
        assert isinstance(data["blocking_nodes"], list)

    @pytest.mark.asyncio
    async def test_completed_node_can_interact(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_with_sequential_nodes
    ):
        """Test that completed nodes can still be interacted with."""
        goal = goal_with_sequential_nodes
        nodes_result = await db_session.execute(
            select(Node).where(Node.goal_id == goal.id).order_by(Node.order)
        )
        nodes = nodes_result.scalars().all()
        node1 = nodes[0]

        # Complete node1
        await client.post(f"/api/nodes/{node1.id}/complete", headers=auth_headers)

        # Check can_interact
        response = await client.get(f"/api/nodes/{node1.id}/can-interact")
        assert response.status_code == 200
        data = response.json()
        assert data["can_interact"] == True
