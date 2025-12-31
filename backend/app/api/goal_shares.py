from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.goal_share import (
    GoalShareCreate, GoalShareUpdate, GoalShareResponse,
    SharedGoalResponse, GoalShareListResponse, SharedWithMeListResponse,
    UserBasicInfo, GoalBasicInfo
)
from app.models.goal_share import GoalShare, ShareStatus, SharePermission
from app.models.goal import Goal
from app.models.user import User

router = APIRouter()


def _build_share_response(share: GoalShare) -> GoalShareResponse:
    """Build GoalShareResponse from GoalShare model."""
    shared_with = None
    if share.shared_with_user:
        shared_with = UserBasicInfo(
            id=share.shared_with_user.id,
            username=share.shared_with_user.username,
            display_name=share.shared_with_user.display_name,
            avatar_url=share.shared_with_user.avatar_url
        )

    invited_by = None
    if share.invited_by:
        invited_by = UserBasicInfo(
            id=share.invited_by.id,
            username=share.invited_by.username,
            display_name=share.invited_by.display_name,
            avatar_url=share.invited_by.avatar_url
        )

    return GoalShareResponse(
        id=share.id,
        goal_id=share.goal_id,
        shared_with_user_id=share.shared_with_user_id,
        invited_by_id=share.invited_by_id,
        permission=share.permission,
        status=share.status,
        created_at=share.created_at,
        shared_with_user=shared_with,
        invited_by=invited_by
    )


def _build_shared_goal_response(share: GoalShare) -> SharedGoalResponse:
    """Build SharedGoalResponse from GoalShare model."""
    goal_info = None
    if share.goal:
        goal_info = GoalBasicInfo(
            id=share.goal.id,
            title=share.goal.title,
            description=share.goal.description,
            category=share.goal.category,
            world_theme=share.goal.world_theme
        )

    invited_by = None
    if share.invited_by:
        invited_by = UserBasicInfo(
            id=share.invited_by.id,
            username=share.invited_by.username,
            display_name=share.invited_by.display_name,
            avatar_url=share.invited_by.avatar_url
        )

    return SharedGoalResponse(
        id=share.id,
        goal_id=share.goal_id,
        shared_with_user_id=share.shared_with_user_id,
        invited_by_id=share.invited_by_id,
        permission=share.permission,
        status=share.status,
        created_at=share.created_at,
        goal=goal_info,
        invited_by=invited_by
    )


@router.post("/goals/{goal_id}", response_model=GoalShareResponse, status_code=status.HTTP_201_CREATED)
async def share_goal(
    goal_id: UUID,
    share_data: GoalShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Share a goal with another user."""
    # Verify goal exists and belongs to current user
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found or you don't own it")

    # Cannot share with yourself
    if share_data.shared_with_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share goal with yourself")

    # Verify target user exists
    result = await db.execute(
        select(User).where(User.id == share_data.shared_with_user_id)
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User to share with not found")

    # Check if already shared
    result = await db.execute(
        select(GoalShare).where(
            GoalShare.goal_id == goal_id,
            GoalShare.shared_with_user_id == share_data.shared_with_user_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Goal already shared with this user")

    # Create share
    share = GoalShare(
        goal_id=goal_id,
        shared_with_user_id=share_data.shared_with_user_id,
        invited_by_id=current_user.id,
        permission=share_data.permission,
        status=ShareStatus.PENDING
    )
    db.add(share)
    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(GoalShare)
        .options(
            selectinload(GoalShare.shared_with_user),
            selectinload(GoalShare.invited_by)
        )
        .where(GoalShare.id == share.id)
    )
    share = result.scalar_one()

    return _build_share_response(share)


@router.get("/goals/{goal_id}", response_model=GoalShareListResponse)
async def get_goal_shares(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all users a goal is shared with."""
    # Verify goal exists and belongs to current user
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found or you don't own it")

    result = await db.execute(
        select(GoalShare)
        .options(
            selectinload(GoalShare.shared_with_user),
            selectinload(GoalShare.invited_by)
        )
        .where(GoalShare.goal_id == goal_id)
        .order_by(GoalShare.created_at.desc())
    )
    shares = result.scalars().all()

    return GoalShareListResponse(
        shares=[_build_share_response(s) for s in shares],
        total=len(shares)
    )


@router.delete("/goals/{goal_id}/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_goal_share(
    goal_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a user's access to a shared goal."""
    # Verify goal exists and belongs to current user
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found or you don't own it")

    # Find and delete share
    result = await db.execute(
        select(GoalShare).where(
            GoalShare.goal_id == goal_id,
            GoalShare.shared_with_user_id == user_id
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    await db.delete(share)


@router.get("/shared-with-me", response_model=SharedWithMeListResponse)
async def get_shared_with_me(
    status_filter: ShareStatus = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all goals shared with the current user."""
    query = (
        select(GoalShare)
        .options(
            selectinload(GoalShare.goal),
            selectinload(GoalShare.invited_by)
        )
        .where(GoalShare.shared_with_user_id == current_user.id)
    )

    if status_filter:
        query = query.where(GoalShare.status == status_filter)

    query = query.order_by(GoalShare.created_at.desc())
    result = await db.execute(query)
    shares = result.scalars().all()

    return SharedWithMeListResponse(
        shares=[_build_shared_goal_response(s) for s in shares],
        total=len(shares)
    )


@router.put("/{share_id}/respond", response_model=GoalShareResponse)
async def respond_to_share(
    share_id: UUID,
    update_data: GoalShareUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept or decline a share invitation."""
    result = await db.execute(
        select(GoalShare)
        .options(
            selectinload(GoalShare.shared_with_user),
            selectinload(GoalShare.invited_by)
        )
        .where(
            GoalShare.id == share_id,
            GoalShare.shared_with_user_id == current_user.id
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share invitation not found")

    if share.status != ShareStatus.PENDING:
        raise HTTPException(status_code=400, detail="This invitation has already been responded to")

    if update_data.status not in [ShareStatus.ACCEPTED, ShareStatus.DECLINED]:
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'declined'")

    share.status = update_data.status
    await db.flush()

    return _build_share_response(share)
