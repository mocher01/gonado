"""Security middleware for rate limiting, headers, request validation, and CSRF protection."""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi import FastAPI
import re
import hmac
import hashlib
import secrets
from typing import Callable

# Rate limiter instance - use IP address for identification
limiter = Limiter(key_func=get_remote_address)


def setup_rate_limiting(app: FastAPI):
    """Configure rate limiting for the FastAPI app."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Rate limit decorators for different endpoint types
# Usage: @limiter.limit("10/minute") on route handlers

# Default limits:
# - General API: 100/minute
# - Auth endpoints: 10/minute (prevent brute force)
# - AI generation: 5/minute (expensive operations)
# - Health check: 1000/minute (monitoring)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # Cache control for API responses
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Validate and sanitize incoming requests."""

    # Patterns that might indicate SQL injection attempts
    SQL_INJECTION_PATTERNS = [
        r"(\%27)|(\')|(\-\-)|(\%23)|(#)",  # Basic SQL injection chars
        r"((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))",  # SQL injection attempts
        r"\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))",  # SQL OR injection
        r"((\%27)|(\'))union",  # UNION attacks
    ]

    # Patterns that might indicate XSS attempts
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",  # Script tags
        r"javascript:",  # JavaScript protocol
        r"on\w+\s*=",  # Event handlers
        r"<iframe",  # iframes
    ]

    def __init__(self, app, check_sql: bool = True, check_xss: bool = True):
        super().__init__(app)
        self.check_sql = check_sql
        self.check_xss = check_xss
        self.sql_patterns = [re.compile(p, re.IGNORECASE) for p in self.SQL_INJECTION_PATTERNS]
        self.xss_patterns = [re.compile(p, re.IGNORECASE | re.DOTALL) for p in self.XSS_PATTERNS]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check query parameters
        query_string = str(request.url.query)

        if self.check_sql and self._contains_sql_injection(query_string):
            return Response(
                content='{"detail":"Invalid characters in request"}',
                status_code=400,
                media_type="application/json"
            )

        if self.check_xss and self._contains_xss(query_string):
            return Response(
                content='{"detail":"Invalid characters in request"}',
                status_code=400,
                media_type="application/json"
            )

        return await call_next(request)

    def _contains_sql_injection(self, text: str) -> bool:
        """Check if text contains potential SQL injection patterns."""
        for pattern in self.sql_patterns:
            if pattern.search(text):
                return True
        return False

    def _contains_xss(self, text: str) -> bool:
        """Check if text contains potential XSS patterns."""
        for pattern in self.xss_patterns:
            if pattern.search(text):
                return True
        return False


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware using cookie-to-header token validation."""

    # Methods that require CSRF protection
    PROTECTED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

    # Endpoints that don't require CSRF (public APIs, read-only)
    EXEMPT_PATHS = {
        "/api/auth/csrf",  # CSRF token generation endpoint
        "/api/auth/login",  # Initial login doesn't have token yet
        "/api/auth/register",  # Registration doesn't have token yet
        "/health",  # Health check
        "/docs",  # API docs
        "/openapi.json",  # OpenAPI spec
    }

    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key.encode() if isinstance(secret_key, str) else secret_key

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
        if request.method not in self.PROTECTED_METHODS:
            return await call_next(request)

        # Skip CSRF check for exempt paths
        if any(request.url.path.startswith(path) for path in self.EXEMPT_PATHS):
            return await call_next(request)

        # Skip CSRF check for WebSocket connections
        if request.url.path.startswith("/ws/"):
            return await call_next(request)

        # Get CSRF token from cookie
        csrf_cookie = request.cookies.get("csrf_token")

        # Get CSRF token from header
        csrf_header = request.headers.get("X-CSRF-Token")

        # Validate CSRF token
        if not csrf_cookie or not csrf_header:
            return Response(
                content='{"detail":"CSRF token missing"}',
                status_code=403,
                media_type="application/json"
            )

        if not self._validate_csrf_token(csrf_cookie, csrf_header):
            return Response(
                content='{"detail":"CSRF token invalid"}',
                status_code=403,
                media_type="application/json"
            )

        return await call_next(request)

    def _validate_csrf_token(self, cookie_token: str, header_token: str) -> bool:
        """Validate that the CSRF token from cookie matches the header token."""
        # For basic implementation, we use double-submit cookie pattern
        # Cookie token and header token should match and be valid
        if not cookie_token or not header_token:
            return False

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(cookie_token, header_token)

    def generate_csrf_token(self) -> str:
        """Generate a new CSRF token."""
        # Generate a random token
        token = secrets.token_urlsafe(32)
        return token
