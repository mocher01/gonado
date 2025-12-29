from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.notification import NotificationResponse
from app.models.user import User
from app.services.notifications import notification_service

router = APIRouter()


@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's notifications."""
    return await notification_service.get_user_notifications(
        db, current_user.id, limit, unread_only
    )


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read."""
    notification = await notification_service.mark_as_read(
        db, notification_id, current_user.id
    )
    if not notification:
        return {"status": "not_found"}
    return {"status": "ok"}


@router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read."""
    await notification_service.mark_all_as_read(db, current_user.id)
    return {"status": "ok"}
