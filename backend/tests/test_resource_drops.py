"""
Tests for the resource drops feature.

Tests Issue #56 implementation:
- Drop resource button creates resource drops
- URL validation
- Notification to goal owner
- Resources retrievable by node
"""
import uuid
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.resource_drop import ResourceDrop
from app.models.node import Node
from app.models.goal import Goal
from app.models.notification import Notification
from app.models.user import User
from app.services.auth import AuthService


class TestResourceDropAPI:
    """Test the resource drops API endpoints."""

    @pytest_asyncio.fixture
    async def public_goal_with_node(
        self,
        db_session: AsyncSession,
        test_user: User
    ) -> tuple[Goal, Node]:
        """Create a public goal with a node for testing."""
        goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Test Goal",
            description="A test goal for resource drops",
            visibility="public",
            status="active"
        )
        db_session.add(goal)
        await db_session.flush()

        node = Node(
            id=uuid.uuid4(),
            goal_id=goal.id,
            title="Test Node",
            description="A test node",
            node_type="task",
            status="pending",
            order_index=0
        )
        db_session.add(node)
        await db_session.commit()
        await db_session.refresh(goal)
        await db_session.refresh(node)
        return goal, node

    @pytest.mark.asyncio
    async def test_create_resource_drop_with_url(
        self,
        client,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test creating a resource drop with a URL."""
        goal, node = public_goal_with_node
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/nodes/{node.id}",
            json={
                "node_id": str(node.id),
                "message": "Here's a helpful resource",
                "resources": [
                    {
                        "url": "https://example.com/resource",
                        "title": "Example Resource",
                        "description": "A helpful guide",
                        "resource_type": "link"
                    }
                ]
            },
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Here's a helpful resource"
        assert len(data["resources"]) == 1
        assert data["resources"][0]["url"] == "https://example.com/resource"
        assert data["resources"][0]["title"] == "Example Resource"
        assert data["is_opened"] is False
        assert data["username"] == test_user_2.username

    @pytest.mark.asyncio
    async def test_create_resource_drop_message_only(
        self,
        client,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test creating a resource drop with just a message (no URL)."""
        goal, node = public_goal_with_node
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/nodes/{node.id}",
            json={
                "node_id": str(node.id),
                "message": "Good luck with this task!"
            },
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Good luck with this task!"
        assert len(data["resources"]) == 0

    @pytest.mark.asyncio
    async def test_cannot_drop_on_own_goal(
        self,
        client,
        test_user: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test that users cannot drop resources on their own goals."""
        goal, node = public_goal_with_node
        # test_user owns the goal
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/nodes/{node.id}",
            json={
                "node_id": str(node.id),
                "message": "Trying to drop on my own goal"
            },
            headers=headers
        )

        assert response.status_code == 400
        assert "own goal" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_must_provide_message_or_resources(
        self,
        client,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test that either message or resources must be provided."""
        goal, node = public_goal_with_node
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/nodes/{node.id}",
            json={
                "node_id": str(node.id)
            },
            headers=headers
        )

        assert response.status_code == 400
        assert "must provide" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_notification_created_on_drop(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test that a notification is created for the goal owner when someone drops a resource."""
        goal, node = public_goal_with_node
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Clear any existing notifications
        await db_session.execute(
            Notification.__table__.delete().where(Notification.user_id == test_user.id)
        )
        await db_session.commit()

        response = await client.post(
            f"/api/resource-drops/nodes/{node.id}",
            json={
                "node_id": str(node.id),
                "message": "Here's some help!"
            },
            headers=headers
        )

        assert response.status_code == 201

        # Check notification was created for goal owner
        result = await db_session.execute(
            select(Notification).where(
                Notification.user_id == test_user.id,
                Notification.type == "resource_drop"
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None
        assert test_user_2.username in notification.title or test_user_2.display_name in notification.title
        assert node.title in notification.message

    @pytest.mark.asyncio
    async def test_get_node_drops(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test retrieving all drops on a node."""
        goal, node = public_goal_with_node

        # Create a drop as user 2
        drop = ResourceDrop(
            user_id=test_user_2.id,
            node_id=node.id,
            message="Test resource",
            resources=[{"url": "https://test.com", "title": "Test"}]
        )
        db_session.add(drop)
        await db_session.commit()

        # Get drops as goal owner
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get(
            f"/api/resource-drops/nodes/{node.id}",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert data["unopened_count"] >= 1  # Owner should see unopened count

    @pytest.mark.asyncio
    async def test_open_resource_drop(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test opening (marking as viewed) a resource drop."""
        goal, node = public_goal_with_node

        # Create a drop as user 2
        drop = ResourceDrop(
            user_id=test_user_2.id,
            node_id=node.id,
            message="Open me!",
            resources=[]
        )
        db_session.add(drop)
        await db_session.commit()
        await db_session.refresh(drop)

        assert drop.is_opened is False

        # Open as goal owner
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/{drop.id}/open",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_opened"] is True
        assert data["opened_at"] is not None

    @pytest.mark.asyncio
    async def test_only_owner_can_open_drop(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test that only the goal owner can open resource drops."""
        goal, node = public_goal_with_node

        # Create a drop as user 2
        drop = ResourceDrop(
            user_id=test_user_2.id,
            node_id=node.id,
            message="Don't open me!",
            resources=[]
        )
        db_session.add(drop)
        await db_session.commit()
        await db_session.refresh(drop)

        # Try to open as user 2 (not the owner)
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/{drop.id}/open",
            headers=headers
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_cannot_drop_on_private_goal(
        self,
        client,
        test_user: User,
        test_user_2: User,
        db_session: AsyncSession
    ):
        """Test that users cannot drop resources on private goals."""
        # Create a private goal
        private_goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Private Goal",
            visibility="private",
            status="active"
        )
        db_session.add(private_goal)
        await db_session.flush()

        node = Node(
            id=uuid.uuid4(),
            goal_id=private_goal.id,
            title="Private Node",
            node_type="task",
            status="pending",
            order_index=0
        )
        db_session.add(node)
        await db_session.commit()

        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/nodes/{node.id}",
            json={
                "node_id": str(node.id),
                "message": "Trying to access private goal"
            },
            headers=headers
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_goal_resource_summary(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal_with_node: tuple[Goal, Node],
        db_session: AsyncSession
    ):
        """Test getting resource summary for all nodes in a goal."""
        goal, node = public_goal_with_node

        # Create multiple drops
        for i in range(3):
            drop = ResourceDrop(
                user_id=test_user_2.id,
                node_id=node.id,
                message=f"Resource {i}",
                resources=[]
            )
            db_session.add(drop)
        await db_session.commit()

        # Get summary as owner
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get(
            f"/api/resource-drops/goals/{goal.id}/summary",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        node_summary = next((s for s in data if str(s["node_id"]) == str(node.id)), None)
        assert node_summary is not None
        assert node_summary["total_drops"] >= 3
        assert node_summary["unopened_drops"] >= 3


class TestResourceDropValidation:
    """Test validation for resource drops."""

    @pytest_asyncio.fixture
    async def public_goal_with_node(
        self,
        db_session: AsyncSession,
        test_user: User
    ) -> tuple[Goal, Node]:
        """Create a public goal with a node for testing."""
        goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Test Goal",
            visibility="public",
            status="active"
        )
        db_session.add(goal)
        await db_session.flush()

        node = Node(
            id=uuid.uuid4(),
            goal_id=goal.id,
            title="Test Node",
            node_type="task",
            status="pending",
            order_index=0
        )
        db_session.add(node)
        await db_session.commit()
        return goal, node

    @pytest.mark.asyncio
    async def test_drop_on_nonexistent_node(
        self,
        client,
        test_user_2: User
    ):
        """Test dropping on a node that doesn't exist."""
        fake_node_id = uuid.uuid4()
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/resource-drops/nodes/{fake_node_id}",
            json={
                "node_id": str(fake_node_id),
                "message": "Drop on fake node"
            },
            headers=headers
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_requires_authentication(
        self,
        client,
        public_goal_with_node: tuple[Goal, Node]
    ):
        """Test that resource drops require authentication."""
        goal, node = public_goal_with_node

        response = await client.post(
            f"/api/resource-drops/nodes/{node.id}",
            json={
                "node_id": str(node.id),
                "message": "Anonymous drop"
            }
        )

        assert response.status_code == 401
