"""
Chat API for real-time goal creation conversations.

This bridges the frontend chat UI with Claude (via CLI script).
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.api.deps import get_current_user
from app.models import (
    User, Goal, Node,
    Conversation, ConversationMessage, ConversationStatus, MessageRole
)

router = APIRouter(prefix="/chat", tags=["chat"])


# === Pydantic Models ===

class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    sequence: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: UUID
    status: str
    goal_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


class PlanData(BaseModel):
    title: str
    description: str
    category: str
    world_theme: str
    target_date: Optional[str] = None
    nodes: List[dict]


# === User Endpoints (Frontend) ===

@router.post("/start")
async def start_conversation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new goal creation conversation."""
    # Check for existing active conversation
    result = await db.execute(
        select(Conversation).where(
            Conversation.user_id == current_user.id,
            Conversation.status.in_([ConversationStatus.ACTIVE, ConversationStatus.WAITING])
        ).order_by(Conversation.created_at.desc())
        .limit(1)
    )
    existing = result.scalar_one_or_none()

    if existing:
        # Load messages
        msg_result = await db.execute(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == existing.id)
            .order_by(ConversationMessage.sequence)
        )
        messages = msg_result.scalars().all()
        return {
            "id": existing.id,
            "status": existing.status.value,
            "goal_id": existing.goal_id,
            "created_at": existing.created_at,
            "updated_at": existing.updated_at,
            "messages": [
                {"id": m.id, "role": m.role.value, "content": m.content, "sequence": m.sequence, "created_at": m.created_at}
                for m in messages
            ]
        }

    # Create new conversation
    conversation = Conversation(
        user_id=current_user.id,
        status=ConversationStatus.ACTIVE
    )
    db.add(conversation)
    await db.flush()

    # Add system welcome message
    welcome = ConversationMessage(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content="Hi! I'm here to help you create a personalized quest map for your goal. What would you like to achieve?",
        sequence=1
    )
    db.add(welcome)
    await db.commit()
    await db.refresh(conversation)

    return {
        "id": conversation.id,
        "status": conversation.status.value,
        "goal_id": conversation.goal_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": [
            {"id": welcome.id, "role": welcome.role.value, "content": welcome.content, "sequence": welcome.sequence, "created_at": welcome.created_at}
        ]
    }


@router.get("/current")
async def get_current_conversation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's current active conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.user_id == current_user.id,
            Conversation.status.in_([
                ConversationStatus.ACTIVE,
                ConversationStatus.WAITING,
                ConversationStatus.PLANNING
            ])
        ).order_by(Conversation.created_at.desc())
        .limit(1)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        return None

    msg_result = await db.execute(
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conversation.id)
        .order_by(ConversationMessage.sequence)
    )
    messages = msg_result.scalars().all()

    return {
        "id": conversation.id,
        "status": conversation.status.value,
        "goal_id": conversation.goal_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": [
            {"id": m.id, "role": m.role.value, "content": m.content, "sequence": m.sequence, "created_at": m.created_at}
            for m in messages
        ]
    }


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_result = await db.execute(
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conversation.id)
        .order_by(ConversationMessage.sequence)
    )
    messages = msg_result.scalars().all()

    return {
        "id": conversation.id,
        "status": conversation.status.value,
        "goal_id": conversation.goal_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": [
            {"id": m.id, "role": m.role.value, "content": m.content, "sequence": m.sequence, "created_at": m.created_at}
            for m in messages
        ]
    }


@router.post("/{conversation_id}/send")
async def send_message(
    conversation_id: UUID,
    message: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message in the conversation (user side)."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.status == ConversationStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Conversation already completed")

    # Get next sequence number
    seq_result = await db.execute(
        select(func.max(ConversationMessage.sequence))
        .where(ConversationMessage.conversation_id == conversation_id)
    )
    last_seq = seq_result.scalar() or 0
    next_seq = last_seq + 1

    # Create user message
    msg = ConversationMessage(
        conversation_id=conversation_id,
        role=MessageRole.USER,
        content=message.content,
        sequence=next_seq
    )
    db.add(msg)

    # Set status to waiting for response
    conversation.status = ConversationStatus.WAITING
    conversation.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(msg)

    return {
        "id": msg.id,
        "role": msg.role.value,
        "content": msg.content,
        "sequence": msg.sequence,
        "created_at": msg.created_at
    }


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: UUID,
    since_sequence: int = Query(0, description="Get messages after this sequence number"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages in a conversation (for polling new messages)."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_result = await db.execute(
        select(ConversationMessage)
        .where(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.sequence > since_sequence
        )
        .order_by(ConversationMessage.sequence)
    )
    messages = msg_result.scalars().all()

    return [
        {"id": m.id, "role": m.role.value, "content": m.content, "sequence": m.sequence, "created_at": m.created_at}
        for m in messages
    ]


@router.post("/{conversation_id}/abandon")
async def abandon_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Abandon a conversation without creating a goal."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.status = ConversationStatus.ABANDONED
    conversation.updated_at = datetime.utcnow()
    await db.commit()

    return {"status": "abandoned"}


# === CLI Endpoints (For Claude via script) ===

@router.get("/pending/conversations")
async def get_pending_conversations(
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations waiting for a response (for CLI processor)."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.status == ConversationStatus.WAITING)
        .order_by(Conversation.updated_at)
    )
    conversations = result.scalars().all()

    response = []
    for conv in conversations:
        # Get user info
        user_result = await db.execute(
            select(User).where(User.id == conv.user_id)
        )
        user = user_result.scalar_one_or_none()

        # Get all messages
        msg_result = await db.execute(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conv.id)
            .order_by(ConversationMessage.sequence)
        )
        all_messages = msg_result.scalars().all()

        # Get last user message
        last_user_msg = None
        for m in reversed(all_messages):
            if m.role == MessageRole.USER:
                last_user_msg = m
                break

        response.append({
            "conversation_id": str(conv.id),
            "user_email": user.email if user else "unknown",
            "user_name": user.display_name or user.username if user else "unknown",
            "last_message": last_user_msg.content if last_user_msg else "",
            "message_count": len(all_messages),
            "messages": [
                {"role": m.role.value, "content": m.content, "seq": m.sequence}
                for m in all_messages
            ],
            "created_at": conv.created_at.isoformat(),
            "waiting_since": conv.updated_at.isoformat()
        })

    return response


@router.post("/respond/{conversation_id}")
async def respond_to_conversation(
    conversation_id: UUID,
    message: MessageCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add Claude's response to a conversation (for CLI processor)."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get next sequence number
    seq_result = await db.execute(
        select(func.max(ConversationMessage.sequence))
        .where(ConversationMessage.conversation_id == conversation_id)
    )
    last_seq = seq_result.scalar() or 0
    next_seq = last_seq + 1

    # Create assistant message
    msg = ConversationMessage(
        conversation_id=conversation_id,
        role=MessageRole.ASSISTANT,
        content=message.content,
        sequence=next_seq
    )
    db.add(msg)

    # Set status back to active
    conversation.status = ConversationStatus.ACTIVE
    conversation.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(msg)

    return {"status": "sent", "sequence": next_seq}


MIN_USER_MESSAGES = 4  # Minimum user messages before finalization allowed

@router.post("/finalize/{conversation_id}")
async def finalize_conversation(
    conversation_id: UUID,
    plan: PlanData,
    db: AsyncSession = Depends(get_db)
):
    """Finalize conversation by creating the goal (for CLI processor)."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check minimum user messages before allowing finalization
    msg_result = await db.execute(
        select(func.count(ConversationMessage.id))
        .where(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.role == MessageRole.USER
        )
    )
    user_msg_count = msg_result.scalar() or 0

    if user_msg_count < MIN_USER_MESSAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Conversation needs at least {MIN_USER_MESSAGES} user messages before finalization (currently {user_msg_count})"
        )

    # Update status to planning
    conversation.status = ConversationStatus.PLANNING
    await db.commit()

    try:
        # Parse target date
        target_date = None
        if plan.target_date:
            try:
                target_date = datetime.fromisoformat(plan.target_date.replace('Z', '+00:00'))
            except:
                target_date = datetime.strptime(plan.target_date, "%Y-%m-%d")

        # Create the goal
        goal = Goal(
            user_id=conversation.user_id,
            title=plan.title,
            description=plan.description,
            category=plan.category,
            world_theme=plan.world_theme,
            target_date=target_date,
            status="active",
            visibility="public"
        )
        db.add(goal)
        await db.flush()

        # Create nodes
        for i, node_data in enumerate(plan.nodes):
            node = Node(
                goal_id=goal.id,
                title=node_data.get("title", f"Step {i+1}"),
                description=node_data.get("description", ""),
                order=node_data.get("order", i + 1),
                status="active" if i == 0 else "locked"
            )
            db.add(node)

        # Complete the conversation
        conversation.status = ConversationStatus.COMPLETED
        conversation.goal_id = goal.id
        conversation.completed_at = datetime.utcnow()

        # Get next sequence for completion message
        seq_result = await db.execute(
            select(func.max(ConversationMessage.sequence))
            .where(ConversationMessage.conversation_id == conversation_id)
        )
        last_seq = seq_result.scalar() or 0

        # Add system message about completion
        completion_msg = ConversationMessage(
            conversation_id=conversation_id,
            role=MessageRole.SYSTEM,
            content=f"Goal created successfully! Your quest map is ready.",
            sequence=last_seq + 1
        )
        db.add(completion_msg)

        await db.commit()

        return {
            "status": "completed",
            "goal_id": str(goal.id),
            "nodes_created": len(plan.nodes)
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
