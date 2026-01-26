"""
Tests for the Swap System (Issue #71).

Tests the accountability swap proposal system where users can propose
swaps between their goals to support each other.

Endpoints tested:
- POST /api/swaps - Propose a swap
- GET /api/swaps - Get user's swaps
- PUT /api/swaps/{swap_id}/accept - Accept a swap
- PUT /api/swaps/{swap_id}/decline - Decline a swap
- PUT /api/swaps/{swap_id}/cancel - Cancel a swap (by proposer)
- PUT /api/swaps/{swap_id}/complete - Complete a swap
"""
import uuid
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.swap import Swap, SwapStatus
from app.models.goal import Goal, GoalStatus, GoalVisibility
from app.models.node import Node, NodeStatus, NodeType
from app.models.user import User
from app.models.follow import Follow, FollowType
from app.services.auth import AuthService


@pytest_asyncio.fixture
async def proposer_goal(db_session: AsyncSession, test_user: User):
    """Create a goal for the swap proposer."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Learn Python",
        description="Master Python programming",
        category="education",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest_asyncio.fixture
async def proposer_node(db_session: AsyncSession, proposer_goal: Goal):
    """Create a node for the swap proposer's goal."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=proposer_goal.id,
        title="Read Python docs",
        description="Read official Python documentation",
        node_type=NodeType.TASK,
        status=NodeStatus.NOT_STARTED
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


@pytest_asyncio.fixture
async def receiver_goal(db_session: AsyncSession, test_user_2: User):
    """Create a goal for the swap receiver."""
    goal = Goal(
        id=uuid.uuid4(),
        user_id=test_user_2.id,
        title="Build a Web App",
        description="Create a full-stack web application",
        category="technology",
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE
    )
    db_session.add(goal)
    await db_session.commit()
    await db_session.refresh(goal)
    return goal


@pytest_asyncio.fixture
async def receiver_node(db_session: AsyncSession, receiver_goal: Goal):
    """Create a node for the swap receiver's goal."""
    node = Node(
        id=uuid.uuid4(),
        goal_id=receiver_goal.id,
        title="Setup development environment",
        description="Install Node.js and dependencies",
        node_type=NodeType.TASK,
        status=NodeStatus.NOT_STARTED
    )
    db_session.add(node)
    await db_session.commit()
    await db_session.refresh(node)
    return node


class TestSwapCreation:
    """Test creating swap proposals."""

    @pytest.mark.asyncio
    async def test_propose_swap_basic(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test proposing a basic swap without node or message."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["proposer_id"] == str(test_user.id)
        assert data["receiver_id"] == str(test_user_2.id)
        assert data["proposer_goal_id"] == str(proposer_goal.id)
        assert data["status"] == "proposed"
        assert data["proposer_node_id"] is None
        assert data["message"] is None

        # Verify in database
        result = await db_session.execute(
            select(Swap).where(Swap.id == uuid.UUID(data["id"]))
        )
        swap = result.scalar_one_or_none()
        assert swap is not None
        assert swap.status == SwapStatus.PROPOSED

    @pytest.mark.asyncio
    async def test_propose_swap_with_node(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        proposer_node: Node,
        db_session: AsyncSession
    ):
        """Test proposing a swap with a specific node."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id),
                "proposer_node_id": str(proposer_node.id)
            },
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["proposer_node_id"] == str(proposer_node.id)

    @pytest.mark.asyncio
    async def test_propose_swap_with_message(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test proposing a swap with a custom message."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        message = "Let's support each other on our learning journey!"
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id),
                "message": message
            },
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["message"] == message

    @pytest.mark.asyncio
    async def test_cannot_propose_swap_to_self(
        self,
        client: AsyncClient,
        test_user: User,
        proposer_goal: Goal
    ):
        """Test that users cannot propose swaps to themselves."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user.id),  # Same as proposer
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers
        )

        assert response.status_code == 400
        assert "Cannot propose swap to yourself" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_propose_swap_nonexistent_receiver(
        self,
        client: AsyncClient,
        test_user: User,
        proposer_goal: Goal
    ):
        """Test that swap fails if receiver doesn't exist."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        fake_user_id = uuid.uuid4()
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(fake_user_id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers
        )

        assert response.status_code == 404
        assert "Receiver not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_propose_swap_with_others_goal(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        receiver_goal: Goal  # Belongs to test_user_2
    ):
        """Test that users can only propose swaps with their own goals."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(receiver_goal.id)  # Not owned by test_user
            },
            headers=headers
        )

        assert response.status_code == 404
        assert "not owned by you" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_propose_swap_with_invalid_node(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_node: Node  # Belongs to different goal
    ):
        """Test that node must belong to the specified goal."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id),
                "proposer_node_id": str(receiver_node.id)  # Wrong goal
            },
            headers=headers
        )

        assert response.status_code == 404
        assert "not part of the goal" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_propose_duplicate_pending_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that users cannot have multiple pending swaps for same goal/receiver."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        swap_data = {
            "receiver_id": str(test_user_2.id),
            "proposer_goal_id": str(proposer_goal.id)
        }

        # First proposal should succeed
        response1 = await client.post("/api/swaps", json=swap_data, headers=headers)
        assert response1.status_code == 201

        # Second proposal should fail
        response2 = await client.post("/api/swaps", json=swap_data, headers=headers)
        assert response2.status_code == 400
        assert "already have a pending swap" in response2.json()["detail"]

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_propose_swap(
        self,
        client: AsyncClient,
        test_user_2: User,
        proposer_goal: Goal
    ):
        """Test that unauthenticated users cannot propose swaps."""
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            }
        )

        assert response.status_code == 401


class TestSwapListing:
    """Test listing swaps."""

    @pytest.mark.asyncio
    async def test_list_swaps_empty(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test listing swaps when user has none."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/swaps", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["swaps"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_swaps_as_proposer(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test listing swaps where user is the proposer."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Create a swap
        await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id),
                "message": "Let's work together!"
            },
            headers=headers
        )

        # List swaps
        response = await client.get("/api/swaps", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["swaps"]) == 1
        assert data["swaps"][0]["proposer_id"] == str(test_user.id)
        assert data["swaps"][0]["receiver_id"] == str(test_user_2.id)

    @pytest.mark.asyncio
    async def test_list_swaps_as_receiver(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test listing swaps where user is the receiver."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # test_user proposes to test_user_2
        await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )

        # test_user_2 lists their swaps
        response = await client.get("/api/swaps", headers=headers2)

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["swaps"][0]["receiver_id"] == str(test_user_2.id)

    @pytest.mark.asyncio
    async def test_list_swaps_with_status_filter(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test filtering swaps by status."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create two swaps
        response1 = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap1_id = response1.json()["id"]

        # Create second goal for test_user
        second_goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Second Goal",
            description="Another goal",
            category="other",
            visibility=GoalVisibility.PUBLIC,
            status=GoalStatus.ACTIVE
        )
        db_session.add(second_goal)
        await db_session.commit()

        response2 = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(second_goal.id)
            },
            headers=headers1
        )
        swap2_id = response2.json()["id"]

        # Accept first swap
        await client.put(
            f"/api/swaps/{swap1_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )

        # Filter by proposed status (should only show swap2)
        response = await client.get(
            "/api/swaps?status_filter=proposed",
            headers=headers1
        )
        data = response.json()
        assert data["total"] == 1
        assert data["swaps"][0]["id"] == swap2_id
        assert data["swaps"][0]["status"] == "proposed"

        # Filter by accepted status (should only show swap1)
        response = await client.get(
            "/api/swaps?status_filter=accepted",
            headers=headers1
        )
        data = response.json()
        assert data["total"] == 1
        assert data["swaps"][0]["id"] == swap1_id
        assert data["swaps"][0]["status"] == "accepted"

    @pytest.mark.asyncio
    async def test_list_swaps_pagination(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        db_session: AsyncSession
    ):
        """Test pagination in swap listing."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Create multiple goals and swaps
        for i in range(5):
            goal = Goal(
                id=uuid.uuid4(),
                user_id=test_user.id,
                title=f"Goal {i}",
                description=f"Description {i}",
                category="test",
                visibility=GoalVisibility.PUBLIC,
                status=GoalStatus.ACTIVE
            )
            db_session.add(goal)
            await db_session.commit()

            await client.post(
                "/api/swaps",
                json={
                    "receiver_id": str(test_user_2.id),
                    "proposer_goal_id": str(goal.id)
                },
                headers=headers
            )

        # Get first page (limit 2)
        response = await client.get("/api/swaps?limit=2&offset=0", headers=headers)
        data = response.json()
        assert data["total"] == 5
        assert len(data["swaps"]) == 2

        # Get second page
        response = await client.get("/api/swaps?limit=2&offset=2", headers=headers)
        data = response.json()
        assert data["total"] == 5
        assert len(data["swaps"]) == 2

    @pytest.mark.asyncio
    async def test_unauthenticated_cannot_list_swaps(
        self,
        client: AsyncClient
    ):
        """Test that unauthenticated users cannot list swaps."""
        response = await client.get("/api/swaps")
        assert response.status_code == 401


class TestSwapAcceptance:
    """Test accepting swap proposals."""

    @pytest.mark.asyncio
    async def test_accept_swap_basic(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test accepting a swap proposal."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Accept swap
        response = await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["receiver_goal_id"] == str(receiver_goal.id)

        # Verify in database
        result = await db_session.execute(
            select(Swap).where(Swap.id == uuid.UUID(swap_id))
        )
        swap = result.scalar_one()
        assert swap.status == SwapStatus.ACCEPTED

    @pytest.mark.asyncio
    async def test_accept_swap_with_node(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        receiver_node: Node,
        db_session: AsyncSession
    ):
        """Test accepting a swap with a specific node."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Accept swap with node
        response = await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={
                "receiver_goal_id": str(receiver_goal.id),
                "receiver_node_id": str(receiver_node.id)
            },
            headers=headers2
        )

        assert response.status_code == 200
        data = response.json()
        assert data["receiver_node_id"] == str(receiver_node.id)

    @pytest.mark.asyncio
    async def test_accept_swap_creates_follow_relationships(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that accepting a swap creates mutual follow relationships."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Accept swap
        await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )

        # Verify proposer follows receiver's goal
        result = await db_session.execute(
            select(Follow).where(
                Follow.follower_id == test_user.id,
                Follow.follow_type == FollowType.GOAL,
                Follow.target_id == receiver_goal.id
            )
        )
        follow1 = result.scalar_one_or_none()
        assert follow1 is not None

        # Verify receiver follows proposer's goal
        result = await db_session.execute(
            select(Follow).where(
                Follow.follower_id == test_user_2.id,
                Follow.follow_type == FollowType.GOAL,
                Follow.target_id == proposer_goal.id
            )
        )
        follow2 = result.scalar_one_or_none()
        assert follow2 is not None

    @pytest.mark.asyncio
    async def test_only_receiver_can_accept_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that only the receiver can accept a swap."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Proposer tries to accept their own swap (should fail)
        response = await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers1  # Using proposer's token
        )

        assert response.status_code == 404
        assert "cannot be accepted" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_accept_already_accepted_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that an already accepted swap cannot be accepted again."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Accept swap first time
        response = await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )
        assert response.status_code == 200

        # Try to accept again (should fail)
        response = await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_cannot_accept_with_invalid_node(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        proposer_node: Node,  # Belongs to different goal
        db_session: AsyncSession
    ):
        """Test that receiver's node must belong to their goal."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Try to accept with wrong node
        response = await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={
                "receiver_goal_id": str(receiver_goal.id),
                "receiver_node_id": str(proposer_node.id)  # Wrong goal
            },
            headers=headers2
        )

        assert response.status_code == 404
        assert "not part of the goal" in response.json()["detail"]


class TestSwapDeclining:
    """Test declining swap proposals."""

    @pytest.mark.asyncio
    async def test_decline_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test declining a swap proposal."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Decline swap
        response = await client.put(
            f"/api/swaps/{swap_id}/decline",
            headers=headers2
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "declined"

        # Verify in database
        result = await db_session.execute(
            select(Swap).where(Swap.id == uuid.UUID(swap_id))
        )
        swap = result.scalar_one()
        assert swap.status == SwapStatus.DECLINED

    @pytest.mark.asyncio
    async def test_only_receiver_can_decline_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that only the receiver can decline a swap."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Proposer tries to decline (should fail)
        response = await client.put(
            f"/api/swaps/{swap_id}/decline",
            headers=headers1  # Using proposer's token
        )

        assert response.status_code == 404
        assert "cannot be declined" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_decline_already_declined_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that an already declined swap cannot be declined again."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Decline first time
        response = await client.put(
            f"/api/swaps/{swap_id}/decline",
            headers=headers2
        )
        assert response.status_code == 200

        # Try to decline again (should fail)
        response = await client.put(
            f"/api/swaps/{swap_id}/decline",
            headers=headers2
        )
        assert response.status_code == 404


class TestSwapCancellation:
    """Test cancelling swap proposals."""

    @pytest.mark.asyncio
    async def test_cancel_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test cancelling a swap proposal."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Cancel swap
        response = await client.put(
            f"/api/swaps/{swap_id}/cancel",
            headers=headers1
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"

        # Verify in database
        result = await db_session.execute(
            select(Swap).where(Swap.id == uuid.UUID(swap_id))
        )
        swap = result.scalar_one()
        assert swap.status == SwapStatus.CANCELLED

    @pytest.mark.asyncio
    async def test_only_proposer_can_cancel_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that only the proposer can cancel a swap."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Receiver tries to cancel (should fail)
        response = await client.put(
            f"/api/swaps/{swap_id}/cancel",
            headers=headers2  # Using receiver's token
        )

        assert response.status_code == 404
        assert "cannot be cancelled" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_cannot_cancel_accepted_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that proposer cannot cancel an already accepted swap."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Accept swap
        await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )

        # Try to cancel (should fail)
        response = await client.put(
            f"/api/swaps/{swap_id}/cancel",
            headers=headers1
        )
        assert response.status_code == 404


class TestSwapCompletion:
    """Test completing swaps."""

    @pytest.mark.asyncio
    async def test_complete_swap_by_proposer(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that proposer can complete an accepted swap."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create and accept swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )

        # Complete swap as proposer
        response = await client.put(
            f"/api/swaps/{swap_id}/complete",
            headers=headers1
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_complete_swap_by_receiver(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that receiver can complete an accepted swap."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create and accept swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )

        # Complete swap as receiver
        response = await client.put(
            f"/api/swaps/{swap_id}/complete",
            headers=headers2
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_cannot_complete_proposed_swap(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that a swap must be accepted before it can be completed."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Create swap (but don't accept)
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Try to complete (should fail)
        response = await client.put(
            f"/api/swaps/{swap_id}/complete",
            headers=headers1
        )

        assert response.status_code == 404
        assert "cannot be completed" in response.json()["detail"]


class TestSwapStatusTransitions:
    """Test swap status state machine transitions."""

    @pytest.mark.asyncio
    async def test_proposed_to_accepted(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test PROPOSED -> ACCEPTED transition."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap (PROPOSED)
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        assert response.json()["status"] == "proposed"
        swap_id = response.json()["id"]

        # Accept (PROPOSED -> ACCEPTED)
        response = await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )
        assert response.json()["status"] == "accepted"

    @pytest.mark.asyncio
    async def test_proposed_to_declined(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test PROPOSED -> DECLINED transition."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create swap (PROPOSED)
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Decline (PROPOSED -> DECLINED)
        response = await client.put(
            f"/api/swaps/{swap_id}/decline",
            headers=headers2
        )
        assert response.json()["status"] == "declined"

    @pytest.mark.asyncio
    async def test_proposed_to_cancelled(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        db_session: AsyncSession
    ):
        """Test PROPOSED -> CANCELLED transition."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        # Create swap (PROPOSED)
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        # Cancel (PROPOSED -> CANCELLED)
        response = await client.put(
            f"/api/swaps/{swap_id}/cancel",
            headers=headers1
        )
        assert response.json()["status"] == "cancelled"

    @pytest.mark.asyncio
    async def test_accepted_to_completed(
        self,
        client: AsyncClient,
        test_user: User,
        test_user_2: User,
        proposer_goal: Goal,
        receiver_goal: Goal,
        db_session: AsyncSession
    ):
        """Test ACCEPTED -> COMPLETED transition."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Create and accept swap
        response = await client.post(
            "/api/swaps",
            json={
                "receiver_id": str(test_user_2.id),
                "proposer_goal_id": str(proposer_goal.id)
            },
            headers=headers1
        )
        swap_id = response.json()["id"]

        await client.put(
            f"/api/swaps/{swap_id}/accept",
            json={"receiver_goal_id": str(receiver_goal.id)},
            headers=headers2
        )

        # Complete (ACCEPTED -> COMPLETED)
        response = await client.put(
            f"/api/swaps/{swap_id}/complete",
            headers=headers1
        )
        assert response.json()["status"] == "completed"
