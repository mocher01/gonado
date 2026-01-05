"""
Test configuration and fixtures for Gonado backend tests.
"""
import os
import uuid
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from httpx import AsyncClient, ASGITransport
from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.services.auth import AuthService


# Use PostgreSQL for testing (same as production, supports UUID)
# Uses test database to avoid polluting production
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://gonado:gonado_secret@localhost:7903/gonado"
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client with overridden database dependency."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user with unique identifiers."""
    unique_id = uuid.uuid4()
    unique_suffix = str(unique_id)[:8]
    user = User(
        id=unique_id,
        email=f"testuser_{unique_suffix}@example.com",
        password_hash=AuthService.hash_password("testpassword"),
        username=f"testuser_{unique_suffix}",
        display_name="Test User"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_2(db_session: AsyncSession) -> User:
    """Create a second test user with unique identifiers."""
    unique_id = uuid.uuid4()
    unique_suffix = str(unique_id)[:8]
    user = User(
        id=unique_id,
        email=f"testuser2_{unique_suffix}@example.com",
        password_hash=AuthService.hash_password("testpassword2"),
        username=f"testuser2_{unique_suffix}",
        display_name="Test User 2"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Generate auth headers for test user."""
    token = AuthService.create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_user_2(test_user_2: User) -> dict:
    """Generate auth headers for second test user."""
    token = AuthService.create_access_token(test_user_2.id)
    return {"Authorization": f"Bearer {token}"}
