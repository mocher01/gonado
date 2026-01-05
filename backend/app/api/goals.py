from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, delete
from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, GoalListResponse
from app.schemas.node import NodeResponse
from app.models.goal import Goal, GoalVisibility, GoalStatus
from app.models.goal_share import GoalShare, ShareStatus
from app.models.node import Node, NodeDependency
from app.models.user import User
from app.models.update import Update
from app.models.interaction import Interaction, TargetType
from app.models.comment import Comment, CommentTargetType
from app.models.follow import Follow, FollowType
from app.models.activity import Activity, ActivityTargetType
from app.models.conversation import Conversation
from app.models.generation_queue import GenerationQueue
from app.services.ai_planner import ai_planner_service
from app.services.gamification import gamification_service, XP_REWARDS


async def check_goal_access(
    goal: Goal,
    current_user: Optional[User],
    db: AsyncSession
) -> bool:
    """Check if user has access to view a goal."""
    # Public goals are accessible to everyone
    if goal.visibility == GoalVisibility.PUBLIC:
        return True

    # No user means no access to non-public goals
    if not current_user:
        return False

    # Owner always has access
    if current_user.id == goal.user_id:
        return True

    # Check if goal is shared with the user (SHARED visibility or explicit share)
    if goal.visibility == GoalVisibility.SHARED:
        result = await db.execute(
            select(GoalShare).where(
                GoalShare.goal_id == goal.id,
                GoalShare.shared_with_user_id == current_user.id,
                GoalShare.status == ShareStatus.ACCEPTED
            )
        )
        share = result.scalar_one_or_none()
        if share:
            return True

    return False

router = APIRouter()


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new goal."""
    # Convert timezone-aware datetime to naive (for TIMESTAMP WITHOUT TIME ZONE)
    target_date = goal_data.target_date
    if target_date and target_date.tzinfo is not None:
        target_date = target_date.replace(tzinfo=None)

    goal = Goal(
        user_id=current_user.id,
        title=goal_data.title,
        description=goal_data.description,
        category=goal_data.category,
        visibility=goal_data.visibility,
        world_theme=goal_data.world_theme,
        target_date=target_date
    )
    db.add(goal)
    await db.flush()

    # Award XP for first goal
    result = await db.execute(
        select(func.count(Goal.id)).where(Goal.user_id == current_user.id)
    )
    goal_count = result.scalar()
    if goal_count == 1:
        await gamification_service.award_xp(
            db, current_user.id, XP_REWARDS["first_goal"], "First goal created"
        )

    return goal


@router.post("/{goal_id}/generate-plan")
async def generate_plan(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate AI-powered plan for a goal."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    plan = await ai_planner_service.generate_plan(
        f"Goal: {goal.title}. Description: {goal.description or 'No description provided'}"
    )

    if "error" in plan:
        raise HTTPException(status_code=500, detail=plan["error"])

    if plan.get("type") == "conversation":
        return plan

    # Create nodes from plan
    if "nodes" in plan:
        goal.world_theme = plan.get("world_theme", "mountain")
        for node_data in plan["nodes"]:
            node = Node(
                goal_id=goal.id,
                title=node_data["title"],
                description=node_data.get("description"),
                order=node_data["order"],
                position_x=node_data.get("position_x", 0),
                position_y=node_data.get("position_y", 0),
                status="locked" if node_data["order"] > 1 else "active"
            )
            db.add(node)

        goal.status = GoalStatus.ACTIVE
        await db.flush()

    return plan


@router.get("", response_model=GoalListResponse)
async def list_goals(
    user_id: Optional[UUID] = None,
    category: Optional[str] = None,
    status: Optional[GoalStatus] = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """List goals with optional filters."""
    query = select(Goal)

    if user_id:
        query = query.where(Goal.user_id == user_id)
        # If viewing someone else's goals, only show public
        if not current_user or current_user.id != user_id:
            query = query.where(Goal.visibility == GoalVisibility.PUBLIC)
    else:
        # Public discovery
        query = query.where(Goal.visibility == GoalVisibility.PUBLIC)

    if category:
        query = query.where(Goal.category == category)
    if status:
        query = query.where(Goal.status == status)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Fetch
    query = query.order_by(Goal.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    goals = result.scalars().all()

    return GoalListResponse(goals=goals, total=total)


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific goal."""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check visibility (including shared access)
    has_access = await check_goal_access(goal, current_user, db)
    if not has_access:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal


@router.get("/{goal_id}/nodes", response_model=list[NodeResponse])
async def get_goal_nodes(
    goal_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all nodes for a goal."""
    result = await db.execute(select(Goal).where(Goal.id == goal_id))
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Check visibility (including shared access)
    has_access = await check_goal_access(goal, current_user, db)
    if not has_access:
        raise HTTPException(status_code=404, detail="Goal not found")

    result = await db.execute(
        select(Node).where(Node.goal_id == goal_id).order_by(Node.order)
    )
    return result.scalars().all()


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID,
    goal_data: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a goal."""
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for field, value in goal_data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    await db.flush()
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a goal and all associated data.

    This cascades deletion to:
    - All nodes under this goal
    - All updates on those nodes
    - All interactions (reactions) on nodes, updates, and the goal itself
    - All comments on nodes, updates, and the goal itself
    - All follows on this goal
    - All activities related to this goal and its nodes
    - Goal shares, prophecies, time capsules, sacred boosts (via DB cascade)

    Only the goal owner can delete their goal.
    """
    # Verify goal exists and user is the owner
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get all node IDs for this goal
    node_result = await db.execute(
        select(Node.id).where(Node.goal_id == goal_id)
    )
    node_ids = [row[0] for row in node_result.fetchall()]

    # Get all update IDs for these nodes
    update_ids = []
    if node_ids:
        update_result = await db.execute(
            select(Update.id).where(Update.node_id.in_(node_ids))
        )
        update_ids = [row[0] for row in update_result.fetchall()]

    # Delete interactions for updates
    if update_ids:
        await db.execute(
            delete(Interaction).where(
                Interaction.target_type == TargetType.UPDATE,
                Interaction.target_id.in_(update_ids)
            )
        )

    # Delete interactions for nodes
    if node_ids:
        await db.execute(
            delete(Interaction).where(
                Interaction.target_type == TargetType.NODE,
                Interaction.target_id.in_(node_ids)
            )
        )

    # Delete interactions for the goal itself
    await db.execute(
        delete(Interaction).where(
            Interaction.target_type == TargetType.GOAL,
            Interaction.target_id == goal_id
        )
    )

    # Delete comments for updates
    if update_ids:
        await db.execute(
            delete(Comment).where(
                Comment.target_type == CommentTargetType.UPDATE,
                Comment.target_id.in_(update_ids)
            )
        )

    # Delete comments for nodes
    if node_ids:
        await db.execute(
            delete(Comment).where(
                Comment.target_type == CommentTargetType.NODE,
                Comment.target_id.in_(node_ids)
            )
        )

    # Delete comments for the goal itself
    await db.execute(
        delete(Comment).where(
            Comment.target_type == CommentTargetType.GOAL,
            Comment.target_id == goal_id
        )
    )

    # Delete follows for this goal
    await db.execute(
        delete(Follow).where(
            Follow.follow_type == FollowType.GOAL,
            Follow.target_id == goal_id
        )
    )

    # Delete activities for updates
    if update_ids:
        await db.execute(
            delete(Activity).where(
                Activity.target_type == ActivityTargetType.UPDATE,
                Activity.target_id.in_(update_ids)
            )
        )

    # Delete activities for nodes
    if node_ids:
        await db.execute(
            delete(Activity).where(
                Activity.target_type == ActivityTargetType.NODE,
                Activity.target_id.in_(node_ids)
            )
        )

    # Delete activities for the goal
    await db.execute(
        delete(Activity).where(
            Activity.target_type == ActivityTargetType.GOAL,
            Activity.target_id == goal_id
        )
    )

    # Unlink conversations and generation_queue (set goal_id to NULL)
    await db.execute(
        Conversation.__table__.update()
        .where(Conversation.goal_id == goal_id)
        .values(goal_id=None)
    )
    await db.execute(
        GenerationQueue.__table__.update()
        .where(GenerationQueue.goal_id == goal_id)
        .values(goal_id=None)
    )

    # Delete updates for nodes
    if node_ids:
        await db.execute(
            delete(Update).where(Update.node_id.in_(node_ids))
        )

    # Delete node dependencies (should cascade, but be explicit)
    if node_ids:
        await db.execute(
            delete(NodeDependency).where(
                (NodeDependency.node_id.in_(node_ids)) |
                (NodeDependency.depends_on_id.in_(node_ids))
            )
        )

    # Delete nodes
    if node_ids:
        await db.execute(
            delete(Node).where(Node.goal_id == goal_id)
        )

    # Finally delete the goal (shares, prophecies, time_capsules, sacred_boosts, resource_drops cascade via DB)
    await db.delete(goal)
