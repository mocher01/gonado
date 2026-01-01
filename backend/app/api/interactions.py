from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.schemas.interaction import (
    CommentCreate, ReactionCreate, InteractionResponse,
    InteractionWithUserResponse, ReactionSummary
)
from app.models.interaction import Interaction, InteractionType, TargetType, ReactionType
from app.models.user import User
from app.services.gamification import gamification_service, XP_REWARDS

router = APIRouter()


@router.post("/comments", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a comment on a target."""
    interaction = Interaction(
        user_id=current_user.id,
        target_type=comment_data.target_type,
        target_id=comment_data.target_id,
        interaction_type=InteractionType.COMMENT,
        content=comment_data.content
    )
    db.add(interaction)
    await db.flush()
    return interaction


@router.post("/reactions", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_reaction(
    reaction_data: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a reaction on a target."""
    reaction_type_value = reaction_data.reaction_type.value if isinstance(reaction_data.reaction_type, ReactionType) else reaction_data.reaction_type

    # Check if user already reacted with same type
    result = await db.execute(
        select(Interaction).where(
            Interaction.user_id == current_user.id,
            Interaction.target_type == reaction_data.target_type,
            Interaction.target_id == reaction_data.target_id,
            Interaction.interaction_type == InteractionType.REACTION,
            Interaction.reaction_type == reaction_type_value
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already reacted with this type")

    interaction = Interaction(
        user_id=current_user.id,
        target_type=reaction_data.target_type,
        target_id=reaction_data.target_id,
        interaction_type=InteractionType.REACTION,
        reaction_type=reaction_type_value
    )
    db.add(interaction)
    await db.flush()
    return interaction


@router.get("/target/{target_type}/{target_id}", response_model=list[InteractionResponse])
async def get_interactions(
    target_type: str,
    target_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all interactions for a target."""
    result = await db.execute(
        select(Interaction).where(
            Interaction.target_type == target_type,
            Interaction.target_id == target_id
        ).order_by(Interaction.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an interaction."""
    result = await db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.user_id == current_user.id
        )
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")

    await db.delete(interaction)


@router.delete("/reactions/{target_type}/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction(
    target_type: TargetType,
    target_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove user's reaction from a target."""
    result = await db.execute(
        select(Interaction).where(
            Interaction.user_id == current_user.id,
            Interaction.target_type == target_type,
            Interaction.target_id == target_id,
            Interaction.interaction_type == InteractionType.REACTION
        )
    )
    reaction = result.scalar_one_or_none()
    if reaction:
        await db.delete(reaction)


@router.get("/reactions/{target_type}/{target_id}/summary", response_model=ReactionSummary)
async def get_reaction_summary(
    target_type: TargetType,
    target_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get reaction counts summary for a target."""
    # Get counts per reaction type
    result = await db.execute(
        select(Interaction.reaction_type, func.count(Interaction.id))
        .where(
            Interaction.target_type == target_type,
            Interaction.target_id == target_id,
            Interaction.interaction_type == InteractionType.REACTION
        )
        .group_by(Interaction.reaction_type)
    )
    rows = result.all()

    counts = {row[0]: row[1] for row in rows if row[0]}
    total_count = sum(counts.values())

    # Check if current user has reacted
    user_reaction = None
    if current_user:
        user_result = await db.execute(
            select(Interaction.reaction_type)
            .where(
                Interaction.user_id == current_user.id,
                Interaction.target_type == target_type,
                Interaction.target_id == target_id,
                Interaction.interaction_type == InteractionType.REACTION
            )
            .limit(1)
        )
        user_reaction_row = user_result.scalar_one_or_none()
        if user_reaction_row:
            user_reaction = user_reaction_row

    return ReactionSummary(
        total_count=total_count,
        counts=counts,
        user_reaction=user_reaction
    )


@router.get("/reactions/{target_type}/{target_id}/users", response_model=list[InteractionWithUserResponse])
async def get_reaction_users(
    target_type: TargetType,
    target_id: UUID,
    reaction_type: Optional[ReactionType] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get users who reacted to a target."""
    query = (
        select(Interaction, User)
        .join(User, Interaction.user_id == User.id)
        .where(
            Interaction.target_type == target_type,
            Interaction.target_id == target_id,
            Interaction.interaction_type == InteractionType.REACTION
        )
    )

    if reaction_type:
        reaction_value = reaction_type.value if isinstance(reaction_type, ReactionType) else reaction_type
        query = query.where(Interaction.reaction_type == reaction_value)

    query = query.order_by(Interaction.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        InteractionWithUserResponse(
            id=interaction.id,
            user_id=interaction.user_id,
            target_type=interaction.target_type,
            target_id=interaction.target_id,
            interaction_type=interaction.interaction_type,
            content=interaction.content,
            reaction_type=interaction.reaction_type,
            created_at=interaction.created_at,
            user_username=user.username,
            user_display_name=user.display_name,
            user_avatar_url=user.avatar_url
        )
        for interaction, user in rows
    ]


@router.get("/target/{target_type}/{target_id}/with-users", response_model=list[InteractionWithUserResponse])
async def get_interactions_with_users(
    target_type: TargetType,
    target_id: UUID,
    interaction_type: Optional[InteractionType] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get all interactions for a target with user details."""
    query = (
        select(Interaction, User)
        .join(User, Interaction.user_id == User.id)
        .where(
            Interaction.target_type == target_type,
            Interaction.target_id == target_id
        )
    )

    if interaction_type:
        query = query.where(Interaction.interaction_type == interaction_type)

    query = query.order_by(Interaction.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        InteractionWithUserResponse(
            id=interaction.id,
            user_id=interaction.user_id,
            target_type=interaction.target_type,
            target_id=interaction.target_id,
            interaction_type=interaction.interaction_type,
            content=interaction.content,
            reaction_type=interaction.reaction_type,
            created_at=interaction.created_at,
            user_username=user.username,
            user_display_name=user.display_name,
            user_avatar_url=user.avatar_url
        )
        for interaction, user in rows
    ]
