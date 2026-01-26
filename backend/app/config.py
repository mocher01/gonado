from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Gonado"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://gonado:gonado@localhost:5432/gonado"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CSRF
    CSRF_SECRET: str = "your-csrf-secret-key-change-in-production"
    CSRF_COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
    CSRF_COOKIE_HTTPONLY: bool = False  # Must be False so JavaScript can read it
    CSRF_COOKIE_SAMESITE: str = "lax"  # "strict", "lax", or "none"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "gonado"
    MINIO_USE_SSL: bool = False

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Sentry
    SENTRY_DSN: str | None = None

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
