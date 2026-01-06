from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user, get_optional_user
from app.schemas.comment import (
    CommentCreate, CommentUpdate, CommentResponse, CommentWithReplies,
    CommentListResponse, CommentSortOrder
)
from app.models.comment import Comment, CommentTargetType
from app.models.user import User

router = APIRouter()


def build_comment_tree(comments: List[Comment], max_depth: int = 2) -> List[CommentWithReplies]:
    """
    Build a nested comment tree from flat list of comments.
    Limits nesting to max_depth levels (2 recommended for UI).
    """
    comment_dict = {}
    root_comments = []

    # First pass: create dict with all comments
    for comment in comments:
        comment_dict[comment.id] = CommentWithReplies.model_validate(comment)
        comment_dict[comment.id].replies = []

    # Second pass: build tree structure
    for comment in comments:
        if comment.parent_id is None:
            root_comments.append(comment_dict[comment.id])
        elif comment.parent_id in comment_dict:
            parent = comment_dict[comment.parent_id]
            # Check depth - count levels up to root
            depth = 1
            current = comment
            while current.parent_id and depth < max_depth:
                if current.parent_id in comment_dict:
                    depth += 1
                    # Find parent comment in original list
                    parent_comment = next((c for c in comments if c.id == current.parent_id), None)
                    if parent_comment:
                        current = parent_comment
                    else:
                        break
                else:
                    break

            if depth <= max_depth:
                parent.replies.append(comment_dict[comment.id])
            else:
                # If max depth exceeded, attach to root level
                root_comments.append(comment_dict[comment.id])

    return root_comments


@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new comment on a target (goal, node, or update)."""
    # If parent_id provided, verify it exists and belongs to same target
    if comment_data.parent_id:
        result = await db.execute(
            select(Comment).where(Comment.id == comment_data.parent_id)
        )
        parent = result.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent comment not found"
            )
        if parent.target_type != comment_data.target_type or parent.target_id != comment_data.target_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent comment must belong to the same target"
            )

    comment = Comment(
        user_id=current_user.id,
        target_type=comment_data.target_type,
        target_id=comment_data.target_id,
        parent_id=comment_data.parent_id,
        content=comment_data.content
    )
    db.add(comment)
    await db.flush()

    # Refresh to get user relationship
    await db.refresh(comment, ["user"])
    return comment


@router.get("/{target_type}/{target_id}", response_model=CommentListResponse)
async def get_comments_for_target(
    target_type: CommentTargetType,
    target_id: UUID,
    sort: CommentSortOrder = Query(default=CommentSortOrder.RECENT, description="Sort order"),
    limit: int = Query(default=10, ge=1, le=100, description="Number of comments to return"),
    offset: int = Query(default=0, ge=0, description="Number of comments to skip"),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated comments for a target with nested replies."""
    # Get total count of root comments (not replies)
    count_result = await db.execute(
        select(func.count(Comment.id))
        .where(
            Comment.target_type == target_type,
            Comment.target_id == target_id,
            Comment.parent_id.is_(None)  # Only count root comments
        )
    )
    total = count_result.scalar() or 0

    # Determine sort order
    order_by = Comment.created_at.desc() if sort == CommentSortOrder.RECENT else Comment.created_at.asc()

    # Get root comments with pagination
    result = await db.execute(
        select(Comment)
        .options(
            selectinload(Comment.user),
            selectinload(Comment.replies).selectinload(Comment.user)
        )
        .where(
            Comment.target_type == target_type,
            Comment.target_id == target_id,
            Comment.parent_id.is_(None)  # Only get root comments
        )
        .order_by(order_by)
        .offset(offset)
        .limit(limit)
    )
    comments = result.scalars().all()

    # Build tree for the fetched comments
    comment_list = build_comment_tree(list(comments))

    return CommentListResponse(
        total=total,
        comments=comment_list,
        has_more=(offset + limit) < total,
        limit=limit,
        offset=offset
    )


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Edit a comment. Only the owner can edit."""
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments"
        )

    comment.content = comment_data.content
    comment.is_edited = True
    await db.flush()
    await db.refresh(comment, ["user"])

    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a comment. Only the owner can delete."""
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )

    # Delete all replies first (cascade)
    await db.execute(
        select(Comment).where(Comment.parent_id == comment_id)
    )
    replies_result = await db.execute(
        select(Comment).where(Comment.parent_id == comment_id)
    )
    for reply in replies_result.scalars().all():
        await db.delete(reply)

    await db.delete(comment)


@router.post("/{comment_id}/reply", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def reply_to_comment(
    comment_id: UUID,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reply to an existing comment."""
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id)
    )
    parent = result.scalar_one_or_none()

    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent comment not found"
        )

    # Create reply with same target as parent
    reply = Comment(
        user_id=current_user.id,
        target_type=parent.target_type,
        target_id=parent.target_id,
        parent_id=comment_id,
        content=comment_data.content
    )
    db.add(reply)
    await db.flush()
    await db.refresh(reply, ["user"])

    return reply


@router.get("/{comment_id}/replies", response_model=List[CommentResponse])
async def get_comment_replies(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get direct replies to a specific comment."""
    # First verify comment exists
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # Get replies
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(Comment.parent_id == comment_id)
        .order_by(Comment.created_at.asc())
    )

    return result.scalars().all()


from app.models.node import Node
from app.models.goal import Goal
from pydantic import BaseModel


class NodeCommentSummary(BaseModel):
    """Summary of comments for a single node."""
    node_id: UUID
    comments_count: int
    recent_comments: List[CommentWithReplies]
    has_more: bool

    class Config:
        from_attributes = True


class GoalNodesCommentsResponse(BaseModel):
    """Batch response for all node comments in a goal."""
    goal_id: UUID
    nodes: dict[str, NodeCommentSummary]


@router.get("/goal/{goal_id}/nodes", response_model=GoalNodesCommentsResponse)
async def get_goal_nodes_comments(
    goal_id: UUID,
    limit: int = Query(default=3, ge=1, le=10, description="Number of recent comments per node"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comments for all nodes in a goal (batch endpoint for trail markers).
    Returns recent comments for each node to display in trail marker previews.
    """
    # Get all nodes for the goal
    nodes_result = await db.execute(
        select(Node.id).where(Node.goal_id == goal_id)
    )
    node_ids = [row[0] for row in nodes_result.all()]

    if not node_ids:
        return GoalNodesCommentsResponse(goal_id=goal_id, nodes={})

    nodes_summary: dict[str, NodeCommentSummary] = {}

    for node_id in node_ids:
        # Get total count
        count_result = await db.execute(
            select(func.count(Comment.id))
            .where(
                Comment.target_type == CommentTargetType.NODE,
                Comment.target_id == node_id,
                Comment.parent_id.is_(None)  # Count root comments only
            )
        )
        total = count_result.scalar() or 0

        # Get recent comments with user info
        comments_result = await db.execute(
            select(Comment)
            .options(
                selectinload(Comment.user),
                selectinload(Comment.replies).selectinload(Comment.user)
            )
            .where(
                Comment.target_type == CommentTargetType.NODE,
                Comment.target_id == node_id,
                Comment.parent_id.is_(None)
            )
            .order_by(Comment.created_at.desc())
            .limit(limit)
        )
        comments = comments_result.scalars().all()

        # Build tree for fetched comments
        comment_list = build_comment_tree(list(comments))

        nodes_summary[str(node_id)] = NodeCommentSummary(
            node_id=node_id,
            comments_count=total,
            recent_comments=comment_list,
            has_more=total > limit
        )

    return GoalNodesCommentsResponse(goal_id=goal_id, nodes=nodes_summary)
