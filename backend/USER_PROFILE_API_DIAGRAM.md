# User Profile API - Architecture Diagram

## API Endpoint Structure

```
/api/users/
│
├── /me
│   ├── GET  - Get current user's full profile (includes email)
│   └── PUT  - Update current user's profile
│
└── /{username}
    ├── GET  - Get public profile with stats and badges ⭐ ENHANCED
    │
    ├── /goals
    │   └── GET  - Get user's public goals (with pagination) ⭐ NEW
    │       Query params:
    │       - status_filter: "active" | "completed"
    │       - skip: number (default: 0)
    │       - limit: number (default: 20, max: 100)
    │
    └── /badges
        └── GET  - Get user's earned badges ⭐ NEW
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    GET /api/users/{username}                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │  Query User by username       │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌───────────────────────────────┐
           │  selectinload(User.stats)     │
           │  selectinload(User.badges)    │
           │    .selectinload(             │
           │      UserBadge.badge)         │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌───────────────────────────────┐
           │  Build UserPublicResponse:    │
           │  - Basic user info            │
           │  - Stats (if exists)          │
           │  - Badges list (if any)       │
           └───────────┬───────────────────┘
                       │
                       ▼
                  Return JSON
```

```
┌─────────────────────────────────────────────────────────────────┐
│              GET /api/users/{username}/goals                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │  Query User by username       │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌───────────────────────────────┐
           │  Query Goals:                 │
           │  - WHERE user_id = user.id    │
           │  - AND visibility = PUBLIC    │
           │  - AND status = filter (opt)  │
           │  - ORDER BY updated_at DESC   │
           │  - OFFSET skip                │
           │  - LIMIT limit                │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌───────────────────────────────┐
           │  Count Total (same filter)    │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌───────────────────────────────┐
           │  Return GoalListResponse:     │
           │  - goals: [...]               │
           │  - total: number              │
           └───────────┬───────────────────┘
                       │
                       ▼
                  Return JSON
```

```
┌─────────────────────────────────────────────────────────────────┐
│             GET /api/users/{username}/badges                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │  Query User by username       │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌───────────────────────────────┐
           │  Query UserBadges:            │
           │  - WHERE user_id = user.id    │
           │  - selectinload(badge)        │
           │  - ORDER BY earned_at DESC    │
           └───────────┬───────────────────┘
                       │
                       ▼
           ┌───────────────────────────────┐
           │  Build UserBadgeResponse[]    │
           │  with full badge details      │
           └───────────┬───────────────────┘
                       │
                       ▼
                  Return JSON
```

## Database Schema Relationships

```
┌─────────────────────────┐
│         User            │
│─────────────────────────│
│ id (PK)                 │
│ username (UNIQUE)       │
│ email                   │
│ display_name            │
│ avatar_url              │
│ bio                     │
│ xp                      │
│ level                   │
│ streak_days             │
│ created_at              │
└───────┬─────────────────┘
        │
        ├─────────────────────────────────────────────┐
        │                                             │
        │ 1:1                                         │ 1:many
        ▼                                             ▼
┌─────────────────────────┐                  ┌─────────────────────────┐
│      UserStats          │                  │      UserBadge          │
│─────────────────────────│                  │─────────────────────────│
│ id (PK)                 │                  │ id (PK)                 │
│ user_id (FK) UNIQUE     │                  │ user_id (FK)            │
│ goals_created           │                  │ badge_id (FK)           │
│ goals_completed         │                  │ earned_at               │
│ nodes_completed         │                  └───────┬─────────────────┘
│ comments_given          │                          │
│ reactions_given         │                          │ many:1
│ comments_received       │                          ▼
│ reactions_received      │                  ┌─────────────────────────┐
│ followers_count         │                  │       Badge             │
│ following_count         │                  │─────────────────────────│
│ achiever_score          │                  │ id (PK)                 │
│ supporter_score         │                  │ name (UNIQUE)           │
│ updated_at              │                  │ description             │
└─────────────────────────┘                  │ icon_url                │
                                             │ criteria (JSONB)        │
        │                                    │ xp_reward               │
        │ 1:many                             │ category (ENUM)         │
        ▼                                    │ rarity (ENUM)           │
┌─────────────────────────┐                  │ created_at              │
│        Goal             │                  └─────────────────────────┘
│─────────────────────────│
│ id (PK)                 │
│ user_id (FK)            │
│ title                   │
│ description             │
│ category                │
│ visibility (ENUM) ◀─────  PUBLIC only via /goals endpoint
│ status (ENUM) ◀─────────  Filter: active/completed
│ world_theme             │
│ target_date             │
│ created_at              │
│ updated_at              │
│ current_mood            │
│ mood_updated_at         │
└─────────────────────────┘
```

## Response Schema Structure

### UserPublicResponse
```json
{
  "id": "UUID",
  "username": "string",
  "display_name": "string?",
  "avatar_url": "string?",
  "bio": "string?",
  "xp": "number",
  "level": "number",
  "streak_days": "number",
  "created_at": "datetime",
  "stats": {                          // ⭐ NEW (nullable)
    "goals_created": "number",
    "goals_completed": "number",
    "achiever_score": "number",
    "supporter_score": "number",
    "comments_given": "number",
    "reactions_given": "number",
    "followers_count": "number",
    "following_count": "number"
  },
  "badges": [                         // ⭐ NEW (array)
    {
      "id": "UUID",
      "name": "string",
      "description": "string?",
      "icon_url": "string?",
      "category": "achievement|social|streak|milestone|special",
      "rarity": "common|rare|epic|legendary",
      "earned_at": "datetime"
    }
  ]
}
```

### GoalListResponse
```json
{
  "goals": [
    {
      "id": "UUID",
      "user_id": "UUID",
      "title": "string",
      "description": "string?",
      "category": "string?",
      "visibility": "public|private|shared|friends",
      "status": "planning|active|completed|abandoned",
      "world_theme": "string",
      "target_date": "datetime?",
      "created_at": "datetime",
      "updated_at": "datetime",
      "current_mood": "string?",
      "mood_updated_at": "datetime?"
    }
  ],
  "total": "number"
}
```

### UserBadgeResponse[]
```json
[
  {
    "id": "UUID",
    "badge": {
      "id": "UUID",
      "name": "string",
      "description": "string?",
      "icon_url": "string?",
      "criteria": {},               // JSONB object
      "xp_reward": "number",
      "category": "achievement|social|streak|milestone|special",
      "rarity": "common|rare|epic|legendary",
      "created_at": "datetime"
    },
    "earned_at": "datetime"
  }
]
```

## Privacy & Visibility Rules

```
┌─────────────────────────────────────────────────────────────┐
│                     Visibility Matrix                        │
├───────────────────┬──────────────────┬──────────────────────┤
│ Data              │ Who Can View     │ Endpoint             │
├───────────────────┼──────────────────┼──────────────────────┤
│ Basic Profile     │ Everyone         │ GET /users/{user}    │
│ (username, bio,   │                  │                      │
│  avatar, xp)      │                  │                      │
├───────────────────┼──────────────────┼──────────────────────┤
│ User Stats        │ Everyone         │ GET /users/{user}    │
│ (achievements,    │ (Public data)    │ (included)           │
│  reputation)      │                  │                      │
├───────────────────┼──────────────────┼──────────────────────┤
│ Badges            │ Everyone         │ GET /users/{user}    │
│ (earned           │ (Public showcase)│ GET /users/{user}/   │
│  achievements)    │                  │     badges           │
├───────────────────┼──────────────────┼──────────────────────┤
│ PUBLIC Goals      │ Everyone         │ GET /users/{user}/   │
│                   │                  │     goals            │
├───────────────────┼──────────────────┼──────────────────────┤
│ PRIVATE Goals     │ Owner only       │ GET /users/me        │
│                   │                  │ (not via /users/{u}) │
├───────────────────┼──────────────────┼──────────────────────┤
│ Email             │ Owner only       │ GET /users/me        │
│                   │                  │ (not in public API)  │
└───────────────────┴──────────────────┴──────────────────────┘
```

## Performance Optimization Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                   Query Optimization                           │
└────────────────────────────────────────────────────────────────┘

1. Eager Loading (selectinload)
   ────────────────────────────
   Instead of:
     User query                  →  1 query
     Loop: Get user.stats        →  1 query
     Loop: Get user.badges       →  N queries
     Loop: Get badge details     →  M queries
     TOTAL: 2 + N + M queries    ❌ N+1 Problem

   We use:
     User query with selectinload →  1 query (User)
                                     1 query (UserStats)
                                     1 query (UserBadges)
                                     1 query (Badges)
     TOTAL: 4 queries            ✅ Optimal

2. Pagination
   ───────────
   OFFSET skip LIMIT limit
   - Prevents loading all goals at once
   - Reduces memory usage
   - Faster response times

3. Filtering at Database Level
   ────────────────────────────
   WHERE visibility = 'public'
   - Reduces data transfer
   - Leverages database indexes
   - More efficient than post-filter

4. Proper Indexing
   ───────────────
   Required indexes:
   - users.username (UNIQUE)
   - goals.user_id
   - goals.visibility
   - goals.status
   - user_badges.user_id
   - user_stats.user_id (UNIQUE)
```

## Future Scaling Considerations

```
┌────────────────────────────────────────────────────────────────┐
│              Caching Strategy (Future)                         │
└────────────────────────────────────────────────────────────────┘

Layer 1: Application Cache (Redis)
─────────────────────────────────
Key: "user_profile:{username}"
TTL: 5 minutes
Invalidate: On profile update, badge earn, stats update

Layer 2: CDN Cache
──────────────────
For: Badge images, avatar images
TTL: 1 hour
Headers: Cache-Control: public, max-age=3600

Layer 3: Database Read Replicas
────────────────────────────────
Route read queries to replicas
Write queries to primary
Reduces load on primary database

┌────────────────────────────────────────────────────────────────┐
│              Rate Limiting (Future)                            │
└────────────────────────────────────────────────────────────────┘

Public Endpoints:
- 100 requests per minute per IP
- 1000 requests per hour per IP

Authenticated Endpoints:
- 1000 requests per minute per user
- No hourly limit
```

## Error Handling Flow

```
Request → Validate username
          │
          ├─ Invalid format? → 400 Bad Request
          │
          └─ Valid format
             │
             ▼
          Query Database
          │
          ├─ User not found? → 404 Not Found
          │
          └─ User found
             │
             ▼
          Load Related Data
          │
          ├─ Database error? → 500 Internal Server Error
          │
          └─ Success
             │
             ▼
          Build Response
          │
          └─ Return 200 OK with data
```

## Testing Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                     Test Pyramid                               │
└────────────────────────────────────────────────────────────────┘

                        ╱╲
                       ╱  ╲
                      ╱ E2E╲         ← Integration/E2E Tests
                     ╱──────╲          (Playwright, full stack)
                    ╱        ╲
                   ╱   Unit   ╲      ← Unit Tests
                  ╱────────────╲       (test_user_profile.py)
                 ╱              ╲
                ╱   Schema/API   ╲   ← Validation Tests
               ╱──────────────────╲    (pydantic, type checks)
              ╱____________________╲

Test Coverage:
- ✅ Schema validation (Pydantic)
- ✅ Unit tests (15 test cases)
- ⏳ Integration tests (future)
- ⏳ Load tests (future)
- ⏳ E2E tests (future)
```
