from uuid import UUID
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.models.node_task import NodeTask
from app.models.node import Node
from app.models.user import User
from app.schemas.node_task import NodeTaskCreate, NodeTaskUpdate, NodeTaskResponse

# Router for node-specific task operations (GET, POST)
router = APIRouter()

# Separate router for task-specific operations (PATCH, DELETE)
task_router = APIRouter()


@router.get("/{node_id}/tasks", response_model=List[NodeTaskResponse])
async def get_node_tasks(
    node_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all tasks for a node, ordered by day_number.
    Public endpoint - no authentication required.
    """
    # Verify node exists
    result = await db.execute(
        select(Node).where(Node.id == node_id)
    )
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )

    # Get all tasks for this node
    result = await db.execute(
        select(NodeTask)
        .where(NodeTask.node_id == node_id)
        .order_by(NodeTask.day_number)
    )
    tasks = result.scalars().all()

    return tasks


@router.post("/{node_id}/tasks", response_model=NodeTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_node_task(
    node_id: UUID,
    task_data: NodeTaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new task for a node.
    Requires authentication. Typically used by AI generation or node owners.
    """
    # Verify node exists and belongs to current user
    result = await db.execute(
        select(Node)
        .options(selectinload(Node.goal))
        .where(Node.id == node_id)
    )
    node = result.scalar_one_or_none()

    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )

    # Check if user owns the goal
    if node.goal.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create tasks for your own nodes"
        )

    # Ensure node_id in data matches path parameter
    if task_data.node_id != node_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node ID in request body must match path parameter"
        )

    # Create the task
    task = NodeTask(
        node_id=task_data.node_id,
        day_number=task_data.day_number,
        action=task_data.action,
        why=task_data.why,
        tip=task_data.tip,
        duration=task_data.duration
    )

    db.add(task)
    await db.flush()
    await db.refresh(task)

    return task


@task_router.patch("/{task_id}", response_model=NodeTaskResponse)
async def update_node_task(
    task_id: UUID,
    task_data: NodeTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a task. Mainly used for marking tasks as complete.
    Users can only update tasks belonging to their own nodes.
    """
    # Get task with node and goal relationships
    result = await db.execute(
        select(NodeTask)
        .options(
            selectinload(NodeTask.node).selectinload(Node.goal)
        )
        .where(NodeTask.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check if user owns the goal
    if task.node.goal.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tasks for your own nodes"
        )

    # Update fields if provided
    if task_data.action is not None:
        task.action = task_data.action

    if task_data.why is not None:
        task.why = task_data.why

    if task_data.tip is not None:
        task.tip = task_data.tip

    if task_data.duration is not None:
        task.duration = task_data.duration

    if task_data.is_completed is not None:
        task.is_completed = task_data.is_completed
        # Set completed_at timestamp when marking complete
        if task_data.is_completed:
            task.completed_at = datetime.utcnow()
        else:
            # Clear completed_at when unmarking
            task.completed_at = None

    task.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(task)

    return task


@task_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a task.
    Users can only delete tasks belonging to their own nodes.
    """
    # Get task with node and goal relationships
    result = await db.execute(
        select(NodeTask)
        .options(
            selectinload(NodeTask.node).selectinload(Node.goal)
        )
        .where(NodeTask.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    # Check if user owns the goal
    if task.node.goal.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete tasks for your own nodes"
        )

    await db.delete(task)
