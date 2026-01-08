# Goals API Enhancements - Discovery Features

## Summary

Enhanced the goals list API with search, sorting, and filtering capabilities for discovery features. Added a new `/api/goals/discover` endpoint that returns enriched goal data including owner information.

## Changes Made

### 1. Enhanced `GET /api/goals` (list_goals)

Added new query parameters:

#### Search Parameter
- `search: Optional[str]` - Searches in goal title and description (case-insensitive using `ilike`)
- Example: `GET /api/goals?search=python`

#### Sort Parameter
- `sort: Optional[str]` - Options: "newest", "trending", "almost_done"
  - **newest** (default): Orders by `created_at DESC`
  - **trending**: Orders by total reactions + comments in last 7 days, DESC
  - **almost_done**: Shows goals with >50% progress (completed_nodes / total_nodes), ordered by progress DESC
- Example: `GET /api/goals?sort=trending`
- Validation: Only accepts the three valid values, returns 422 for invalid input

#### Needs Help Filter
- `needs_help: Optional[bool]` - Filters goals where user is struggling
- When `true`: Shows goals with `current_mood` in ["struggling", "stuck"] OR `struggle_detected_at` is not null
- Example: `GET /api/goals?needs_help=true`

#### Combined Filters
All parameters can be combined:
- `GET /api/goals?search=fitness&category=health&sort=trending&needs_help=true`

### 2. New `GET /api/goals/discover` Endpoint

A dedicated discovery endpoint that returns enriched goal data with owner information.

#### Features
- Returns `GoalDiscoveryListResponse` with `GoalDiscoveryResponse` items
- Each goal includes `owner` field with:
  - `user_id: UUID`
  - `username: str`
  - `display_name: Optional[str]`
  - `avatar_url: Optional[str]`
- Only returns PUBLIC goals (no private/shared goals)
- Supports all the same filters as list_goals:
  - `search`
  - `category`
  - `status`
  - `sort` (default: "newest")
  - `needs_help`
  - `limit` / `offset` for pagination

#### Response Schema
```json
{
  "goals": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "string",
      "description": "string",
      "category": "string",
      "visibility": "public",
      "status": "active",
      "world_theme": "mountain",
      "current_mood": "motivated",
      "struggle_detected_at": null,
      "owner": {
        "user_id": "uuid",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_url": "https://..."
      }
    }
  ],
  "total": 42
}
```

### 3. New Pydantic Schemas

Added to `/var/apps/gonado/backend/app/schemas/goal.py`:

- `GoalOwnerInfo`: Basic user information for goal owner
- `GoalDiscoveryResponse`: Enriched goal response with owner info
- `GoalDiscoveryListResponse`: List response for discovery endpoint

### 4. Database Queries

#### Search Implementation
```python
search_pattern = f"%{search}%"
query = query.where(
    or_(
        Goal.title.ilike(search_pattern),
        Goal.description.ilike(search_pattern)
    )
)
```

#### Trending Sort Implementation
- Counts reactions on goals from last 7 days
- Counts comments on goals from last 7 days
- Orders by sum of both counts, descending
- Uses correlated subqueries for efficient counting

#### Almost Done Sort Implementation
- Calculates progress as `(completed_nodes / total_nodes) * 100`
- Filters goals with progress > 50%
- Only includes goals with at least 1 node
- Orders by progress percentage, descending

#### Needs Help Filter Implementation
```python
query = query.where(
    or_(
        Goal.current_mood.in_(["struggling", "stuck"]),
        Goal.struggle_detected_at.isnot(None)
    )
)
```

## Files Modified

1. `/var/apps/gonado/backend/app/api/goals.py`
   - Updated `list_goals` function with new parameters
   - Added `discover_goals` function
   - Updated imports

2. `/var/apps/gonado/backend/app/schemas/goal.py`
   - Added `GoalOwnerInfo` schema
   - Added `GoalDiscoveryResponse` schema
   - Added `GoalDiscoveryListResponse` schema

## Testing

### Manual Testing (Verified)
All endpoints tested successfully via curl:

1. ✓ Search by title: `GET /api/goals?search=python`
2. ✓ Search case-insensitive: `GET /api/goals?search=PYTHON`
3. ✓ Sort by newest: `GET /api/goals?sort=newest`
4. ✓ Sort by trending: `GET /api/goals?sort=trending`
5. ✓ Sort by almost_done: `GET /api/goals?sort=almost_done`
6. ✓ Invalid sort validation: `GET /api/goals?sort=invalid` → 422 error
7. ✓ Needs help filter: `GET /api/goals?needs_help=true`
8. ✓ Combined filters: `GET /api/goals?search=salsa&category=personal`
9. ✓ Discover endpoint: `GET /api/goals/discover?limit=2`
10. ✓ Discover with search: `GET /api/goals/discover?search=france`
11. ✓ Discover with trending: `GET /api/goals/discover?sort=trending`
12. ✓ Discover only public: Verified no private goals in response

### Automated Tests
Created comprehensive test suite in `/var/apps/gonado/backend/tests/test_goals.py` with:
- 21 test cases covering all new features
- Test fixtures for goals, nodes, reactions, and comments
- Tests for search, sorting, filtering, and discovery
- Note: Tests require pytest-asyncio version compatibility fix

### Manual Test Script
Created `/var/apps/gonado/backend/tests/manual_test_goals_api.sh` for quick verification.

## Performance Considerations

1. **Trending Sort**: Uses correlated subqueries which are optimized by PostgreSQL. Consider adding indexes on:
   - `interactions.created_at`
   - `comments.created_at`

2. **Almost Done Sort**: Calculates progress on-the-fly. For large datasets, consider:
   - Denormalizing progress percentage as a column on Goal model
   - Updating it when nodes are completed

3. **Search**: Uses `ilike` which does full table scan. Consider:
   - Adding full-text search indexes on `title` and `description`
   - Using PostgreSQL `tsvector` for better performance

## Usage Examples

### Frontend Integration

```typescript
// Search for goals
const searchGoals = async (query: string) => {
  const response = await fetch(`/api/goals?search=${encodeURIComponent(query)}`);
  return response.json();
};

// Get trending goals
const getTrendingGoals = async () => {
  const response = await fetch('/api/goals/discover?sort=trending&limit=10');
  return response.json();
};

// Find goals that need help
const getGoalsNeedingHelp = async () => {
  const response = await fetch('/api/goals/discover?needs_help=true');
  return response.json();
};

// Almost done goals in a category
const getAlmostDoneGoals = async (category: string) => {
  const response = await fetch(
    `/api/goals?sort=almost_done&category=${category}`
  );
  return response.json();
};
```

## Migration Notes

No database migrations required. All enhancements use existing model fields:
- `Goal.title`, `Goal.description` for search
- `Goal.current_mood`, `Goal.struggle_detected_at` for needs_help filter
- `Goal.created_at` for newest sort
- Existing `Interaction`, `Comment`, `Node` tables for trending and almost_done sorts

## API Backward Compatibility

All changes are backward compatible:
- Existing `/api/goals` endpoint works as before (newest sort by default)
- New parameters are optional
- New `/api/goals/discover` endpoint is additive

## Next Steps

1. Add database indexes for performance optimization
2. Consider denormalizing progress percentage
3. Add full-text search indexes for better search performance
4. Monitor query performance in production
5. Add rate limiting to discovery endpoints if needed
