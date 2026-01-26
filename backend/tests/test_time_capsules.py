"""
Tests for the Time Capsules feature (Issue #72).

Time capsules are messages that users can attach to nodes, which unlock when certain conditions are met:
- NODE_COMPLETE: Unlocks when the node is completed
- DATE: Unlocks on a specific date

Tests cover:
- Creating time capsules (authenticated users only)
- Listing capsules for a node
- Getting capsule details (content hidden if locked for goal owner)
- Updating capsules (sender only, before unlock)
- Deleting capsules (sender only, before unlock)
- Auto-unlocking when node is completed
- Notification creation when capsule unlocks
"""
import uuid
from datetime import datetime, timedelta
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.goal import Goal, GoalStatus
from app.models.node import Node, NodeStatus
from app.models.time_capsule import TimeCapsule, UnlockType
from app.models.user import User
from app.models.notification import Notification
from app.services.auth import AuthService


@pytest_asyncio.fixture
async def test_goal_owner(db_session: AsyncSession) -> User:
    """Create a goal owner user."""
    unique_id = uuid.uuid4()
    unique_suffix = str(unique_id)[:8]
    user = User(
        id=unique_id,
        email=f"goalowner_{unique_suffix}@example.com",
        password_hash=AuthService.hash_password("password"),
        username=f"goalowner_{unique_suffix}",
        display_name="Goal Owner"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_supporter(db_session: AsyncSession) -> User:
    """Create a supporter user (who will create time capsules)."""
    unique_id = uuid.uuid4()
    unique_suffix = str(unique_id)[:8]
    user = User(
        id=unique_id,
        email=f"supporter_{unique_suffix}@example.com",
        password_hash=AuthService.hash_password("password"),
        username=f"supporter_{unique_suffix}",
        display_name="Supporter"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def public_goal(db_session: AsyncSession, test_goal_owner: User) -> Goal:
    """Create a public goal."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_goal_owner.id,
        title="Public Goal for Time Capsules",
        description="A public goal that supporters can add capsules to",
        visibility="public",
        world_theme="mountain",
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest_asyncio.fixture
async def private_goal(db_session: AsyncSession, test_goal_owner: User) -> Goal:
    """Create a private goal."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_goal_owner.id,
        title="Private Goal",
        description="A private goal",
        visibility="private",
        world_theme="forest",
        status=GoalStatus.ACTIVE,
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest_asyncio.fixture
async def test_node(db_session: AsyncSession, public_goal: Goal) -> Node:
    """Create a test node attached to the public goal."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=public_goal.id,
        title="Test Node",
        description="A test node for time capsules",
        order=1,
        status=NodeStatus.ACTIVE,
        position_x=100.0,
        position_y=200.0,
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


@pytest_asyncio.fixture
async def private_node(db_session: AsyncSession, private_goal: Goal) -> Node:
    """Create a test node attached to the private goal."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=private_goal.id,
        title="Private Node",
        description="A node in a private goal",
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
def supporter_auth_headers(test_supporter: User) -> dict:
    """Generate auth headers for supporter user."""
    token = AuthService.create_access_token(test_supporter.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def goal_owner_auth_headers(test_goal_owner: User) -> dict:
    """Generate auth headers for goal owner."""
    token = AuthService.create_access_token(test_goal_owner.id)
    return {"Authorization": f"Bearer {token}"}


class TestCreateTimeCapsule:
    """Tests for POST /api/time-capsules/nodes/{node_id} endpoint."""

    @pytest.mark.asyncio
    async def test_create_capsule_node_complete_type(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test creating a time capsule with NODE_COMPLETE unlock type."""
        response = await client.post(
            f"/api/time-capsules/nodes/{test_node.id}",
            json={
                "content": "Great work! Keep going!",
                "unlock_type": "node_complete"
            },
            headers=supporter_auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "Great work! Keep going!"
        assert data["unlock_type"] == "node_complete"
        assert data["is_unlocked"] is False
        assert data["unlocked_at"] is None
        assert data["node_id"] == str(test_node.id)
        assert data["sender_username"] is not None

        # Verify in database
        result = await db_session.execute(
            select(TimeCapsule).where(TimeCapsule.node_id == test_node.id)
        )
        capsule = result.scalar_one_or_none()
        assert capsule is not None
        assert capsule.content == "Great work! Keep going!"
        assert capsule.unlock_type == UnlockType.NODE_COMPLETE

    @pytest.mark.asyncio
    async def test_create_capsule_date_type(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test creating a time capsule with DATE unlock type."""
        future_date = datetime.utcnow() + timedelta(days=30)

        response = await client.post(
            f"/api/time-capsules/nodes/{test_node.id}",
            json={
                "content": "Happy 30 days anniversary!",
                "unlock_type": "date",
                "unlock_date": future_date.isoformat()
            },
            headers=supporter_auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "Happy 30 days anniversary!"
        assert data["unlock_type"] == "date"
        assert data["unlock_date"] is not None
        assert data["is_unlocked"] is False

        # Verify in database
        result = await db_session.execute(
            select(TimeCapsule).where(TimeCapsule.node_id == test_node.id)
        )
        capsule = result.scalar_one_or_none()
        assert capsule is not None
        assert capsule.unlock_type == UnlockType.DATE
        assert capsule.unlock_date is not None

    @pytest.mark.asyncio
    async def test_create_capsule_date_type_missing_date(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict
    ):
        """Test that creating DATE capsule without unlock_date fails."""
        response = await client.post(
            f"/api/time-capsules/nodes/{test_node.id}",
            json={
                "content": "Missing date!",
                "unlock_type": "date"
            },
            headers=supporter_auth_headers
        )

        assert response.status_code == 400
        assert "unlock_date is required" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_create_capsule_date_in_past(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict
    ):
        """Test that creating capsule with past date fails."""
        past_date = datetime.utcnow() - timedelta(days=1)

        response = await client.post(
            f"/api/time-capsules/nodes/{test_node.id}",
            json={
                "content": "Past date",
                "unlock_type": "date",
                "unlock_date": past_date.isoformat()
            },
            headers=supporter_auth_headers
        )

        assert response.status_code == 400
        assert "must be in the future" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_create_capsule_for_own_goal(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict
    ):
        """Test that goal owner cannot create capsules for their own goal."""
        response = await client.post(
            f"/api/time-capsules/nodes/{test_node.id}",
            json={
                "content": "My own capsule",
                "unlock_type": "node_complete"
            },
            headers=goal_owner_auth_headers
        )

        assert response.status_code == 403
        assert "Cannot create time capsules for your own goals" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_create_capsule_for_private_goal(
        self,
        client: AsyncClient,
        private_node: Node,
        supporter_auth_headers: dict
    ):
        """Test that supporters cannot create capsules for private goals."""
        response = await client.post(
            f"/api/time-capsules/nodes/{private_node.id}",
            json={
                "content": "Private goal capsule",
                "unlock_type": "node_complete"
            },
            headers=supporter_auth_headers
        )

        assert response.status_code == 403
        assert "Cannot create capsules for private goals" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_create_capsule(
        self,
        client: AsyncClient,
        test_node: Node
    ):
        """Test that unauthenticated users cannot create time capsules."""
        response = await client.post(
            f"/api/time-capsules/nodes/{test_node.id}",
            json={
                "content": "Unauthenticated",
                "unlock_type": "node_complete"
            }
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_capsule_nonexistent_node(
        self,
        client: AsyncClient,
        supporter_auth_headers: dict
    ):
        """Test that creating capsule for nonexistent node fails."""
        fake_node_id = uuid.uuid4()

        response = await client.post(
            f"/api/time-capsules/nodes/{fake_node_id}",
            json={
                "content": "Nonexistent node",
                "unlock_type": "node_complete"
            },
            headers=supporter_auth_headers
        )

        assert response.status_code == 404
        assert "Node not found" in response.json()["detail"]


class TestListTimeCapsules:
    """Tests for GET /api/time-capsules/nodes/{node_id} endpoint."""

    @pytest.mark.asyncio
    async def test_list_capsules_empty(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict
    ):
        """Test listing capsules for node with no capsules."""
        response = await client.get(
            f"/api/time-capsules/nodes/{test_node.id}",
            headers=supporter_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["locked_count"] == 0
        assert len(data["capsules"]) == 0

    @pytest.mark.asyncio
    async def test_list_capsules_with_content(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test listing capsules returns all capsules."""
        # Create two capsules
        capsule1 = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="First capsule",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        capsule2 = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Second capsule",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=True,
            unlocked_at=datetime.utcnow()
        )
        db_session.add_all([capsule1, capsule2])
        await db_session.commit()

        response = await client.get(
            f"/api/time-capsules/nodes/{test_node.id}",
            headers=supporter_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["locked_count"] == 1
        assert len(data["capsules"]) == 2

    @pytest.mark.asyncio
    async def test_goal_owner_sees_locked_content_hidden(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that goal owner sees locked capsule content as hidden."""
        # Create locked capsule
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Secret message",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()

        response = await client.get(
            f"/api/time-capsules/nodes/{test_node.id}",
            headers=goal_owner_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["locked_count"] == 1
        capsule_data = data["capsules"][0]
        assert capsule_data["content"] == "[Locked until unlocked]"
        assert capsule_data["is_unlocked"] is False

    @pytest.mark.asyncio
    async def test_goal_owner_sees_unlocked_content(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that goal owner sees unlocked capsule content."""
        # Create unlocked capsule
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Revealed message",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=True,
            unlocked_at=datetime.utcnow()
        )
        db_session.add(capsule)
        await db_session.commit()

        response = await client.get(
            f"/api/time-capsules/nodes/{test_node.id}",
            headers=goal_owner_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        capsule_data = data["capsules"][0]
        assert capsule_data["content"] == "Revealed message"
        assert capsule_data["is_unlocked"] is True

    @pytest.mark.asyncio
    async def test_sender_always_sees_own_content(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that capsule sender always sees their own content even if locked."""
        # Create locked capsule
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="My secret message",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()

        response = await client.get(
            f"/api/time-capsules/nodes/{test_node.id}",
            headers=supporter_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        capsule_data = data["capsules"][0]
        # Sender sees their own content even if locked
        assert capsule_data["content"] == "My secret message"


class TestGetTimeCapsule:
    """Tests for GET /api/time-capsules/{capsule_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_capsule_details(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test getting capsule details."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Capsule content",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.get(
            f"/api/time-capsules/{capsule.id}",
            headers=supporter_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(capsule.id)
        assert data["content"] == "Capsule content"
        assert data["sender_username"] is not None

    @pytest.mark.asyncio
    async def test_get_nonexistent_capsule(
        self,
        client: AsyncClient,
        supporter_auth_headers: dict
    ):
        """Test getting nonexistent capsule returns 404."""
        fake_id = uuid.uuid4()

        response = await client.get(
            f"/api/time-capsules/{fake_id}",
            headers=supporter_auth_headers
        )

        assert response.status_code == 404
        assert "Time capsule not found" in response.json()["detail"]


class TestUpdateTimeCapsule:
    """Tests for PUT /api/time-capsules/{capsule_id} endpoint."""

    @pytest.mark.asyncio
    async def test_sender_can_update_capsule(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that capsule sender can update their capsule."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Original content",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.put(
            f"/api/time-capsules/{capsule.id}",
            json={"content": "Updated content"},
            headers=supporter_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Updated content"

        # Verify in database
        await db_session.refresh(capsule)
        assert capsule.content == "Updated content"

    @pytest.mark.asyncio
    async def test_non_sender_cannot_update_capsule(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that non-sender cannot update capsule."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Original content",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.put(
            f"/api/time-capsules/{capsule.id}",
            json={"content": "Hacked content"},
            headers=goal_owner_auth_headers
        )

        assert response.status_code == 403
        assert "Only the sender can edit" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_update_unlocked_capsule(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that unlocked capsule cannot be updated."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Original content",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=True,
            unlocked_at=datetime.utcnow()
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.put(
            f"/api/time-capsules/{capsule.id}",
            json={"content": "Updated content"},
            headers=supporter_auth_headers
        )

        assert response.status_code == 400
        assert "Cannot edit capsule after it has been unlocked" in response.json()["detail"]


class TestDeleteTimeCapsule:
    """Tests for DELETE /api/time-capsules/{capsule_id} endpoint."""

    @pytest.mark.asyncio
    async def test_sender_can_delete_capsule(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that capsule sender can delete their capsule."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="To be deleted",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)
        capsule_id = capsule.id

        response = await client.delete(
            f"/api/time-capsules/{capsule_id}",
            headers=supporter_auth_headers
        )

        assert response.status_code == 204

        # Verify deleted from database
        result = await db_session.execute(
            select(TimeCapsule).where(TimeCapsule.id == capsule_id)
        )
        assert result.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_non_sender_cannot_delete_capsule(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that non-sender cannot delete capsule."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Protected content",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.delete(
            f"/api/time-capsules/{capsule.id}",
            headers=goal_owner_auth_headers
        )

        assert response.status_code == 403
        assert "Only the sender can delete" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_delete_unlocked_capsule(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that unlocked capsule cannot be deleted."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Unlocked content",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=True,
            unlocked_at=datetime.utcnow()
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.delete(
            f"/api/time-capsules/{capsule.id}",
            headers=supporter_auth_headers
        )

        assert response.status_code == 400
        assert "Cannot delete capsule after it has been unlocked" in response.json()["detail"]


class TestCapsuleUnlocking:
    """Tests for automatic capsule unlocking when node is completed."""

    @pytest.mark.asyncio
    async def test_completing_node_unlocks_capsules(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that completing a node unlocks associated time capsules."""
        # Create two capsules with NODE_COMPLETE trigger
        capsule1 = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Capsule 1",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        capsule2 = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Capsule 2",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add_all([capsule1, capsule2])
        await db_session.commit()

        # Complete the node
        response = await client.post(
            f"/api/nodes/{test_node.id}/complete",
            headers=goal_owner_auth_headers
        )
        assert response.status_code == 200

        # Verify both capsules are unlocked
        await db_session.refresh(capsule1)
        await db_session.refresh(capsule2)
        assert capsule1.is_unlocked is True
        assert capsule1.unlocked_at is not None
        assert capsule2.is_unlocked is True
        assert capsule2.unlocked_at is not None

    @pytest.mark.asyncio
    async def test_completing_node_creates_notifications(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User,
        test_goal_owner: User
    ):
        """Test that unlocking capsule creates notification for goal owner."""
        # Create capsule
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Surprise message!",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()

        # Complete the node
        response = await client.post(
            f"/api/nodes/{test_node.id}/complete",
            headers=goal_owner_auth_headers
        )
        assert response.status_code == 200

        # Verify notification was created
        result = await db_session.execute(
            select(Notification).where(
                Notification.user_id == test_goal_owner.id,
                Notification.notification_type == "capsule_unlocked"
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None
        assert "time capsule has been unlocked" in notification.title.lower()
        assert notification.data.get("capsule_id") == str(capsule.id)
        assert notification.data.get("node_id") == str(test_node.id)

    @pytest.mark.asyncio
    async def test_completing_node_only_unlocks_node_complete_type(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that completing node only unlocks NODE_COMPLETE capsules, not DATE capsules."""
        future_date = datetime.utcnow() + timedelta(days=30)

        # Create one NODE_COMPLETE and one DATE capsule
        capsule_node = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Node complete capsule",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        capsule_date = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Date capsule",
            unlock_type=UnlockType.DATE,
            unlock_date=future_date,
            is_unlocked=False
        )
        db_session.add_all([capsule_node, capsule_date])
        await db_session.commit()

        # Complete the node
        response = await client.post(
            f"/api/nodes/{test_node.id}/complete",
            headers=goal_owner_auth_headers
        )
        assert response.status_code == 200

        # Verify only NODE_COMPLETE capsule is unlocked
        await db_session.refresh(capsule_node)
        await db_session.refresh(capsule_date)
        assert capsule_node.is_unlocked is True
        assert capsule_date.is_unlocked is False

    @pytest.mark.asyncio
    async def test_completing_node_does_not_unlock_already_unlocked(
        self,
        client: AsyncClient,
        test_node: Node,
        goal_owner_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that completing node doesn't affect already unlocked capsules."""
        original_unlock_time = datetime.utcnow() - timedelta(hours=1)

        # Create already unlocked capsule
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Already unlocked",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=True,
            unlocked_at=original_unlock_time
        )
        db_session.add(capsule)
        await db_session.commit()

        # Complete the node
        response = await client.post(
            f"/api/nodes/{test_node.id}/complete",
            headers=goal_owner_auth_headers
        )
        assert response.status_code == 200

        # Verify unlock time hasn't changed
        await db_session.refresh(capsule)
        assert capsule.is_unlocked is True
        assert capsule.unlocked_at == original_unlock_time


class TestManualUnlock:
    """Tests for POST /api/time-capsules/{capsule_id}/unlock endpoint (manual trigger for testing)."""

    @pytest.mark.asyncio
    async def test_manual_unlock_capsule(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test manually unlocking a capsule."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Manual unlock test",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.post(
            f"/api/time-capsules/{capsule.id}/unlock",
            headers=supporter_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_unlocked"] is True
        assert data["unlocked_at"] is not None

        # Verify in database
        await db_session.refresh(capsule)
        assert capsule.is_unlocked is True

    @pytest.mark.asyncio
    async def test_manual_unlock_creates_notification(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User,
        test_goal_owner: User
    ):
        """Test that manual unlock creates notification."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Notification test",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=False
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.post(
            f"/api/time-capsules/{capsule.id}/unlock",
            headers=supporter_auth_headers
        )
        assert response.status_code == 200

        # Verify notification
        result = await db_session.execute(
            select(Notification).where(
                Notification.user_id == test_goal_owner.id,
                Notification.notification_type == "capsule_unlocked"
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None

    @pytest.mark.asyncio
    async def test_cannot_unlock_already_unlocked(
        self,
        client: AsyncClient,
        test_node: Node,
        supporter_auth_headers: dict,
        db_session: AsyncSession,
        test_supporter: User
    ):
        """Test that unlocking already unlocked capsule fails."""
        capsule = TimeCapsule(
            sender_id=test_supporter.id,
            node_id=test_node.id,
            content="Already unlocked",
            unlock_type=UnlockType.NODE_COMPLETE,
            is_unlocked=True,
            unlocked_at=datetime.utcnow()
        )
        db_session.add(capsule)
        await db_session.commit()
        await db_session.refresh(capsule)

        response = await client.post(
            f"/api/time-capsules/{capsule.id}/unlock",
            headers=supporter_auth_headers
        )

        assert response.status_code == 400
        assert "already unlocked" in response.json()["detail"].lower()
