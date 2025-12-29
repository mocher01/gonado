from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.interaction import CommentCreate, ReactionCreate, InteractionResponse
from app.models.interaction import Interaction, InteractionType
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
    # Check if user already reacted with same type
    result = await db.execute(
        select(Interaction).where(
            Interaction.user_id == current_user.id,
            Interaction.target_type == reaction_data.target_type,
            Interaction.target_id == reaction_data.target_id,
            Interaction.interaction_type == InteractionType.REACTION,
            Interaction.reaction_type == reaction_data.reaction_type
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
        reaction_type=reaction_data.reaction_type
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
