from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.follow import (
    FollowCreate, FollowResponse, FollowWithFollowerResponse, 
    FollowWithTargetResponse, FollowStats, FollowCheckResponse
)
from app.models.follow import Follow, FollowType
from app.models.user import User
from app.models.goal import Goal

router = APIRouter()


@router.post("", response_model=FollowResponse, status_code=status.HTTP_201_CREATED)
async def create_follow(
    follow_data: FollowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Follow a user or goal."""
    # Check if already following
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.follow_type == follow_data.follow_type,
            Follow.target_id == follow_data.target_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already following this target")

    # Validate target exists
    if follow_data.follow_type == FollowType.USER:
        result = await db.execute(select(User).where(User.id == follow_data.target_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="User not found")
        # Cannot follow yourself
        if follow_data.target_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
    elif follow_data.follow_type == FollowType.GOAL:
        result = await db.execute(select(Goal).where(Goal.id == follow_data.target_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Goal not found")

    follow = Follow(
        follower_id=current_user.id,
        follow_type=follow_data.follow_type,
        target_id=follow_data.target_id
    )
    db.add(follow)
    await db.flush()
    return follow


@router.delete("/{follow_type}/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow(
    follow_type: FollowType,
    target_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unfollow a user or goal."""
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.follow_type == follow_type,
            Follow.target_id == target_id
        )
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this target")

    await db.delete(follow)


@router.get("/users/{user_id}/followers", response_model=list[FollowWithFollowerResponse])
async def get_user_followers(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """Get all followers of a user."""
    result = await db.execute(
        select(Follow, User)
        .join(User, Follow.follower_id == User.id)
        .where(
            Follow.follow_type == FollowType.USER,
            Follow.target_id == user_id
        )
        .order_by(Follow.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    follows = result.all()
    
    return [
        FollowWithFollowerResponse(
            id=follow.id,
            follower_id=follow.follower_id,
            follow_type=follow.follow_type,
            target_id=follow.target_id,
            created_at=follow.created_at,
            follower_username=user.username,
            follower_display_name=user.display_name,
            follower_avatar_url=user.avatar_url
        )
        for follow, user in follows
    ]


@router.get("/users/{user_id}/following", response_model=list[FollowWithTargetResponse])
async def get_user_following(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """Get all users and goals a user is following."""
    result = await db.execute(
        select(Follow)
        .where(Follow.follower_id == user_id)
        .order_by(Follow.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    follows = result.scalars().all()
    
    responses = []
    for follow in follows:
        response_data = {
            "id": follow.id,
            "follower_id": follow.follower_id,
            "follow_type": follow.follow_type,
            "target_id": follow.target_id,
            "created_at": follow.created_at,
        }
        
        if follow.follow_type == FollowType.USER:
            user_result = await db.execute(select(User).where(User.id == follow.target_id))
            target_user = user_result.scalar_one_or_none()
            if target_user:
                response_data["target_username"] = target_user.username
                response_data["target_display_name"] = target_user.display_name
                response_data["target_avatar_url"] = target_user.avatar_url
        elif follow.follow_type == FollowType.GOAL:
            goal_result = await db.execute(select(Goal).where(Goal.id == follow.target_id))
            target_goal = goal_result.scalar_one_or_none()
            if target_goal:
                response_data["target_goal_title"] = target_goal.title
        
        responses.append(FollowWithTargetResponse(**response_data))
    
    return responses


@router.get("/goals/{goal_id}/followers", response_model=list[FollowWithFollowerResponse])
async def get_goal_followers(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """Get all supporters (followers) of a goal."""
    result = await db.execute(
        select(Follow, User)
        .join(User, Follow.follower_id == User.id)
        .where(
            Follow.follow_type == FollowType.GOAL,
            Follow.target_id == goal_id
        )
        .order_by(Follow.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    follows = result.all()
    
    return [
        FollowWithFollowerResponse(
            id=follow.id,
            follower_id=follow.follower_id,
            follow_type=follow.follow_type,
            target_id=follow.target_id,
            created_at=follow.created_at,
            follower_username=user.username,
            follower_display_name=user.display_name,
            follower_avatar_url=user.avatar_url
        )
        for follow, user in follows
    ]


@router.get("/check/{follow_type}/{target_id}", response_model=FollowCheckResponse)
async def check_following(
    follow_type: FollowType,
    target_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if current user follows a specific target."""
    result = await db.execute(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.follow_type == follow_type,
            Follow.target_id == target_id
        )
    )
    follow = result.scalar_one_or_none()
    
    return FollowCheckResponse(
        is_following=follow is not None,
        follow_id=follow.id if follow else None
    )


@router.get("/users/{user_id}/stats", response_model=FollowStats)
async def get_user_follow_stats(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get follower and following counts for a user."""
    # Count followers
    follower_result = await db.execute(
        select(func.count(Follow.id))
        .where(
            Follow.follow_type == FollowType.USER,
            Follow.target_id == user_id
        )
    )
    follower_count = follower_result.scalar() or 0
    
    # Count following
    following_result = await db.execute(
        select(func.count(Follow.id))
        .where(Follow.follower_id == user_id)
    )
    following_count = following_result.scalar() or 0
    
    return FollowStats(
        follower_count=follower_count,
        following_count=following_count
    )
