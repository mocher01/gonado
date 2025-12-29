from fastapi import APIRouter
from app.api import auth, users, goals, nodes, updates, interactions, gamification, notifications, discovery, media

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(goals.router, prefix="/goals", tags=["goals"])
api_router.include_router(nodes.router, prefix="/nodes", tags=["nodes"])
api_router.include_router(updates.router, prefix="/updates", tags=["updates"])
api_router.include_router(interactions.router, prefix="/interactions", tags=["interactions"])
api_router.include_router(gamification.router, prefix="/gamification", tags=["gamification"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["discovery"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
