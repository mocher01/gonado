"""
Tests for the Sacred Boost feature.

Tests Issue #55 implementation:
- Sacred Boost button opens modal
- Message can be sent with boost
- Rate limiting (3 per goal per day) works
- Owner gets notification
"""
import uuid
from datetime import date
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.sacred_boost import SacredBoost
from app.models.goal import Goal
from app.models.notification import Notification
from app.models.user import User
from app.services.auth import AuthService


class TestSacredBoostAPI:
    """Test the sacred boost API endpoints."""

    @pytest_asyncio.fixture
    async def public_goal(
        self,
        db_session: AsyncSession,
        test_user: User
    ) -> Goal:
        """Create a public goal for testing."""
        goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Test Goal for Boosting",
            description="A test goal to receive sacred boosts",
            visibility="public",
            status="active"
        )
        db_session.add(goal)
        await db_session.commit()
        await db_session.refresh(goal)
        return goal

    @pytest.mark.asyncio
    async def test_give_sacred_boost(
        self,
        client,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test giving a sacred boost to a goal."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={},
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["goal_id"] == str(public_goal.id)
        assert data["giver_id"] == str(test_user_2.id)
        assert data["xp_awarded"] == 50
        assert data["giver_username"] == test_user_2.username

    @pytest.mark.asyncio
    async def test_give_sacred_boost_with_message(
        self,
        client,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test giving a sacred boost with an encouragement message."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        message = "You're doing amazing! Keep going!"
        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={"message": message},
            headers=headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["message"] == message

        # Verify in database
        result = await db_session.execute(
            select(SacredBoost).where(SacredBoost.goal_id == public_goal.id)
        )
        boost = result.scalar_one()
        assert boost.message == message

    @pytest.mark.asyncio
    async def test_rate_limit_3_per_goal_per_day(
        self,
        client,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that users can only give 3 boosts per goal per day."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # First 3 boosts should succeed
        for i in range(3):
            response = await client.post(
                f"/api/sacred-boosts/goals/{public_goal.id}",
                json={"message": f"Boost {i + 1}"},
                headers=headers
            )
            assert response.status_code == 201, f"Boost {i + 1} should succeed"

        # 4th boost should fail with rate limit
        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={"message": "Boost 4 - should fail"},
            headers=headers
        )
        assert response.status_code == 429
        assert "already given" in response.json()["detail"].lower() or "daily limit" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_cannot_boost_own_goal(
        self,
        client,
        test_user: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that users cannot boost their own goals."""
        # test_user owns the goal
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={},
            headers=headers
        )

        assert response.status_code == 400
        assert "own goal" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_notification_created_on_boost(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that a notification is created for the goal owner when boosted."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Clear existing notifications
        await db_session.execute(
            Notification.__table__.delete().where(Notification.user_id == test_user.id)
        )
        await db_session.commit()

        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={"message": "Keep crushing it!"},
            headers=headers
        )

        assert response.status_code == 201

        # Check notification
        result = await db_session.execute(
            select(Notification).where(
                Notification.user_id == test_user.id,
                Notification.type == "sacred_boost"
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None
        assert "Sacred Boost" in notification.title
        assert public_goal.title in notification.message

    @pytest.mark.asyncio
    async def test_notification_includes_message(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that the notification includes the boost message if provided."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Clear existing notifications
        await db_session.execute(
            Notification.__table__.delete().where(Notification.user_id == test_user.id)
        )
        await db_session.commit()

        boost_message = "You inspire me every day!"
        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={"message": boost_message},
            headers=headers
        )

        assert response.status_code == 201

        # Check notification includes the message
        result = await db_session.execute(
            select(Notification).where(
                Notification.user_id == test_user.id,
                Notification.type == "sacred_boost"
            )
        )
        notification = result.scalar_one_or_none()
        assert notification is not None
        assert boost_message in notification.message

    @pytest.mark.asyncio
    async def test_get_goal_boosts(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test retrieving all boosts for a goal."""
        # Create boosts
        for i in range(2):
            boost = SacredBoost(
                giver_id=test_user_2.id,
                receiver_id=test_user.id,
                goal_id=public_goal.id,
                message=f"Boost message {i}",
                boost_date=date.today(),
                year_month=date.today().year * 100 + date.today().month,
                xp_awarded=50
            )
            db_session.add(boost)
        await db_session.commit()

        response = await client.get(f"/api/sacred-boosts/goals/{public_goal.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2
        assert len(data["boosts"]) >= 2
        # Check message is included
        messages = [b["message"] for b in data["boosts"]]
        assert any("Boost message" in m for m in messages if m)

    @pytest.mark.asyncio
    async def test_check_can_boost(
        self,
        client,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test checking if user can boost a specific goal."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get(
            f"/api/sacred-boosts/check/{public_goal.id}",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["can_boost"] is True
        assert data["boosts_remaining_for_goal"] == 3
        assert data["max_per_day"] == 3

    @pytest.mark.asyncio
    async def test_check_can_boost_after_reaching_limit(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test check endpoint shows correct status after reaching daily limit."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Create 3 boosts for today
        for i in range(3):
            boost = SacredBoost(
                giver_id=test_user_2.id,
                receiver_id=test_user.id,
                goal_id=public_goal.id,
                message=f"Boost {i}",
                boost_date=date.today(),
                year_month=date.today().year * 100 + date.today().month,
                xp_awarded=50
            )
            db_session.add(boost)
        await db_session.commit()

        response = await client.get(
            f"/api/sacred-boosts/check/{public_goal.id}",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["can_boost"] is False
        assert data["boosts_remaining_for_goal"] == 0
        assert data["boosts_today_for_goal"] == 3
        assert data["reason"] is not None

    @pytest.mark.asyncio
    async def test_get_boost_status(
        self,
        client,
        test_user_2: User,
        db_session: AsyncSession
    ):
        """Test getting user's overall boost status for today."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get(
            "/api/sacred-boosts/status",
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "boosts_remaining_today" in data
        assert "boosts_given_today" in data
        assert data["max_boosts_per_day"] == 3

    @pytest.mark.asyncio
    async def test_xp_awarded_to_goal_owner(
        self,
        client,
        test_user: User,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that 50 XP is awarded to the goal owner when boosted."""
        # Get initial XP
        initial_xp = test_user.xp

        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={},
            headers=headers
        )

        assert response.status_code == 201

        # Refresh user and check XP
        await db_session.refresh(test_user)
        assert test_user.xp == initial_xp + 50


class TestSacredBoostValidation:
    """Test validation for sacred boosts."""

    @pytest_asyncio.fixture
    async def public_goal(
        self,
        db_session: AsyncSession,
        test_user: User
    ) -> Goal:
        """Create a public goal for testing."""
        goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Test Goal",
            visibility="public",
            status="active"
        )
        db_session.add(goal)
        await db_session.commit()
        return goal

    @pytest.mark.asyncio
    async def test_boost_nonexistent_goal(
        self,
        client,
        test_user_2: User
    ):
        """Test boosting a goal that doesn't exist."""
        fake_goal_id = uuid.uuid4()
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/sacred-boosts/goals/{fake_goal_id}",
            json={},
            headers=headers
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_requires_authentication(
        self,
        client,
        public_goal: Goal
    ):
        """Test that boosting requires authentication."""
        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={}
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_cannot_boost_private_goal(
        self,
        client,
        test_user: User,
        test_user_2: User,
        db_session: AsyncSession
    ):
        """Test that users cannot boost private goals."""
        # Create a private goal
        private_goal = Goal(
            id=uuid.uuid4(),
            user_id=test_user.id,
            title="Private Goal",
            visibility="private",
            status="active"
        )
        db_session.add(private_goal)
        await db_session.commit()

        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            f"/api/sacred-boosts/goals/{private_goal.id}",
            json={},
            headers=headers
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_message_length_validation(
        self,
        client,
        test_user_2: User,
        public_goal: Goal,
        db_session: AsyncSession
    ):
        """Test that message has a maximum length limit."""
        token = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Create a very long message (over 500 chars)
        long_message = "x" * 600

        response = await client.post(
            f"/api/sacred-boosts/goals/{public_goal.id}",
            json={"message": long_message},
            headers=headers
        )

        # Should either fail validation or truncate
        # The schema has max_length=500, so it should fail
        assert response.status_code == 422
