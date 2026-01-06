"""Security middleware for rate limiting, headers, and request validation."""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi import FastAPI
import re
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
