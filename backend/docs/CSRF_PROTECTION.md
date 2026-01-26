# CSRF Protection in Gonado Backend

## Overview

Gonado backend implements CSRF (Cross-Site Request Forgery) protection using a double-submit cookie pattern. This protects against attacks where a malicious site tricks a user's browser into making unauthorized requests to the Gonado API.

## How It Works

### 1. Token Generation

When a client needs to make state-changing requests, it first fetches a CSRF token:

```bash
GET /api/auth/csrf
```

Response:
```json
{
  "csrf_token": "oa6HJ-ooe7EPMY-0onogPhw1NxecVImBO2DCrmjq5vM"
}
```

This endpoint:
- Generates a cryptographically secure random token
- Sets the token in a `csrf_token` cookie
- Returns the token in the response body

### 2. Token Validation

For all state-changing requests (POST, PUT, PATCH, DELETE), the client must:
1. Include the CSRF token in the `X-CSRF-Token` header
2. Send the CSRF cookie with the request

The middleware validates that:
- Both the cookie and header are present
- The values match exactly (using constant-time comparison)

### 3. Protected Methods

CSRF protection applies to:
- POST
- PUT
- PATCH
- DELETE

Safe methods (GET, HEAD, OPTIONS) do NOT require CSRF tokens.

## Exempt Endpoints

The following endpoints are exempt from CSRF protection:

- `/api/auth/csrf` - Token generation endpoint
- `/api/auth/login` - Initial login (no token available yet)
- `/api/auth/register` - Registration (no token available yet)
- `/health` - Health check
- `/docs` - API documentation
- `/openapi.json` - OpenAPI specification
- `/ws/*` - WebSocket connections

## Configuration

CSRF settings are configured in `app/config.py`:

```python
# CSRF
CSRF_SECRET: str = "your-csrf-secret-key-change-in-production"
CSRF_COOKIE_SECURE: bool = False  # Set to True in production with HTTPS
CSRF_COOKIE_HTTPONLY: bool = False  # Must be False so JavaScript can read it
CSRF_COOKIE_SAMESITE: str = "lax"  # "strict", "lax", or "none"
```

**Production Settings:**
- `CSRF_COOKIE_SECURE=True` - Only send cookie over HTTPS
- `CSRF_COOKIE_SAMESITE="strict"` or `"lax"` - Prevent cross-site cookie sending

## Usage Example

### JavaScript/TypeScript Frontend

```typescript
// 1. Fetch CSRF token on app initialization
async function initCSRF() {
  const response = await fetch('/api/auth/csrf', {
    credentials: 'include' // Include cookies
  });
  const data = await response.json();
  // Store token for later use
  localStorage.setItem('csrf_token', data.csrf_token);
}

// 2. Include token in state-changing requests
async function createGoal(goalData) {
  const csrfToken = localStorage.getItem('csrf_token');

  const response = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include', // Send cookies
    body: JSON.stringify(goalData)
  });

  return response.json();
}

// 3. GET requests don't need CSRF token
async function getGoals() {
  const response = await fetch('/api/goals', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
}
```

### cURL Examples

```bash
# 1. Get CSRF token
curl -c cookies.txt http://localhost:7902/api/auth/csrf

# 2. Login (exempt endpoint)
curl -X POST http://localhost:7902/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# 3. Create goal WITH CSRF token (succeeds)
curl -X POST http://localhost:7902/api/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -b cookies.txt \
  -d '{"title": "My Goal", "description": "Test", "visibility": "public"}'

# 4. Create goal WITHOUT CSRF token (fails)
curl -X POST http://localhost:7902/api/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"title": "My Goal", "description": "Test", "visibility": "public"}'
# Response: {"detail":"CSRF token missing"}

# 5. GET request (no CSRF needed)
curl -X GET http://localhost:7902/api/goals \
  -H "Authorization: Bearer ${TOKEN}"
```

## Security Considerations

### Double-Submit Cookie Pattern

This implementation uses the double-submit cookie pattern:
- Token is stored in a cookie (automatically sent by browser)
- Token must also be sent in a custom header
- Malicious sites can't read the cookie due to same-origin policy
- Therefore, they can't set the header, preventing CSRF attacks

### Token Rotation

CSRF tokens should be refreshed:
- When a user logs in
- Periodically (e.g., every 24 hours)
- After sensitive operations

Current token lifetime: 24 hours (set via `max_age` in cookie)

### Limitations

1. **Not for Stateless APIs**: This implementation assumes cookies can be used
2. **Origin Checking**: Consider adding Origin/Referer header validation for additional security
3. **Token Storage**: Frontend stores token in localStorage (alternative: memory only)

## Testing

CSRF protection is tested in `tests/test_security.py::TestCSRFProtection`:

```bash
# Run CSRF tests
docker exec gonado-backend python3 -m pytest tests/test_security.py::TestCSRFProtection -v

# Test specific case
docker exec gonado-backend python3 -m pytest tests/test_security.py::TestCSRFProtection::test_csrf_protection_on_post_without_token -v
```

## Error Responses

### Missing CSRF Token
```json
{
  "detail": "CSRF token missing"
}
```
HTTP Status: 403 Forbidden

### Invalid CSRF Token
```json
{
  "detail": "CSRF token invalid"
}
```
HTTP Status: 403 Forbidden

## Implementation Details

### Middleware Order

CSRF middleware is added before CORS middleware in `app/main.py`:

```python
# CSRF protection (add before CORS)
app.add_middleware(CSRFMiddleware, secret_key=settings.CSRF_SECRET)

# CORS
app.add_middleware(CORSMiddleware, ...)
```

This ensures CSRF validation happens before CORS headers are added.

### Constant-Time Comparison

The middleware uses `hmac.compare_digest()` for token comparison to prevent timing attacks:

```python
def _validate_csrf_token(self, cookie_token: str, header_token: str) -> bool:
    if not cookie_token or not header_token:
        return False
    return hmac.compare_digest(cookie_token, header_token)
```

## Future Enhancements

1. **Origin Validation**: Add Origin/Referer header checking
2. **Token Rotation**: Implement automatic token rotation on login
3. **Rate Limiting**: Add rate limiting to CSRF token generation
4. **Encrypted Tokens**: Encrypt tokens with session-specific data
5. **SameSite=Strict**: Use stricter SameSite policy in production
