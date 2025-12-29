from contextlib import asynccontextmanager
from uuid import UUID
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import api_router
from app.websocket.manager import connection_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    description="Goal Achievement Platform - Help people succeed in achieving any objective",
    version="1.0.0",
    lifespan=lifespan
)

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
