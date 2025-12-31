from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.comment import (
    CommentCreate, CommentUpdate, CommentResponse, CommentWithReplies
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


@router.get("/{target_type}/{target_id}", response_model=List[CommentWithReplies])
async def get_comments_for_target(
    target_type: CommentTargetType,
    target_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all comments for a target with nested replies."""
    result = await db.execute(
        select(Comment)
        .options(selectinload(Comment.user))
        .where(
            Comment.target_type == target_type,
            Comment.target_id == target_id
        )
        .order_by(Comment.created_at.asc())
    )
    comments = result.scalars().all()

    return build_comment_tree(list(comments))


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
