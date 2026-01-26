from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.services.auth import AuthService
from app.schemas.user import UserCreate, UserResponse
from app.middleware.security import limiter, CSRFMiddleware
from app.config import settings
import secrets

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class CSRFTokenResponse(BaseModel):
    csrf_token: str


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    # Check if email exists
    if await AuthService.get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username exists
    if await AuthService.get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    user = await AuthService.create_user(
        db,
        email=user_data.email,
        password=user_data.password,
        username=user_data.username,
        display_name=user_data.display_name
    )

    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login and get access tokens."""
    user = await AuthService.authenticate_user(
        db, login_data.email, login_data.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return TokenResponse(
        access_token=AuthService.create_access_token(user.id),
        refresh_token=AuthService.create_refresh_token(user.id)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token."""
    payload = AuthService.decode_token(refresh_data.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    user = await AuthService.get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return TokenResponse(
        access_token=AuthService.create_access_token(user.id),
        refresh_token=AuthService.create_refresh_token(user.id)
    )


@router.get("/csrf", response_model=CSRFTokenResponse)
async def get_csrf_token(response: Response):
    """
    Generate and return a CSRF token.

    This endpoint sets a csrf_token cookie and returns the token in the response body.
    The frontend should store this token and send it in the X-CSRF-Token header
    for all state-changing requests (POST, PUT, PATCH, DELETE).
    """
    # Generate a new CSRF token
    csrf_token = secrets.token_urlsafe(32)

    # Set the CSRF token as a cookie
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=settings.CSRF_COOKIE_HTTPONLY,
        secure=settings.CSRF_COOKIE_SECURE,
        samesite=settings.CSRF_COOKIE_SAMESITE,
        max_age=86400,  # 24 hours
    )

    # Return the token in the response body so frontend can include it in headers
    return CSRFTokenResponse(csrf_token=csrf_token)
