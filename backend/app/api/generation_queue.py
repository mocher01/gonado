from datetime import datetime
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.models import User, Goal, Node, GenerationQueue, QueueStatus, GoalVisibility, GoalStatus, NodeStatus
from app.schemas.generation_queue import (
    QueueSubmitRequest, QueueSubmitResponse, QueueStatusResponse,
    QueueItemForProcessing, ProcessQueueRequest, GeneratedPlan
)

router = APIRouter()


@router.post("/submit", response_model=QueueSubmitResponse)
async def submit_goal_for_generation(
    request: QueueSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a goal description for AI-powered plan generation.
    The goal will be added to the processing queue.
    """
    # Create queue entry
    queue_entry = GenerationQueue(
        user_id=current_user.id,
        goal_text=request.goal_text,
        status=QueueStatus.PENDING,
        created_at=datetime.utcnow()
    )
    db.add(queue_entry)
    await db.commit()
    await db.refresh(queue_entry)

    # Get position in queue
    position_result = await db.execute(
        select(func.count(GenerationQueue.id))
        .where(GenerationQueue.status == QueueStatus.PENDING)
        .where(GenerationQueue.created_at <= queue_entry.created_at)
    )
    position = position_result.scalar() or 1

    return QueueSubmitResponse(
        queue_id=queue_entry.id,
        status=queue_entry.status,
        message="Your goal has been submitted for AI planning. Please wait...",
        position=position
    )


@router.get("/status/{queue_id}", response_model=QueueStatusResponse)
async def get_queue_status(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check the status of a queued goal generation request.
    """
    result = await db.execute(
        select(GenerationQueue).where(GenerationQueue.id == queue_id)
    )
    queue_entry = result.scalar_one_or_none()

    if not queue_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    # Only allow user to check their own queue entries
    if queue_entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this queue entry")

    # Calculate estimated wait time
    estimated_wait = None
    if queue_entry.status == QueueStatus.PENDING:
        position_result = await db.execute(
            select(func.count(GenerationQueue.id))
            .where(GenerationQueue.status == QueueStatus.PENDING)
            .where(GenerationQueue.created_at < queue_entry.created_at)
        )
        position = position_result.scalar() or 0
        estimated_wait = position * 30  # Assume 30 seconds per item

    return QueueStatusResponse(
        queue_id=queue_entry.id,
        status=queue_entry.status,
        goal_text=queue_entry.goal_text,
        goal_id=queue_entry.goal_id,
        error_message=queue_entry.error_message,
        created_at=queue_entry.created_at,
        processing_started_at=queue_entry.processing_started_at,
        completed_at=queue_entry.completed_at,
        estimated_wait_seconds=estimated_wait
    )


@router.get("/pending", response_model=List[QueueItemForProcessing])
async def get_pending_queue_items(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all pending items in the queue (for the processor CLI).
    This endpoint should be protected in production (admin only or internal).
    """
    result = await db.execute(
        select(GenerationQueue, User)
        .join(User, GenerationQueue.user_id == User.id)
        .where(GenerationQueue.status == QueueStatus.PENDING)
        .order_by(GenerationQueue.created_at.asc())
    )
    rows = result.all()

    items = []
    for queue_entry, user in rows:
        waiting_seconds = int((datetime.utcnow() - queue_entry.created_at).total_seconds())
        items.append(QueueItemForProcessing(
            queue_id=queue_entry.id,
            user_email=user.email,
            goal_text=queue_entry.goal_text,
            created_at=queue_entry.created_at,
            waiting_seconds=waiting_seconds
        ))

    return items


@router.post("/process/{queue_id}/start")
async def mark_processing_started(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a queue item as being processed (for the processor CLI).
    """
    result = await db.execute(
        select(GenerationQueue).where(GenerationQueue.id == queue_id)
    )
    queue_entry = result.scalar_one_or_none()

    if not queue_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    if queue_entry.status != QueueStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Queue entry is not pending (status: {queue_entry.status})")

    queue_entry.status = QueueStatus.PROCESSING
    queue_entry.processing_started_at = datetime.utcnow()
    await db.commit()

    return {"message": "Processing started", "queue_id": str(queue_id)}


@router.post("/process/{queue_id}/complete")
async def complete_queue_processing(
    queue_id: UUID,
    plan: GeneratedPlan,
    db: AsyncSession = Depends(get_db)
):
    """
    Complete processing of a queue item by saving the generated plan.
    Creates the goal and nodes in the database.
    """
    result = await db.execute(
        select(GenerationQueue).where(GenerationQueue.id == queue_id)
    )
    queue_entry = result.scalar_one_or_none()

    if not queue_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    if queue_entry.status != QueueStatus.PROCESSING:
        raise HTTPException(status_code=400, detail=f"Queue entry is not processing (status: {queue_entry.status})")

    # Parse target date if provided
    target_date = None
    if plan.target_date:
        try:
            target_date = datetime.fromisoformat(plan.target_date.replace('Z', '+00:00'))
            if target_date.tzinfo is not None:
                target_date = target_date.replace(tzinfo=None)
        except ValueError:
            pass

    # Create the goal
    goal = Goal(
        user_id=queue_entry.user_id,
        title=plan.title,
        description=plan.description,
        category=plan.category,
        world_theme=plan.world_theme,
        target_date=target_date,
        visibility=GoalVisibility.PUBLIC,
        status=GoalStatus.ACTIVE
    )
    db.add(goal)
    await db.flush()

    # Create the nodes
    for node_data in plan.nodes:
        node = Node(
            goal_id=goal.id,
            title=node_data.title,
            description=node_data.description,
            order=node_data.order,
            status=NodeStatus.LOCKED if node_data.order > 1 else NodeStatus.ACTIVE,
            position_x=100 + (node_data.order - 1) * 150,
            position_y=300 + ((node_data.order % 2) * 50 - 25)
        )
        db.add(node)

    # Update queue entry
    queue_entry.status = QueueStatus.COMPLETED
    queue_entry.goal_id = goal.id
    queue_entry.generated_plan = plan.model_dump()
    queue_entry.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(goal)

    return {
        "message": "Goal created successfully",
        "goal_id": str(goal.id),
        "nodes_created": len(plan.nodes)
    }


@router.post("/process/{queue_id}/fail")
async def fail_queue_processing(
    queue_id: UUID,
    error_message: str = "Processing failed",
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a queue item as failed (for the processor CLI).
    """
    result = await db.execute(
        select(GenerationQueue).where(GenerationQueue.id == queue_id)
    )
    queue_entry = result.scalar_one_or_none()

    if not queue_entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    queue_entry.status = QueueStatus.FAILED
    queue_entry.error_message = error_message
    queue_entry.completed_at = datetime.utcnow()
    await db.commit()

    return {"message": "Queue entry marked as failed", "queue_id": str(queue_id)}
