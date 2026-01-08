from uuid import UUID
from datetime import datetime
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.node import (
    NodeCreate, NodeUpdate, NodeResponse, NodeStatusUpdate, NodePositionUpdate,
    DependencyCreate, DependencyResponse, NodeWithDependenciesResponse,
    NodeSocialSummary, GoalNodesSocialSummary, ReactionCounts, TopComment,
    CanInteractResponse
)
from app.models.node import Node, NodeStatus, NodeDependency, DependencyType
from app.models.goal import Goal
from app.models.user import User
from app.models.interaction import Interaction, TargetType, InteractionType
from app.models.comment import Comment, CommentTargetType
from app.models.resource_drop import ResourceDrop
from app.models.time_capsule import TimeCapsule, UnlockType
from app.services.gamification import gamification_service, XP_REWARDS
from app.services.notifications import notification_service

router = APIRouter()


# === Helper Functions for Sequential/Parallel Logic ===

async def _detect_circular_dependency(
    db: AsyncSession,
    node_id: UUID,
    depends_on_id: UUID,
    visited: set = None
) -> bool:
    """
    Detect if adding a dependency from node_id -> depends_on_id would create a cycle.
    Uses DFS to check if depends_on_id can reach node_id through existing dependencies.
    Returns True if a cycle would be created, False otherwise.
    """
    if visited is None:
        visited = set()

    if depends_on_id == node_id:
        return True

    if depends_on_id in visited:
        return False

    visited.add(depends_on_id)

    # Get all nodes that depends_on_id depends on
    result = await db.execute(
        select(NodeDependency.depends_on_id).where(
            NodeDependency.node_id == depends_on_id
        )
    )
    upstream_deps = [row[0] for row in result.all()]

    for upstream_id in upstream_deps:
        if await _detect_circular_dependency(db, node_id, upstream_id, visited):
            return True

    return False


async def _can_interact_with_node(
    db: AsyncSession,
    node_id: UUID
) -> tuple[bool, str | None, list[UUID]]:
    """
    Check if a node can be interacted with based on its dependencies.

    For sequential nodes (is_sequential=True):
    - All dependencies must be completed (FINISH_TO_START)
    - Or started (START_TO_START)

    For parallel nodes (is_sequential=False or in a parallel_group):
    - Node is always accessible

    Returns: (can_interact, reason, blocking_node_ids)
    """
    # Get the node
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()

    if not node:
        return False, "Node not found", []

    # If node is already completed or active, it can be interacted with
    if node.status in [NodeStatus.COMPLETED, NodeStatus.ACTIVE]:
        return True, None, []

    # If node is not sequential, it's always accessible
    if not node.is_sequential:
        return True, None, []

    # If node is in a parallel group, check if any node in the same group is unlocked
    if node.parallel_group is not None:
        # Get all nodes in the same parallel group
        group_result = await db.execute(
            select(Node).where(
                Node.goal_id == node.goal_id,
                Node.parallel_group == node.parallel_group,
                Node.id != node_id
            )
        )
        group_nodes = group_result.scalars().all()

        # If any node in the group is active or completed, this node is accessible
        for group_node in group_nodes:
            if group_node.status in [NodeStatus.ACTIVE, NodeStatus.COMPLETED]:
                return True, None, []

    # Get dependencies for this node
    deps_result = await db.execute(
        select(NodeDependency).where(NodeDependency.node_id == node_id)
    )
    dependencies = deps_result.scalars().all()

    # If no dependencies, check if it's the first node (by order)
    if not dependencies:
        # Check if there are earlier nodes that aren't complete
        earlier_result = await db.execute(
            select(Node).where(
                Node.goal_id == node.goal_id,
                Node.order < node.order,
                Node.status != NodeStatus.COMPLETED
            )
        )
        earlier_incomplete = earlier_result.scalars().all()

        if earlier_incomplete:
            return False, "Complete previous steps first", [n.id for n in earlier_incomplete]
        return True, None, []

    # Check each dependency
    blocking_nodes = []
    for dep in dependencies:
        dep_node_result = await db.execute(
            select(Node).where(Node.id == dep.depends_on_id)
        )
        dep_node = dep_node_result.scalar_one_or_none()

        if not dep_node:
            continue

        if dep.dependency_type == DependencyType.FINISH_TO_START:
            # Node must be completed
            if dep_node.status != NodeStatus.COMPLETED:
                blocking_nodes.append(dep_node.id)
        elif dep.dependency_type == DependencyType.START_TO_START:
            # Node must be at least active
            if dep_node.status == NodeStatus.LOCKED:
                blocking_nodes.append(dep_node.id)
        # FINISH_TO_FINISH doesn't block starting

    if blocking_nodes:
        return False, "Waiting for dependencies to complete", blocking_nodes

    return True, None, []


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


@router.patch("/{node_id}/position", response_model=NodeResponse)
async def update_node_position(
    node_id: UUID,
    position_data: NodePositionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a node's position. Only the goal owner can update positions."""
    result = await db.execute(
        select(Node).join(Goal).where(
            Node.id == node_id,
            Goal.user_id == current_user.id
        )
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found or not authorized")

    node.position_x = position_data.position_x
    node.position_y = position_data.position_y

    await db.commit()
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

    # Check if node can be completed (respects sequential dependencies)
    can_interact, reason, blocking = await _can_interact_with_node(db, node_id)
    if not can_interact:
        raise HTTPException(status_code=400, detail=reason or "Cannot complete this node yet")

    # Complete the node (checklist status preserved as-is)
    node.status = NodeStatus.COMPLETED
    node.completed_at = datetime.utcnow()

    # Award XP
    await gamification_service.award_xp(
        db, current_user.id, XP_REWARDS["complete_node"], f"Completed node: {node.title}"
    )

    # Update streak
    await gamification_service.update_streak(db, current_user.id)

    # Unlock time capsules tied to this node (Issue #72)
    capsules_result = await db.execute(
        select(TimeCapsule).where(
            TimeCapsule.node_id == node_id,
            TimeCapsule.unlock_type == UnlockType.NODE_COMPLETE,
            TimeCapsule.is_unlocked == False
        )
    )
    capsules_to_unlock = capsules_result.scalars().all()
    for capsule in capsules_to_unlock:
        capsule.is_unlocked = True
        capsule.unlocked_at = datetime.utcnow()

    # Unlock dependent nodes (Issue #63 - improved logic)
    # Find all nodes that depend on this completed node
    dependents_result = await db.execute(
        select(NodeDependency).where(NodeDependency.depends_on_id == node_id)
    )
    dependent_deps = dependents_result.scalars().all()

    for dep in dependent_deps:
        # Get the dependent node
        dep_node_result = await db.execute(select(Node).where(Node.id == dep.node_id))
        dep_node = dep_node_result.scalar_one_or_none()

        if dep_node and dep_node.status == NodeStatus.LOCKED:
            # Check if ALL dependencies of this node are now satisfied
            can_unlock, _, _ = await _can_interact_with_node(db, dep_node.id)
            if can_unlock:
                dep_node.status = NodeStatus.ACTIVE

    # Also unlock nodes in the same parallel group
    if node.parallel_group is not None:
        group_result = await db.execute(
            select(Node).where(
                Node.goal_id == node.goal_id,
                Node.parallel_group == node.parallel_group,
                Node.status == NodeStatus.LOCKED
            )
        )
        group_nodes = group_result.scalars().all()
        for group_node in group_nodes:
            group_node.status = NodeStatus.ACTIVE

    # Fallback: unlock next sequential node if no dependencies defined
    if not dependent_deps:
        next_result = await db.execute(
            select(Node).where(
                Node.goal_id == node.goal_id,
                Node.order == node.order + 1,
                Node.status == NodeStatus.LOCKED
            )
        )
        next_node = next_result.scalar_one_or_none()
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

    # Check for circular dependency (Issue #63)
    # Would adding this dependency create a cycle?
    # Check if depends_on_id -> ... -> node_id already exists
    would_create_cycle = await _detect_circular_dependency(
        db, dependency.depends_on_id, node_id
    )
    if would_create_cycle:
        raise HTTPException(
            status_code=400,
            detail="Cannot add dependency: would create circular dependency"
        )

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


@router.get("/{node_id}/can-interact", response_model=CanInteractResponse)
async def can_interact_with_node(
    node_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a node can be interacted with based on sequential/parallel structuring.

    Returns whether the node is accessible and if not, which nodes are blocking it.
    This is useful for:
    - Showing lock icons on the frontend
    - Preventing premature node completion
    - Guiding users through the correct sequence
    """
    can_interact, reason, blocking_nodes = await _can_interact_with_node(db, node_id)
    return CanInteractResponse(
        can_interact=can_interact,
        reason=reason,
        blocking_nodes=blocking_nodes
    )


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


# === Social Summary Endpoints ===

async def _get_node_social_summary(
    db: AsyncSession,
    node_id: UUID,
    include_top_comments: bool = True,
    top_comments_limit: int = 3
) -> NodeSocialSummary:
    """Helper function to get social summary for a single node."""
    # Get reaction counts
    reactions_result = await db.execute(
        select(
            Interaction.reaction_type,
            func.count(Interaction.id).label("count")
        )
        .where(
            Interaction.target_type == TargetType.NODE,
            Interaction.target_id == node_id,
            Interaction.interaction_type == InteractionType.REACTION
        )
        .group_by(Interaction.reaction_type)
    )
    reaction_rows = reactions_result.all()

    reaction_counts = ReactionCounts()
    reactions_total = 0
    for row in reaction_rows:
        reaction_type, count = row
        if reaction_type:
            # Convert hyphenated reaction types to underscored field names
            # e.g., "light-path" -> "light_path"
            field_name = reaction_type.replace("-", "_")
            if hasattr(reaction_counts, field_name):
                setattr(reaction_counts, field_name, count)
                reactions_total += count

    # Get comments count
    comments_result = await db.execute(
        select(func.count(Comment.id))
        .where(
            Comment.target_type == CommentTargetType.NODE,
            Comment.target_id == node_id
        )
    )
    comments_count = comments_result.scalar() or 0

    # Get resources count
    resources_result = await db.execute(
        select(func.count(ResourceDrop.id))
        .where(ResourceDrop.node_id == node_id)
    )
    resources_count = resources_result.scalar() or 0

    # Get top comments (most recent root comments with reply counts)
    top_comments = []
    if include_top_comments and comments_count > 0:
        comments_query = await db.execute(
            select(Comment)
            .options(selectinload(Comment.user))
            .where(
                Comment.target_type == CommentTargetType.NODE,
                Comment.target_id == node_id,
                Comment.parent_id.is_(None)  # Root comments only
            )
            .order_by(Comment.created_at.desc())
            .limit(top_comments_limit)
        )
        comments = comments_query.scalars().all()

        for comment in comments:
            # Count replies
            reply_count_result = await db.execute(
                select(func.count(Comment.id))
                .where(Comment.parent_id == comment.id)
            )
            reply_count = reply_count_result.scalar() or 0

            top_comments.append(TopComment(
                id=comment.id,
                user_id=comment.user_id,
                username=comment.user.username,
                display_name=comment.user.display_name,
                content=comment.content[:200],  # Truncate for preview
                created_at=comment.created_at,
                reply_count=reply_count
            ))

    return NodeSocialSummary(
        node_id=node_id,
        reactions=reaction_counts,
        reactions_total=reactions_total,
        comments_count=comments_count,
        resources_count=resources_count,
        top_comments=top_comments
    )


@router.get("/{node_id}/social-summary", response_model=NodeSocialSummary)
async def get_node_social_summary(
    node_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get social activity summary for a single node."""
    # Verify node exists
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    return await _get_node_social_summary(db, node_id)


@router.get("/goal/{goal_id}/social-summary", response_model=GoalNodesSocialSummary)
async def get_goal_nodes_social_summary(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get social activity summary for all nodes in a goal (batch endpoint)."""
    # Get all nodes for the goal
    result = await db.execute(
        select(Node.id).where(Node.goal_id == goal_id)
    )
    node_ids = [row[0] for row in result.all()]

    if not node_ids:
        return GoalNodesSocialSummary(goal_id=goal_id, nodes={})

    # Get summaries for all nodes (without top comments for batch, to save queries)
    nodes_summary: Dict[str, NodeSocialSummary] = {}
    for node_id in node_ids:
        summary = await _get_node_social_summary(db, node_id, include_top_comments=False)
        nodes_summary[str(node_id)] = summary

    return GoalNodesSocialSummary(goal_id=goal_id, nodes=nodes_summary)
