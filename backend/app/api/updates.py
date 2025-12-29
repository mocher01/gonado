from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.update import UpdateCreate, UpdateResponse
from app.models.update import Update
from app.models.node import Node
from app.models.goal import Goal
from app.models.user import User
from app.services.gamification import gamification_service, XP_REWARDS
from app.services.notifications import notification_service

router = APIRouter()


@router.post("/nodes/{node_id}", response_model=UpdateResponse, status_code=status.HTTP_201_CREATED)
async def create_update(
    node_id: UUID,
    update_data: UpdateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create an update for a node."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    update = Update(
        node_id=node_id,
        user_id=current_user.id,
        content=update_data.content,
        media_urls=update_data.media_urls,
        update_type=update_data.update_type
    )
    db.add(update)

    # Award XP
    await gamification_service.award_xp(
        db, current_user.id, XP_REWARDS["post_update"], "Posted update"
    )

    # Update streak
    await gamification_service.update_streak(db, current_user.id)

    # Notify followers
    await notification_service.broadcast_to_goal_followers(
        node.goal_id,
        "update_posted",
        f"{current_user.display_name} posted an update",
        update_data.content[:100],
        {"node_id": str(node_id), "update_type": update_data.update_type.value}
    )

    await db.flush()
    return update


@router.get("/nodes/{node_id}", response_model=list[UpdateResponse])
async def get_node_updates(
    node_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all updates for a node."""
    result = await db.execute(
        select(Update).where(Update.node_id == node_id).order_by(Update.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{update_id}", response_model=UpdateResponse)
async def get_update(
    update_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific update."""
    result = await db.execute(select(Update).where(Update.id == update_id))
    update = result.scalar_one_or_none()
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")
    return update


@router.delete("/{update_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_update(
    update_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an update."""
    result = await db.execute(
        select(Update).where(Update.id == update_id, Update.user_id == current_user.id)
    )
    update = result.scalar_one_or_none()
    if not update:
        raise HTTPException(status_code=404, detail="Update not found")

    await db.delete(update)
