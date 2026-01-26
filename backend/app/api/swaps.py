from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.swap import SwapCreate, SwapAccept, SwapResponse, SwapListResponse
from app.models.swap import Swap, SwapStatus
from app.models.user import User
from app.models.goal import Goal
from app.models.node import Node
from app.models.follow import Follow, FollowType
from app.services.notifications import notification_service

router = APIRouter()


@router.post("", response_model=SwapResponse, status_code=status.HTTP_201_CREATED)
async def propose_swap(
    swap_data: SwapCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Propose a new swap to another user."""
    # Cannot propose swap to yourself
    if swap_data.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot propose swap to yourself")

    # Verify receiver exists
    result = await db.execute(select(User).where(User.id == swap_data.receiver_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Verify proposer's goal exists and belongs to them
    result = await db.execute(
        select(Goal).where(
            Goal.id == swap_data.proposer_goal_id,
            Goal.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Goal not found or not owned by you")

    # Verify proposer's node if provided
    if swap_data.proposer_node_id:
        result = await db.execute(
            select(Node).where(
                Node.id == swap_data.proposer_node_id,
                Node.goal_id == swap_data.proposer_goal_id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Node not found or not part of the goal")

    # Check for existing pending swap with same participants and goal
    result = await db.execute(
        select(Swap).where(
            Swap.proposer_id == current_user.id,
            Swap.receiver_id == swap_data.receiver_id,
            Swap.proposer_goal_id == swap_data.proposer_goal_id,
            Swap.status == SwapStatus.PROPOSED
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have a pending swap with this user for this goal")

    swap = Swap(
        proposer_id=current_user.id,
        receiver_id=swap_data.receiver_id,
        proposer_goal_id=swap_data.proposer_goal_id,
        proposer_node_id=swap_data.proposer_node_id,
        message=swap_data.message
    )
    db.add(swap)
    await db.flush()

    # Notify the receiver
    proposer_name = current_user.display_name or current_user.username
    notification_title = f"{proposer_name} wants to start a support swap with you!"
    notification_message = f"{proposer_name} proposed a swap to work together on your goals"
    if swap_data.message:
        notification_message += f": \"{swap_data.message}\""

    await notification_service.create_notification(
        db=db,
        user_id=swap_data.receiver_id,
        notification_type="swap_proposed",
        title=notification_title,
        message=notification_message,
        data={
            "swap_id": str(swap.id),
            "proposer_id": str(current_user.id),
            "proposer_username": current_user.username,
            "proposer_goal_id": str(swap_data.proposer_goal_id)
        }
    )

    return swap


@router.get("", response_model=SwapListResponse)
async def list_swaps(
    status_filter: SwapStatus = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all swaps for the current user (both sent and received)."""
    query = select(Swap).where(
        or_(
            Swap.proposer_id == current_user.id,
            Swap.receiver_id == current_user.id
        )
    )

    if status_filter:
        query = query.where(Swap.status == status_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Fetch
    query = query.order_by(Swap.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    swaps = result.scalars().all()

    return SwapListResponse(swaps=swaps, total=total)


@router.put("/{swap_id}/accept", response_model=SwapResponse)
async def accept_swap(
    swap_id: UUID,
    accept_data: SwapAccept,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept a swap proposal. Must include receiver's goal."""
    result = await db.execute(
        select(Swap).where(
            Swap.id == swap_id,
            Swap.receiver_id == current_user.id,
            Swap.status == SwapStatus.PROPOSED
        )
    )
    swap = result.scalar_one_or_none()

    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found or cannot be accepted")

    # Verify receiver's goal exists and belongs to them
    result = await db.execute(
        select(Goal).where(
            Goal.id == accept_data.receiver_goal_id,
            Goal.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Goal not found or not owned by you")

    # Verify receiver's node if provided
    if accept_data.receiver_node_id:
        result = await db.execute(
            select(Node).where(
                Node.id == accept_data.receiver_node_id,
                Node.goal_id == accept_data.receiver_goal_id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Node not found or not part of the goal")

    # Update swap
    swap.receiver_goal_id = accept_data.receiver_goal_id
    swap.receiver_node_id = accept_data.receiver_node_id
    swap.status = SwapStatus.ACCEPTED

    # Notify the proposer
    receiver_name = current_user.display_name or current_user.username
    notification_title = f"{receiver_name} accepted your swap request!"
    notification_message = f"{receiver_name} accepted your support swap. You can now work together on your goals!"

    await notification_service.create_notification(
        db=db,
        user_id=swap.proposer_id,
        notification_type="swap_accepted",
        title=notification_title,
        message=notification_message,
        data={
            "swap_id": str(swap.id),
            "receiver_id": str(current_user.id),
            "receiver_username": current_user.username,
            "receiver_goal_id": str(accept_data.receiver_goal_id)
        }
    )

    # Create mutual Follow relationships for both goals
    # Proposer follows receiver's goal
    proposer_follow = await db.execute(
        select(Follow).where(
            Follow.follower_id == swap.proposer_id,
            Follow.follow_type == FollowType.GOAL,
            Follow.target_id == accept_data.receiver_goal_id
        )
    )
    if not proposer_follow.scalar_one_or_none():
        follow1 = Follow(
            follower_id=swap.proposer_id,
            follow_type=FollowType.GOAL,
            target_id=accept_data.receiver_goal_id
        )
        db.add(follow1)

    # Receiver follows proposer's goal
    receiver_follow = await db.execute(
        select(Follow).where(
            Follow.follower_id == swap.receiver_id,
            Follow.follow_type == FollowType.GOAL,
            Follow.target_id == swap.proposer_goal_id
        )
    )
    if not receiver_follow.scalar_one_or_none():
        follow2 = Follow(
            follower_id=swap.receiver_id,
            follow_type=FollowType.GOAL,
            target_id=swap.proposer_goal_id
        )
        db.add(follow2)

    await db.flush()
    return swap


@router.put("/{swap_id}/decline", response_model=SwapResponse)
async def decline_swap(
    swap_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Decline a swap proposal."""
    result = await db.execute(
        select(Swap).where(
            Swap.id == swap_id,
            Swap.receiver_id == current_user.id,
            Swap.status == SwapStatus.PROPOSED
        )
    )
    swap = result.scalar_one_or_none()

    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found or cannot be declined")

    swap.status = SwapStatus.DECLINED

    # Notify the proposer
    receiver_name = current_user.display_name or current_user.username
    notification_title = f"{receiver_name} declined your swap request"
    notification_message = f"{receiver_name} declined your support swap proposal"

    await notification_service.create_notification(
        db=db,
        user_id=swap.proposer_id,
        notification_type="swap_declined",
        title=notification_title,
        message=notification_message,
        data={
            "swap_id": str(swap.id),
            "receiver_id": str(current_user.id),
            "receiver_username": current_user.username
        }
    )

    await db.flush()
    return swap


@router.put("/{swap_id}/complete", response_model=SwapResponse)
async def complete_swap(
    swap_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a swap as completed. Either party can mark it complete."""
    result = await db.execute(
        select(Swap).where(
            Swap.id == swap_id,
            or_(
                Swap.proposer_id == current_user.id,
                Swap.receiver_id == current_user.id
            ),
            or_(
                Swap.status == SwapStatus.ACCEPTED,
                Swap.status == SwapStatus.IN_PROGRESS
            )
        )
    )
    swap = result.scalar_one_or_none()

    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found or cannot be completed")

    swap.status = SwapStatus.COMPLETED
    await db.flush()
    return swap


@router.put("/{swap_id}/cancel", response_model=SwapResponse)
async def cancel_swap(
    swap_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a swap. Only the proposer can cancel a proposed swap."""
    result = await db.execute(
        select(Swap).where(
            Swap.id == swap_id,
            Swap.proposer_id == current_user.id,
            Swap.status == SwapStatus.PROPOSED
        )
    )
    swap = result.scalar_one_or_none()

    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found or cannot be cancelled")

    swap.status = SwapStatus.CANCELLED
    await db.flush()
    return swap
