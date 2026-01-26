from contextlib import asynccontextmanager
from uuid import UUID
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import api_router
from app.websocket.manager import connection_manager
from app.middleware.security import (
    setup_rate_limiting,
    SecurityHeadersMiddleware,
    InputValidationMiddleware,
    CSRFMiddleware,
)
import sentry_sdk

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Initialize Sentry if DSN is provided
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=settings.ENVIRONMENT,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import asyncio

    logger.info("Starting application lifespan...")

    # Start Redis listener as a background task
    logger.info("Starting Redis listener background task...")
    redis_listener_task = asyncio.create_task(connection_manager.start_redis_listener())

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down application...")

    # Cancel the Redis listener task
    logger.info("Stopping Redis listener...")
    redis_listener_task.cancel()
    try:
        await redis_listener_task
    except asyncio.CancelledError:
        logger.info("Redis listener stopped")

    # Close Redis connection
    if connection_manager.redis_client:
        logger.info("Closing Redis connection...")
        await connection_manager.redis_client.close()
        logger.info("Redis connection closed")

    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    description="Goal Achievement Platform - Help people succeed in achieving any objective",
    version="1.0.0",
    lifespan=lifespan
)

# Security middleware - rate limiting
setup_rate_limiting(app)

# CSRF protection (add before CORS)
app.add_middleware(CSRFMiddleware, secret_key=settings.CSRF_SECRET)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Input validation and sanitization
app.add_middleware(InputValidationMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: UUID):
    await connection_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()

            # Handle different message types
            msg_type = data.get("type")

            if msg_type == "subscribe_goal":
                goal_id = UUID(data.get("goal_id"))
                await connection_manager.subscribe_to_goal(websocket, goal_id)
                await websocket.send_json({"type": "subscribed", "goal_id": str(goal_id)})

            elif msg_type == "unsubscribe_goal":
                goal_id = UUID(data.get("goal_id"))
                connection_manager.unsubscribe_from_goal(websocket, goal_id)
                await websocket.send_json({"type": "unsubscribed", "goal_id": str(goal_id)})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, user_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
