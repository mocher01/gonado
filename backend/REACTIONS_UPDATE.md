# Backend Update: Multiple Reactions Per User

## Summary
Updated the backend reactions system to allow users to have multiple different reaction types on the same target (node/goal/comment). Previously, users could only have ONE reaction per target.

## Changes Made

### 1. API Endpoint: `POST /api/interactions/reactions`
**File**: `/var/apps/gonado/backend/app/api/interactions.py` (lines 38-88)

**Old Behavior**:
- User could only have ONE reaction per target
- Clicking different reaction type REPLACED the existing one
- Query checked for ANY reaction type

**New Behavior**:
- User can have MULTIPLE reactions per target (e.g., both encourage AND celebrate)
- Clicking same reaction type = toggle OFF (remove that specific one)
- Clicking different reaction type = ADD it (don't replace)
- Query checks for SPECIFIC reaction type

**Code Change**:
```python
# OLD: Check if user already has ANY reaction
result = await db.execute(
    select(Interaction).where(
        Interaction.user_id == current_user.id,
        Interaction.target_type == reaction_data.target_type,
        Interaction.target_id == reaction_data.target_id,
        Interaction.interaction_type == InteractionType.REACTION
    )
)

# NEW: Check if user already has THIS SPECIFIC reaction type
result = await db.execute(
    select(Interaction).where(
        Interaction.user_id == current_user.id,
        Interaction.target_type == reaction_data.target_type,
        Interaction.target_id == reaction_data.target_id,
        Interaction.interaction_type == InteractionType.REACTION,
        Interaction.reaction_type == reaction_type_value  # <-- Added this line
    )
)
```

### 2. API Endpoint: `GET /api/interactions/reactions/{target_type}/{target_id}/summary`
**File**: `/var/apps/gonado/backend/app/api/interactions.py` (lines 148-189)

**Old Response**:
```json
{
  "total_count": 2,
  "counts": {"encourage": 2},
  "user_reaction": "encourage"  // Single reaction
}
```

**New Response**:
```json
{
  "total_count": 2,
  "counts": {"encourage": 1, "celebrate": 1},
  "user_reactions": ["encourage", "celebrate"]  // Array of reactions
}
```

**Code Change**:
```python
# OLD: Get only ONE user reaction
user_result = await db.execute(
    select(Interaction.reaction_type).where(...).limit(1)
)
user_reaction = user_result.scalar_one_or_none()

return ReactionSummary(
    total_count=total_count,
    counts=counts,
    user_reaction=user_reaction
)

# NEW: Get ALL user reactions
user_result = await db.execute(
    select(Interaction.reaction_type).where(...)
)
user_reactions = [row[0] for row in user_result.fetchall()]

return ReactionSummary(
    total_count=total_count,
    counts=counts,
    user_reactions=user_reactions
)
```

### 3. Response Schema: `ReactionSummary`
**File**: `/var/apps/gonado/backend/app/schemas/interaction.py` (line 52-56)

**Change**:
```python
# OLD
class ReactionSummary(BaseModel):
    total_count: int
    counts: Dict[str, int]
    user_reaction: Optional[str] = None  # Single reaction

# NEW
class ReactionSummary(BaseModel):
    total_count: int
    counts: Dict[str, int]
    user_reactions: list[str] = []  # Multiple reactions
```

### 4. Tests Updated
**File**: `/var/apps/gonado/backend/tests/test_reactions.py`

**Updated Tests**:
- `test_add_multiple_different_reactions` - Now expects BOTH reactions to exist (not replace)
- `test_multiple_reactions_per_user_per_target` - Verifies all 5 reaction types can exist simultaneously
- `test_get_reaction_summary_empty` - Checks `user_reactions` is empty array
- `test_get_reaction_summary_with_reactions` - Checks `user_reactions` array
- `test_summary_reflects_toggle` - Updated to use `user_reactions` array
- `test_summary_reflects_multiple_reactions` - New test for multiple reactions behavior

## Testing

### Manual API Tests
```bash
# Test 1: Add encourage reaction
curl -X POST "http://localhost:7902/api/interactions/reactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"node","target_id":"NODE_ID","reaction_type":"encourage"}'

# Test 2: Add celebrate reaction (should NOT replace encourage)
curl -X POST "http://localhost:7902/api/interactions/reactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"node","target_id":"NODE_ID","reaction_type":"celebrate"}'

# Test 3: Verify both exist in summary
curl "http://localhost:7902/api/interactions/reactions/node/NODE_ID/summary" \
  -H "Authorization: Bearer $TOKEN"
# Should show: "user_reactions": ["encourage", "celebrate"]

# Test 4: Toggle off encourage (should remove only encourage)
curl -X POST "http://localhost:7902/api/interactions/reactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"node","target_id":"NODE_ID","reaction_type":"encourage"}'
# Should return: {"removed": true, "reaction_type": "encourage"}

# Test 5: Verify only celebrate remains
curl "http://localhost:7902/api/interactions/reactions/node/NODE_ID/summary" \
  -H "Authorization: Bearer $TOKEN"
# Should show: "user_reactions": ["celebrate"]
```

## Frontend Impact

The frontend will need to update to handle `user_reactions` as an array instead of `user_reaction` as a single value:

**Before**:
```typescript
const { user_reaction } = reactionSummary;
const isActive = user_reaction === 'encourage';
```

**After**:
```typescript
const { user_reactions } = reactionSummary;
const isActive = user_reactions.includes('encourage');
```

## Database Impact

No migration needed - the database schema already supports multiple reactions per user. The `interactions` table has a composite unique constraint on `(user_id, target_type, target_id, reaction_type)` which allows multiple reactions as long as the reaction_type is different.

## Deployment

1. Deploy backend changes
2. Restart backend: `docker restart gonado-backend`
3. Update frontend to use `user_reactions` array
4. No database migration required

## Files Changed

1. `/var/apps/gonado/backend/app/api/interactions.py` - Updated create_reaction and get_reaction_summary functions
2. `/var/apps/gonado/backend/app/schemas/interaction.py` - Updated ReactionSummary schema
3. `/var/apps/gonado/backend/tests/test_reactions.py` - Updated tests for new behavior
