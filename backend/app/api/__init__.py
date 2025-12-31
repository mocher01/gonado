from fastapi import APIRouter
from app.api import auth, users, goals, nodes, updates, interactions, gamification, notifications, discovery, media, generation_queue, chat, follows, comments, badges, goal_shares, activity, user_stats

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
api_router.include_router(generation_queue.router, prefix="/queue", tags=["queue"])
api_router.include_router(chat.router)
api_router.include_router(follows.router, prefix="/follows", tags=["follows"])
api_router.include_router(comments.router, prefix="/comments", tags=["comments"])
api_router.include_router(badges.router, prefix="/badges", tags=["badges"])
api_router.include_router(goal_shares.router, prefix="/goal-shares", tags=["goal-shares"])
api_router.include_router(activity.router, prefix="/activity", tags=["activity"])
api_router.include_router(user_stats.router, prefix="/user-stats", tags=["user-stats"])
