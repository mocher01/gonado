from uuid import UUID
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.node import (
    NodeCreate, NodeUpdate, NodeResponse, NodeStatusUpdate,
    DependencyCreate, DependencyResponse, NodeWithDependenciesResponse
)
from app.models.node import Node, NodeStatus, NodeDependency
from app.models.goal import Goal
from app.models.user import User
from app.services.gamification import gamification_service, XP_REWARDS
from app.services.notifications import notification_service

router = APIRouter()


@router.post("", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    goal_id: UUID,
    node_data: NodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new node for a goal."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    node = Node(
        goal_id=goal_id,
        **node_data.model_dump()
    )
    db.add(node)
    await db.flush()
    return node


@router.get("/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific node."""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: UUID,
    node_data: NodeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a node."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    for field, value in node_data.model_dump(exclude_unset=True).items():
        setattr(node, field, value)

    await db.flush()
    return node


@router.put("/{node_id}/status", response_model=NodeResponse)
async def update_node_status(
    node_id: UUID,
    status_data: NodeStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a node's status."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    node.status = status_data.status
    await db.flush()
    return node


@router.post("/{node_id}/complete", response_model=NodeResponse)
async def complete_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a node as completed."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    if node.status != NodeStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Node is not active")

    # Complete the node (checklist status preserved as-is)
    node.status = NodeStatus.COMPLETED
    node.completed_at = datetime.utcnow()

    # Award XP
    await gamification_service.award_xp(
        db, current_user.id, XP_REWARDS["complete_node"], f"Completed node: {node.title}"
    )

    # Update streak
    await gamification_service.update_streak(db, current_user.id)

    # Unlock next node
    result = await db.execute(
        select(Node).where(
            Node.goal_id == node.goal_id,
            Node.order == node.order + 1
        )
    )
    next_node = result.scalar_one_or_none()
    if next_node:
        next_node.status = NodeStatus.ACTIVE

    # Check if all nodes complete
    result = await db.execute(
        select(Node).where(
            Node.goal_id == node.goal_id,
            Node.status != NodeStatus.COMPLETED
        )
    )
    incomplete_nodes = result.scalars().all()
    if not incomplete_nodes:
        # Goal completed!
        goal_result = await db.execute(select(Goal).where(Goal.id == node.goal_id))
        goal = goal_result.scalar_one()
        goal.status = "completed"
        await gamification_service.award_xp(
            db, current_user.id, XP_REWARDS["complete_goal"], f"Completed goal: {goal.title}"
        )

    # Send notification
    await notification_service.broadcast_to_goal_followers(
        node.goal_id,
        "node_completed",
        f"{current_user.display_name} completed a milestone!",
        node.title,
        {"node_id": str(node.id), "node_title": node.title}
    )

    await db.flush()
    return node


from pydantic import BaseModel

class ChecklistItemUpdate(BaseModel):
    item_id: str
    completed: bool


@router.put("/{node_id}/checklist", response_model=NodeResponse)
async def update_checklist_item(
    node_id: UUID,
    update: ChecklistItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle a checklist item's completion status."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Update the checklist in extra_data
    extra_data = dict(node.extra_data) if node.extra_data else {}
    checklist = extra_data.get("checklist", [])

    item_found = False
    for item in checklist:
        if item.get("id") == update.item_id:
            item["completed"] = update.completed
            item_found = True
            break

    if not item_found:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    extra_data["checklist"] = checklist
    node.extra_data = extra_data

    await db.flush()
    return node


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a node."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    await db.delete(node)


# === Dependency Endpoints ===

@router.get("/{node_id}/with-dependencies", response_model=NodeWithDependenciesResponse)
async def get_node_with_dependencies(
    node_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a node with its dependencies."""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Get dependencies (what this node depends on)
    deps_result = await db.execute(
        select(NodeDependency).where(NodeDependency.node_id == node_id)
    )
    depends_on = deps_result.scalars().all()

    # Get dependents (what depends on this node)
    dependents_result = await db.execute(
        select(NodeDependency).where(NodeDependency.depends_on_id == node_id)
    )
    dependents = dependents_result.scalars().all()

    return {
        **node.__dict__,
        "depends_on": [d.__dict__ for d in depends_on],
        "dependents": [d.__dict__ for d in dependents]
    }


@router.post("/{node_id}/dependencies", response_model=DependencyResponse, status_code=status.HTTP_201_CREATED)
async def add_dependency(
    node_id: UUID,
    dependency: DependencyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a dependency to a node (this node depends on depends_on_id)."""
    # Verify node belongs to user's goal
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Verify dependency node exists and is in the same goal
    dep_result = await db.execute(
        select(Node).where(
            Node.id == dependency.depends_on_id,
            Node.goal_id == node.goal_id
        )
    )
    dep_node = dep_result.scalar_one_or_none()
    if not dep_node:
        raise HTTPException(status_code=404, detail="Dependency node not found or not in same goal")

    # Prevent self-dependency
    if node_id == dependency.depends_on_id:
        raise HTTPException(status_code=400, detail="Node cannot depend on itself")

    # Check for existing dependency
    existing = await db.execute(
        select(NodeDependency).where(
            NodeDependency.node_id == node_id,
            NodeDependency.depends_on_id == dependency.depends_on_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Dependency already exists")

    # Create dependency
    node_dep = NodeDependency(
        node_id=node_id,
        depends_on_id=dependency.depends_on_id,
        dependency_type=dependency.dependency_type
    )
    db.add(node_dep)
    await db.flush()
    await db.refresh(node_dep)

    return node_dep


@router.delete("/{node_id}/dependencies/{depends_on_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_dependency(
    node_id: UUID,
    depends_on_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a dependency from a node."""
    # Verify node belongs to user's goal
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Find and delete dependency
    dep_result = await db.execute(
        select(NodeDependency).where(
            NodeDependency.node_id == node_id,
            NodeDependency.depends_on_id == depends_on_id
        )
    )
    dependency = dep_result.scalar_one_or_none()
    if not dependency:
        raise HTTPException(status_code=404, detail="Dependency not found")

    await db.delete(dependency)


@router.get("/goal/{goal_id}/flow", response_model=List[NodeWithDependenciesResponse])
async def get_goal_flow(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all nodes for a goal with their dependencies (for BPMN visualization)."""
    # Get all nodes for the goal
    result = await db.execute(
        select(Node).where(Node.goal_id == goal_id).order_by(Node.order)
    )
    nodes = result.scalars().all()

    if not nodes:
        return []

    # Get all dependencies for these nodes
    node_ids = [n.id for n in nodes]
    deps_result = await db.execute(
        select(NodeDependency).where(
            NodeDependency.node_id.in_(node_ids)
        )
    )
    all_deps = deps_result.scalars().all()

    # Build dependency map
    dep_map = {}
    for dep in all_deps:
        if dep.node_id not in dep_map:
            dep_map[dep.node_id] = []
        dep_map[dep.node_id].append(dep)

    # Build dependents map
    deps_of_result = await db.execute(
        select(NodeDependency).where(
            NodeDependency.depends_on_id.in_(node_ids)
        )
    )
    all_deps_of = deps_of_result.scalars().all()

    dependents_map = {}
    for dep in all_deps_of:
        if dep.depends_on_id not in dependents_map:
            dependents_map[dep.depends_on_id] = []
        dependents_map[dep.depends_on_id].append(dep)

    # Build response
    response = []
    for node in nodes:
        response.append({
            **{k: v for k, v in node.__dict__.items() if not k.startswith('_')},
            "depends_on": [d.__dict__ for d in dep_map.get(node.id, [])],
            "dependents": [d.__dict__ for d in dependents_map.get(node.id, [])]
        })

    return response
