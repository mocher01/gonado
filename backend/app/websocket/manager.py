import asyncio
import json
import logging
from typing import Dict, Set
from uuid import UUID
from fastapi import WebSocket
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.redis_client: redis.Redis = None

    async def get_redis(self) -> redis.Redis:
        if self.redis_client is None:
            self.redis_client = redis.from_url(settings.REDIS_URL)
        return self.redis_client

    async def connect(self, websocket: WebSocket, user_id: UUID):
        await websocket.accept()
        channel = f"user:{user_id}"
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: UUID):
        channel = f"user:{user_id}"
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def subscribe_to_goal(self, websocket: WebSocket, goal_id: UUID):
        channel = f"goal:{goal_id}"
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def unsubscribe_from_goal(self, websocket: WebSocket, goal_id: UUID):
        channel = f"goal:{goal_id}"
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)

    async def send_personal_message(self, message: dict, user_id: UUID):
        channel = f"user:{user_id}"
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_goal(self, message: dict, goal_id: UUID):
        channel = f"goal:{goal_id}"
        if channel in self.active_connections:
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_global(self, message: dict):
        for connections in self.active_connections.values():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def start_redis_listener(self):
        """Start listening to Redis pub/sub for distributed messages."""
        logger.info("Starting Redis listener for WebSocket pub/sub")

        while True:
            try:
                redis_client = await self.get_redis()
                pubsub = redis_client.pubsub()

                # Subscribe to user, goal, and global channels
                await pubsub.psubscribe("user:*", "goal:*", "global")
                logger.info("Redis listener subscribed to channels: user:*, goal:*, global")

                async for message in pubsub.listen():
                    if message["type"] == "pmessage":
                        try:
                            channel = message["channel"].decode()
                            data = json.loads(message["data"].decode())

                            logger.debug(f"Received message on channel {channel}: {data}")

                            # Broadcast to all connections subscribed to this channel
                            if channel in self.active_connections:
                                connections_count = len(self.active_connections[channel])
                                logger.debug(f"Broadcasting to {connections_count} connections on channel {channel}")

                                for connection in self.active_connections[channel].copy():
                                    try:
                                        await connection.send_json(data)
                                    except Exception as e:
                                        logger.warning(f"Failed to send message to WebSocket: {e}")
                                        # Connection might be dead, will be cleaned up on disconnect
                            else:
                                logger.debug(f"No active connections for channel {channel}")

                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to decode Redis message: {e}")
                        except Exception as e:
                            logger.error(f"Error processing Redis message: {e}")

            except redis.ConnectionError as e:
                logger.error(f"Redis connection error: {e}. Retrying in 5 seconds...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Unexpected error in Redis listener: {e}. Retrying in 5 seconds...")
                await asyncio.sleep(5)


connection_manager = ConnectionManager()
