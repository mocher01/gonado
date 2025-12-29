from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.notification import Notification
import redis.asyncio as redis
from app.config import settings
import json


class NotificationService:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None

    async def get_redis(self) -> redis.Redis:
        if self.redis_client is None:
            self.redis_client = redis.from_url(settings.REDIS_URL)
        return self.redis_client

    async def create_notification(
        self,
        db: AsyncSession,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """Create a notification in the database."""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=data or {}
        )
        db.add(notification)
        await db.flush()
        return notification

    async def send_realtime_notification(
        self,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ):
        """Send a real-time notification via Redis pub/sub."""
        try:
            redis_client = await self.get_redis()
            channel = f"user:{user_id}:notifications"
            payload = {
                "type": notification_type,
                "title": title,
                "message": message,
                "data": data or {}
            }
            await redis_client.publish(channel, json.dumps(payload, default=str))
        except Exception:
            # Silently fail if Redis is not available
            pass

    async def broadcast_to_goal_followers(
        self,
        goal_id: UUID,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ):
        """Broadcast notification to all followers of a goal."""
        try:
            redis_client = await self.get_redis()
            channel = f"goal:{goal_id}:updates"
            payload = {
                "type": notification_type,
                "title": title,
                "message": message,
                "data": data or {}
            }
            await redis_client.publish(channel, json.dumps(payload, default=str))
        except Exception:
            pass

    async def get_user_notifications(
        self,
        db: AsyncSession,
        user_id: UUID,
        limit: int = 20,
        unread_only: bool = False
    ) -> list[Notification]:
        """Get notifications for a user."""
        query = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.read == False)
        query = query.order_by(Notification.created_at.desc()).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def mark_as_read(
        self,
        db: AsyncSession,
        notification_id: UUID,
        user_id: UUID
    ) -> Optional[Notification]:
        """Mark a notification as read."""
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        )
        notification = result.scalar_one_or_none()
        if notification:
            notification.read = True
            await db.flush()
        return notification

    async def mark_all_as_read(
        self,
        db: AsyncSession,
        user_id: UUID
    ):
        """Mark all notifications as read for a user."""
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.read == False
            )
        )
        notifications = result.scalars().all()
        for notification in notifications:
            notification.read = True
        await db.flush()


notification_service = NotificationService()
