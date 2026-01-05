"""
Tests for goal deletion with cascading related data cleanup.

Issue #57: Failed to delete goal - IntegrityError on nodes
"""
import uuid
import pytest
from sqlalchemy import select, func
from httpx import AsyncClient

from app.models.goal import Goal, GoalStatus, GoalVisibility
from app.models.node import Node, NodeStatus, NodeDependency
from app.models.update import Update, UpdateType
from app.models.interaction import Interaction, InteractionType, TargetType
from app.models.comment import Comment, CommentTargetType
from app.models.follow import Follow, FollowType
from app.models.activity import Activity, ActivityType, ActivityTargetType
from app.models.user import User


@pytest.fixture
async def goal_with_nodes(db_session, test_user) -> Goal:
    """Create a goal with multiple nodes for testing."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Test Goal for Deletion",
        description="This goal will be deleted",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.flush()

    # Add nodes
    node1 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 1",
        description="First node",
        order=1,
        status=NodeStatus.COMPLETED,
    )
    node2 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 2",
        description="Second node",
        order=2,
        status=NodeStatus.ACTIVE,
    )
    node3 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 3",
        description="Third node",
        order=3,
        status=NodeStatus.LOCKED,
    )
    db_session.add_all([node1, node2, node3])
    await db_session.flush()

    # Add node dependencies (node3 depends on node2)
    dependency = NodeDependency(
        node_id=node3.id,
        depends_on_id=node2.id,
    )
    db_session.add(dependency)
    await db_session.commit()

    # Refresh to get updated relationships
    await db_session.refresh(goal)
    return goal


@pytest.fixture
async def goal_with_full_data(db_session, test_user, test_user_2) -> Goal:
    """Create a goal with nodes, updates, interactions, comments, follows, and activities."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Full Data Goal for Deletion",
        description="This goal has all related data",
        category="test",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.flush()

    # Add nodes
    node1 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 1",
        order=1,
        status=NodeStatus.COMPLETED,
    )
    node2 = Node(
        id=uuid.uuid4(),
        goal_id=goal.id,
        title="Node 2",
        order=2,
        status=NodeStatus.ACTIVE,
    )
    db_session.add_all([node1, node2])
    await db_session.flush()

    # Add updates for nodes
    update1 = Update(
        id=uuid.uuid4(),
        node_id=node1.id,
        user_id=test_user.id,
        content="Completed node 1!",
        update_type=UpdateType.PROGRESS,
    )
    update2 = Update(
        id=uuid.uuid4(),
        node_id=node2.id,
        user_id=test_user.id,
        content="Working on node 2",
        update_type=UpdateType.PROGRESS,
    )
    db_session.add_all([update1, update2])
    await db_session.flush()

    # Add interactions (reactions) on nodes and goal
    interaction_node = Interaction(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        target_type=TargetType.NODE,
        target_id=node1.id,
        interaction_type=InteractionType.REACTION,
        reaction_type="fire",
    )
    interaction_goal = Interaction(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        target_type=TargetType.GOAL,
        target_id=goal.id,
        interaction_type=InteractionType.REACTION,
        reaction_type="magic",
    )
    interaction_update = Interaction(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        target_type=TargetType.UPDATE,
        target_id=update1.id,
        interaction_type=InteractionType.REACTION,
        reaction_type="lightning",
    )
    db_session.add_all([interaction_node, interaction_goal, interaction_update])
    await db_session.flush()

    # Add comments on nodes and goal
    comment_node = Comment(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        target_type=CommentTargetType.NODE,
        target_id=node1.id,
        content="Great progress on this node!",
    )
    comment_goal = Comment(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        target_type=CommentTargetType.GOAL,
        target_id=goal.id,
        content="Awesome goal!",
    )
    comment_update = Comment(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        target_type=CommentTargetType.UPDATE,
        target_id=update1.id,
        content="Keep it up!",
    )
    db_session.add_all([comment_node, comment_goal, comment_update])
    await db_session.flush()

    # Add follow on goal
    follow_goal = Follow(
        id=uuid.uuid4(),
        follower_id=test_user_2.id,
        follow_type=FollowType.GOAL,
        target_id=goal.id,
    )
    db_session.add(follow_goal)
    await db_session.flush()

    # Add activities
    activity_goal = Activity(
        id=uuid.uuid4(),
        user_id=test_user.id,
        activity_type=ActivityType.GOAL_CREATED,
        target_type=ActivityTargetType.GOAL,
        target_id=goal.id,
        extra_data={"title": goal.title},
    )
    activity_node = Activity(
        id=uuid.uuid4(),
        user_id=test_user.id,
        activity_type=ActivityType.NODE_COMPLETED,
        target_type=ActivityTargetType.NODE,
        target_id=node1.id,
        extra_data={"title": node1.title},
    )
    db_session.add_all([activity_goal, activity_node])
    await db_session.commit()

    await db_session.refresh(goal)
    return goal


class TestGoalDeletion:
    """Tests for DELETE /api/goals/{goal_id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_goal_without_nodes(
        self, client: AsyncClient, db_session, test_user, auth_headers
    ):
        """Test deleting a goal that has no nodes."""
        # Create a goal without nodes
        goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Empty Goal",
            visibility=GoalVisibility.PUBLIC,
            status=GoalStatus.PLANNING,
        )
        db_session.add(goal)
        await db_session.commit()
        goal_id = goal.id

        # Delete the goal
        response = await client.delete(
            f"/api/goals/{goal_id}",
            headers=auth_headers
        )
        assert response.status_code == 204

        # Verify goal is deleted
        result = await db_session.execute(
            select(Goal).where(Goal.id == goal_id)
        )
        assert result.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_delete_goal_with_nodes(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_with_nodes
    ):
        """Test deleting a goal that has nodes (Issue #57 fix)."""
        goal_id = goal_with_nodes.id

        # Get node count before deletion
        result = await db_session.execute(
            select(func.count(Node.id)).where(Node.goal_id == goal_id)
        )
        node_count_before = result.scalar()
        assert node_count_before == 3  # Verify nodes exist

        # Delete the goal
        response = await client.delete(
            f"/api/goals/{goal_id}",
            headers=auth_headers
        )
        assert response.status_code == 204

        # Verify goal is deleted
        result = await db_session.execute(
            select(Goal).where(Goal.id == goal_id)
        )
        assert result.scalar_one_or_none() is None

        # Verify nodes are deleted
        result = await db_session.execute(
            select(func.count(Node.id)).where(Node.goal_id == goal_id)
        )
        node_count_after = result.scalar()
        assert node_count_after == 0

    @pytest.mark.asyncio
    async def test_delete_goal_with_all_related_data(
        self, client: AsyncClient, db_session, test_user, test_user_2,
        auth_headers, goal_with_full_data
    ):
        """Test deleting a goal cascades to all related data."""
        goal_id = goal_with_full_data.id

        # Get IDs for verification
        node_result = await db_session.execute(
            select(Node.id).where(Node.goal_id == goal_id)
        )
        node_ids = [row[0] for row in node_result.fetchall()]
        assert len(node_ids) == 2

        update_result = await db_session.execute(
            select(Update.id).where(Update.node_id.in_(node_ids))
        )
        update_ids = [row[0] for row in update_result.fetchall()]
        assert len(update_ids) == 2

        # Verify data exists before deletion
        interaction_count = (await db_session.execute(
            select(func.count(Interaction.id))
        )).scalar()
        assert interaction_count >= 3

        comment_count = (await db_session.execute(
            select(func.count(Comment.id))
        )).scalar()
        assert comment_count >= 3

        follow_count = (await db_session.execute(
            select(func.count(Follow.id)).where(
                Follow.follow_type == FollowType.GOAL,
                Follow.target_id == goal_id
            )
        )).scalar()
        assert follow_count >= 1

        # Delete the goal
        response = await client.delete(
            f"/api/goals/{goal_id}",
            headers=auth_headers
        )
        assert response.status_code == 204

        # Verify goal is deleted
        result = await db_session.execute(
            select(Goal).where(Goal.id == goal_id)
        )
        assert result.scalar_one_or_none() is None

        # Verify nodes are deleted
        result = await db_session.execute(
            select(func.count(Node.id)).where(Node.goal_id == goal_id)
        )
        assert result.scalar() == 0

        # Verify updates are deleted
        result = await db_session.execute(
            select(func.count(Update.id)).where(Update.node_id.in_(node_ids))
        )
        assert result.scalar() == 0

        # Verify interactions for goal are deleted
        result = await db_session.execute(
            select(func.count(Interaction.id)).where(
                Interaction.target_type == TargetType.GOAL,
                Interaction.target_id == goal_id
            )
        )
        assert result.scalar() == 0

        # Verify interactions for nodes are deleted
        result = await db_session.execute(
            select(func.count(Interaction.id)).where(
                Interaction.target_type == TargetType.NODE,
                Interaction.target_id.in_(node_ids)
            )
        )
        assert result.scalar() == 0

        # Verify comments for goal are deleted
        result = await db_session.execute(
            select(func.count(Comment.id)).where(
                Comment.target_type == CommentTargetType.GOAL,
                Comment.target_id == goal_id
            )
        )
        assert result.scalar() == 0

        # Verify comments for nodes are deleted
        result = await db_session.execute(
            select(func.count(Comment.id)).where(
                Comment.target_type == CommentTargetType.NODE,
                Comment.target_id.in_(node_ids)
            )
        )
        assert result.scalar() == 0

        # Verify follows for goal are deleted
        result = await db_session.execute(
            select(func.count(Follow.id)).where(
                Follow.follow_type == FollowType.GOAL,
                Follow.target_id == goal_id
            )
        )
        assert result.scalar() == 0

        # Verify activities for goal are deleted
        result = await db_session.execute(
            select(func.count(Activity.id)).where(
                Activity.target_type == ActivityTargetType.GOAL,
                Activity.target_id == goal_id
            )
        )
        assert result.scalar() == 0

    @pytest.mark.asyncio
    async def test_delete_goal_unauthorized(
        self, client: AsyncClient, db_session, test_user, test_user_2,
        auth_headers_user_2, goal_with_nodes
    ):
        """Test that only owner can delete their goal."""
        goal_id = goal_with_nodes.id

        # Try to delete as non-owner
        response = await client.delete(
            f"/api/goals/{goal_id}",
            headers=auth_headers_user_2  # User 2 is not the owner
        )
        assert response.status_code == 404  # Returns 404 to not leak existence

        # Verify goal still exists
        result = await db_session.execute(
            select(Goal).where(Goal.id == goal_id)
        )
        assert result.scalar_one_or_none() is not None

    @pytest.mark.asyncio
    async def test_delete_goal_not_authenticated(
        self, client: AsyncClient, goal_with_nodes
    ):
        """Test that unauthenticated users cannot delete goals."""
        goal_id = goal_with_nodes.id

        response = await client.delete(f"/api/goals/{goal_id}")
        # Server returns 403 Forbidden for unauthenticated requests
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_delete_nonexistent_goal(
        self, client: AsyncClient, auth_headers
    ):
        """Test deleting a goal that doesn't exist."""
        fake_goal_id = uuid.uuid4()

        response = await client.delete(
            f"/api/goals/{fake_goal_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Goal not found"

    @pytest.mark.asyncio
    async def test_delete_goal_with_node_dependencies(
        self, client: AsyncClient, db_session, test_user, auth_headers, goal_with_nodes
    ):
        """Test that node dependencies are deleted when goal is deleted."""
        goal_id = goal_with_nodes.id

        # Verify dependencies exist before deletion
        node_result = await db_session.execute(
            select(Node.id).where(Node.goal_id == goal_id)
        )
        node_ids = [row[0] for row in node_result.fetchall()]

        dep_count = (await db_session.execute(
            select(func.count(NodeDependency.id)).where(
                NodeDependency.node_id.in_(node_ids)
            )
        )).scalar()
        assert dep_count >= 1

        # Delete the goal
        response = await client.delete(
            f"/api/goals/{goal_id}",
            headers=auth_headers
        )
        assert response.status_code == 204

        # Verify dependencies are deleted
        dep_count_after = (await db_session.execute(
            select(func.count(NodeDependency.id)).where(
                NodeDependency.node_id.in_(node_ids)
            )
        )).scalar()
        assert dep_count_after == 0
