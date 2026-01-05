"""
Tests for the reactions system.

Tests Issue #49 fixes:
- Correct reaction_type storage
- Toggle behavior (add/remove same reaction)
- Replace behavior (different reaction replaces existing)
- Only one reaction per user per target
"""
import uuid
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.interaction import Interaction, InteractionType, TargetType, ReactionType
from app.models.user import User
from app.services.auth import AuthService


class TestReactionsAPI:
    """Test the reactions API endpoints."""

    @pytest_asyncio.fixture
    async def target_id(self):
        """Generate a test target ID (simulating a node)."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_create_reaction_fire(
        self,
        client,
        test_user: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test creating a fire reaction."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "removed" not in data  # Should be a created reaction, not removal
        assert data.get("reaction_type") == "fire"

        # Verify in database
        result = await db_session.execute(
            select(Interaction).where(
                Interaction.user_id == test_user.id,
                Interaction.target_id == target_id
            )
        )
        interaction = result.scalar_one_or_none()
        assert interaction is not None
        assert interaction.reaction_type == "fire"

    @pytest.mark.asyncio
    async def test_create_reaction_lightning(
        self,
        client,
        test_user: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test creating a lightning reaction - verifies correct type storage."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "lightning"
            },
            headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("reaction_type") == "lightning"  # Not "fire"!

        # Verify in database
        result = await db_session.execute(
            select(Interaction).where(
                Interaction.user_id == test_user.id,
                Interaction.target_id == target_id
            )
        )
        interaction = result.scalar_one_or_none()
        assert interaction is not None
        assert interaction.reaction_type == "lightning"

    @pytest.mark.asyncio
    async def test_create_reaction_all_types(
        self,
        client,
        test_user: User,
        db_session: AsyncSession
    ):
        """Test that all reaction types are stored correctly."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        reaction_types = ["fire", "water", "nature", "lightning", "magic"]

        for reaction_type in reaction_types:
            # Use different target for each test
            target_id = uuid.uuid4()

            response = await client.post(
                "/api/interactions/reactions",
                json={
                    "target_type": "node",
                    "target_id": str(target_id),
                    "reaction_type": reaction_type
                },
                headers=headers
            )

            assert response.status_code == 200
            data = response.json()
            assert data.get("reaction_type") == reaction_type, \
                f"Expected {reaction_type}, got {data.get('reaction_type')}"

    @pytest.mark.asyncio
    async def test_toggle_off_same_reaction(
        self,
        client,
        test_user: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test toggling off a reaction by clicking the same type."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # First click - create reaction
        response1 = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers
        )
        assert response1.status_code == 200
        assert "removed" not in response1.json()

        # Second click on same type - should toggle off (remove)
        response2 = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers
        )
        assert response2.status_code == 200
        data = response2.json()
        assert data.get("removed") is True
        assert data.get("reaction_type") == "fire"

        # Verify removed from database
        result = await db_session.execute(
            select(Interaction).where(
                Interaction.user_id == test_user.id,
                Interaction.target_id == target_id,
                Interaction.interaction_type == InteractionType.REACTION
            )
        )
        interaction = result.scalar_one_or_none()
        assert interaction is None

    @pytest.mark.asyncio
    async def test_replace_different_reaction(
        self,
        client,
        test_user: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test replacing a reaction with a different type."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # First reaction - fire
        response1 = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers
        )
        assert response1.status_code == 200

        # Second reaction - different type (lightning) should replace
        response2 = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "lightning"
            },
            headers=headers
        )
        assert response2.status_code == 200
        data = response2.json()
        assert "removed" not in data
        assert data.get("reaction_type") == "lightning"

        # Verify only one reaction exists in database
        result = await db_session.execute(
            select(Interaction).where(
                Interaction.user_id == test_user.id,
                Interaction.target_id == target_id,
                Interaction.interaction_type == InteractionType.REACTION
            )
        )
        interactions = result.scalars().all()
        assert len(interactions) == 1
        assert interactions[0].reaction_type == "lightning"

    @pytest.mark.asyncio
    async def test_only_one_reaction_per_user_per_target(
        self,
        client,
        test_user: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test that a user can only have one reaction per target."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Create multiple reactions in sequence
        for reaction_type in ["fire", "water", "nature", "lightning", "magic"]:
            await client.post(
                "/api/interactions/reactions",
                json={
                    "target_type": "node",
                    "target_id": str(target_id),
                    "reaction_type": reaction_type
                },
                headers=headers
            )

        # Verify only one reaction exists
        result = await db_session.execute(
            select(Interaction).where(
                Interaction.user_id == test_user.id,
                Interaction.target_id == target_id,
                Interaction.interaction_type == InteractionType.REACTION
            )
        )
        interactions = result.scalars().all()
        assert len(interactions) == 1
        # Should be the last one (magic)
        assert interactions[0].reaction_type == "magic"

    @pytest.mark.asyncio
    async def test_different_users_can_react_same_target(
        self,
        client,
        test_user: User,
        test_user_2: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test that different users can react to the same target."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User 1 reacts with fire
        response1 = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers1
        )
        assert response1.status_code == 200

        # User 2 reacts with lightning
        response2 = await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "lightning"
            },
            headers=headers2
        )
        assert response2.status_code == 200

        # Both reactions should exist
        result = await db_session.execute(
            select(Interaction).where(
                Interaction.target_id == target_id,
                Interaction.interaction_type == InteractionType.REACTION
            )
        )
        interactions = result.scalars().all()
        assert len(interactions) == 2

        reaction_types = {i.reaction_type for i in interactions}
        assert reaction_types == {"fire", "lightning"}


class TestReactionSummaryAPI:
    """Test the reaction summary endpoint."""

    @pytest_asyncio.fixture
    async def target_id(self):
        """Generate a test target ID."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_get_reaction_summary_empty(
        self,
        client,
        target_id: uuid.UUID
    ):
        """Test getting summary for target with no reactions."""
        response = await client.get(
            f"/api/interactions/reactions/node/{target_id}/summary"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 0
        assert data["counts"] == {}
        assert data["user_reaction"] is None

    @pytest.mark.asyncio
    async def test_get_reaction_summary_with_reactions(
        self,
        client,
        test_user: User,
        test_user_2: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test getting summary with reactions from multiple users."""
        token1 = AuthService.create_access_token({"sub": str(test_user.id)})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = AuthService.create_access_token({"sub": str(test_user_2.id)})
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User 1 reacts with fire
        await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers1
        )

        # User 2 reacts with fire too
        await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers2
        )

        # Get summary as user 1
        response = await client.get(
            f"/api/interactions/reactions/node/{target_id}/summary",
            headers=headers1
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] == 2
        assert data["counts"]["fire"] == 2
        assert data["user_reaction"] == "fire"

    @pytest.mark.asyncio
    async def test_summary_reflects_toggle(
        self,
        client,
        test_user: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test that summary correctly reflects toggle behavior."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Add reaction
        await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers
        )

        # Verify in summary
        response1 = await client.get(
            f"/api/interactions/reactions/node/{target_id}/summary",
            headers=headers
        )
        data1 = response1.json()
        assert data1["total_count"] == 1
        assert data1["user_reaction"] == "fire"

        # Toggle off
        await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers
        )

        # Verify removed in summary
        response2 = await client.get(
            f"/api/interactions/reactions/node/{target_id}/summary",
            headers=headers
        )
        data2 = response2.json()
        assert data2["total_count"] == 0
        assert data2["user_reaction"] is None

    @pytest.mark.asyncio
    async def test_summary_reflects_replace(
        self,
        client,
        test_user: User,
        target_id: uuid.UUID,
        db_session: AsyncSession
    ):
        """Test that summary correctly reflects replacement behavior."""
        token = AuthService.create_access_token({"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        # Add fire reaction
        await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "fire"
            },
            headers=headers
        )

        # Replace with lightning
        await client.post(
            "/api/interactions/reactions",
            json={
                "target_type": "node",
                "target_id": str(target_id),
                "reaction_type": "lightning"
            },
            headers=headers
        )

        # Verify in summary - should show lightning, not fire
        response = await client.get(
            f"/api/interactions/reactions/node/{target_id}/summary",
            headers=headers
        )
        data = response.json()
        assert data["total_count"] == 1
        assert data["counts"].get("fire", 0) == 0
        assert data["counts"]["lightning"] == 1
        assert data["user_reaction"] == "lightning"


class TestReactionUnit:
    """Unit tests for reaction logic."""

    @pytest.mark.asyncio
    async def test_reaction_type_enum_values(self):
        """Test that ReactionType enum has expected values."""
        expected = {"fire", "water", "nature", "lightning", "magic"}
        actual = {r.value for r in ReactionType}
        assert actual == expected

    @pytest.mark.asyncio
    async def test_interaction_model_reaction_type_storage(
        self,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test direct model storage of reaction types."""
        target_id = uuid.uuid4()

        for reaction_type in ["fire", "water", "nature", "lightning", "magic"]:
            interaction = Interaction(
                user_id=test_user.id,
                target_type=TargetType.NODE,
                target_id=target_id,
                interaction_type=InteractionType.REACTION,
                reaction_type=reaction_type
            )
            db_session.add(interaction)
            await db_session.flush()

            # Query it back
            result = await db_session.execute(
                select(Interaction).where(Interaction.id == interaction.id)
            )
            saved = result.scalar_one()
            assert saved.reaction_type == reaction_type, \
                f"Expected {reaction_type}, got {saved.reaction_type}"

            # Clean up for next iteration
            await db_session.delete(interaction)
            await db_session.flush()
