from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.services.auth import AuthService
from app.schemas.user import UserResponse, UserPublicResponse, UserUpdate
from app.models.user import User

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get the current user's profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update the current user's profile."""
    if user_data.display_name is not None:
        current_user.display_name = user_data.display_name
    if user_data.bio is not None:
        current_user.bio = user_data.bio
    if user_data.avatar_url is not None:
        current_user.avatar_url = user_data.avatar_url

    await db.flush()
    return current_user


@router.get("/{username}", response_model=UserPublicResponse)
async def get_user_by_username(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a user's public profile by username."""
    user = await AuthService.get_user_by_username(db, username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user
