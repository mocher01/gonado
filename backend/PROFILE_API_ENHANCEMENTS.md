# User Profile API Enhancements

## Overview
Enhanced the user profile API to include comprehensive stats and badges information.

## Changes Made

### 1. Enhanced Schemas (`/var/apps/gonado/backend/app/schemas/user.py`)

#### New Schema: `UserStatsPublic`
Public user statistics for profile display:
- `goals_created` - Total goals created
- `goals_completed` - Total goals completed
- `achiever_score` - Achievement score
- `supporter_score` - Social/support score
- `comments_given` - Comments posted
- `reactions_given` - Reactions given
- `followers_count` - Number of followers
- `following_count` - Number of users followed

#### New Schema: `BadgePublic`
Badge information for public display:
- `id` - Badge UUID
- `name` - Badge name
- `description` - Badge description
- `icon_url` - Badge icon URL
- `category` - Badge category (achievement, social, streak, milestone, special)
- `rarity` - Badge rarity (common, rare, epic, legendary)
- `earned_at` - When the user earned this badge

#### Enhanced Schema: `UserPublicResponse`
Added to existing response:
- `created_at` - User join date
- `stats` - UserStatsPublic object (optional)
- `badges` - List of BadgePublic objects

### 2. Enhanced Endpoint (`/var/apps/gonado/backend/app/api/users.py`)

#### `GET /api/users/{username}` - Enhanced
**Changes:**
- Eager loads `user.stats` relationship
- Eager loads `user.badges` with badge details via `selectinload`
- Returns enriched `UserPublicResponse` with stats and badges

**Response Example:**
```json
{
  "id": "uuid",
  "username": "johndoe",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatar.png",
  "bio": "Aspiring developer",
  "xp": 1500,
  "level": 5,
  "streak_days": 10,
  "created_at": "2024-01-01T00:00:00Z",
  "stats": {
    "goals_created": 5,
    "goals_completed": 3,
    "achiever_score": 150,
    "supporter_score": 75,
    "comments_given": 10,
    "reactions_given": 20,
    "followers_count": 15,
    "following_count": 12
  },
  "badges": [
    {
      "id": "uuid",
      "name": "First Goal",
      "description": "Created your first goal",
      "icon_url": "https://example.com/badge.png",
      "category": "achievement",
      "rarity": "common",
      "earned_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### 3. New Endpoint: `GET /api/users/{username}/goals`

**Purpose:** Get a user's public goals with optional filtering and pagination

**Query Parameters:**
- `status_filter` (optional): Filter by status ("active" or "completed")
- `skip` (default: 0): Pagination offset
- `limit` (default: 20, max: 100): Results per page

**Features:**
- Returns only PUBLIC goals
- Filters by status if specified
- Pagination support
- Ordered by most recently updated
- Returns total count

**Response:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Learn Python",
      "description": "Master Python programming",
      "category": "learning",
      "visibility": "public",
      "status": "active",
      "world_theme": "mountain",
      "target_date": "2024-12-31T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-08T00:00:00Z"
    }
  ],
  "total": 5
}
```

**Usage Examples:**
- Get all public goals: `GET /api/users/johndoe/goals`
- Get active goals: `GET /api/users/johndoe/goals?status_filter=active`
- Get completed goals: `GET /api/users/johndoe/goals?status_filter=completed`
- Paginated: `GET /api/users/johndoe/goals?skip=20&limit=10`

### 4. New Endpoint: `GET /api/users/{username}/badges`

**Purpose:** Get all badges a user has earned

**Features:**
- Returns all earned badges with full details
- Ordered by most recently earned
- Includes badge metadata (category, rarity, XP reward)

**Response:**
```json
[
  {
    "id": "uuid",
    "badge": {
      "id": "uuid",
      "name": "First Goal",
      "description": "Created your first goal",
      "icon_url": "https://example.com/badge.png",
      "criteria": {"goals_created": 1},
      "xp_reward": 50,
      "category": "achievement",
      "rarity": "common",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "earned_at": "2024-01-02T00:00:00Z"
  }
]
```

## API Routes Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user's profile (unchanged) |
| PUT | `/api/users/me` | Update current user's profile (unchanged) |
| GET | `/api/users/{username}` | Get user profile with stats and badges (enhanced) |
| GET | `/api/users/{username}/goals` | Get user's public goals with pagination (new) |
| GET | `/api/users/{username}/badges` | Get user's earned badges (new) |

## Technical Details

### Database Relationships
The implementation leverages existing relationships:
- `User.stats` → `UserStats` (one-to-one)
- `User.badges` → `UserBadge` → `Badge` (many-to-many through UserBadge)
- `User.goals` → `Goal` (one-to-many)

### Performance Optimizations
- Uses `selectinload()` to eager load relationships and avoid N+1 queries
- Efficient pagination with offset/limit
- Proper indexing on user_id and username fields

### Privacy & Security
- Only returns PUBLIC goals (respects visibility settings)
- Badges are always public (achievement showcase)
- Stats are public (leaderboard/reputation system)

## Testing

All schemas and endpoints have been validated:
- ✓ Schema imports work correctly
- ✓ API router registers all routes
- ✓ Response models serialize correctly
- ✓ Optional fields (stats, badges) handle null/empty cases

## Next Steps

To use these endpoints in production:
1. Ensure UserStats records are created for all users
2. Consider adding caching for frequently accessed profiles
3. Add rate limiting for public profile endpoints
4. Consider adding filtering options (e.g., badge categories)
5. Add unit and integration tests for the new endpoints
