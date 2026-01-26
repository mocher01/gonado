# Post-Mortem: Site Stability Issues - January 22, 2026

## Executive Summary

Multiple issues accumulated over a development session, culminating in a completely broken production site. This document analyzes root causes, contributing factors, and preventive measures.

---

## Issue 1: Site Completely Broken (Critical)

### Symptoms
- Homepage returned 500 errors
- Goal pages showed "Cannot find module './vendor-chunks/@opentelemetry.js'"
- Missing JS/CSS chunks in browser
- Login not working
- Dashboard blank

### Root Cause
**Corrupted `.next` build directory** caused by:
1. Multiple rapid code changes without proper rebuilds
2. Hot Module Replacement (HMR) in dev mode failing to sync properly
3. Cached build artifacts becoming stale/incompatible with new code

### Why It Happened
- Development container runs in `npm run dev` mode (not production build)
- Frequent code edits caused partial HMR updates
- The `.next` directory accumulated corrupted/orphaned chunks
- OpenTelemetry module reference became broken when chunks were invalidated

### Fix Applied
```bash
docker exec gonado-frontend rm -rf /app/.next
docker restart gonado-frontend
```

### Prevention
- After significant code changes, restart the frontend container
- Consider periodic `.next` directory cleanup in development
- For production: always use fresh `npm run build` before deployment

---

## Issue 2: Duplicate Reaction Icons on Nodes

### Symptoms
- Reaction icons (👊 🎉 🔦 💪 🚩) appeared in TWO rows on each node
- Looked like duplicate rendering but was actually CSS wrapping

### Root Cause
**CSS flex container wrapping** due to insufficient space:

```tsx
// BEFORE (broken)
<div className="flex items-center justify-center gap-3">
  {reactions.map(r => (
    <button className="... gap-1.5 px-2.5 py-1.5 ...">
```

- Node width: 400px
- 5 buttons with `gap-3` (12px) = 48px gaps
- Each button with `px-2.5` (10px each side) = 100px padding total
- Emoji + count + border = ~60px per button = 300px
- Total: ~448px > 400px node width = **WRAP TO SECOND LINE**

### Fix Applied
```tsx
// AFTER (fixed)
<div className="flex items-center justify-center gap-2 flex-nowrap">
  {reactions.map(r => (
    <button className="... gap-1 px-2 py-1 ...">
```

**File:** `frontend/components/quest-map/nodes/TaskNode.tsx:417,436`

### Prevention
- Always add `flex-nowrap` when items must stay on one line
- Test UI components at minimum container width
- Use responsive design patterns for constrained spaces

---

## Issue 3: Reaction Toggle Error (Click Same Reaction Twice)

### Symptoms
- Clicking same reaction icon twice caused API error
- Console showed DELETE endpoint failure

### Root Cause
**Wrong HTTP method for toggle behavior:**

```tsx
// BEFORE (broken)
if (userReaction === reactionType) {
  await api.removeReaction("goal", goalId);  // DELETE - doesn't know WHICH reaction
} else {
  await api.addReaction("goal", goalId, reactionType);  // POST
}
```

The DELETE endpoint didn't receive the reaction type, so backend couldn't identify which reaction to remove.

### Fix Applied
```tsx
// AFTER (fixed) - Always use POST, backend handles toggle
const result = await api.addReaction("goal", goalId, reactionType);
if (result.removed) {
  // Reaction was toggled off
} else {
  // New reaction added
}
```

**File:** `frontend/app/goals/[id]/page.tsx`

### Prevention
- Understand API contract before implementing frontend
- Backend POST endpoint already had toggle logic - didn't need separate DELETE call
- Document API behavior clearly

---

## Issue 4: Only 1 Resource Showing (When 9 Exist)

### Symptoms
- Node showed "1 resource" when database had 9
- Resource preview truncated

### Root Cause
**Hardcoded limits too low:**

```tsx
// API fetch limit
api.getGoalNodesResources(goalId, 2)  // Only fetching 2

// Display slice
latestResources.slice(0, 2)  // Only showing 2
```

### Fix Applied
```tsx
api.getGoalNodesResources(goalId, 3)  // Fetch 3
latestResources.slice(0, 3)  // Show 3
```

**Files:**
- `frontend/app/goals/[id]/page.tsx`
- `frontend/components/quest-map/nodes/TaskNode.tsx`

### Prevention
- Make limits configurable or use reasonable defaults
- Test with realistic data volumes
- Document why limits exist

---

## Issue 5: Node Creation 404 Error

### Symptoms
- POST `/api/goals/{goal_id}/nodes` returned 404
- Couldn't create new nodes on goals

### Root Cause
**Duplicate endpoint in wrong router:**

```python
# In nodes.py (WRONG - this router is mounted at /api/nodes)
@router.post("/goals/{goal_id}/nodes")  # Results in /api/nodes/goals/{goal_id}/nodes

# In goals.py (CORRECT - this router is mounted at /api/goals)
@router.post("/{goal_id}/nodes")  # Results in /api/goals/{goal_id}/nodes
```

### Fix Applied
Removed duplicate endpoint from `nodes.py`, kept correct one in `goals.py`.

**File:** `backend/app/api/nodes.py`

### Prevention
- Clear API route ownership (which router handles which endpoints)
- Use OpenAPI docs to verify actual routes
- Avoid splitting related endpoints across multiple routers

---

## Issue 6: Goal Update Using Wrong HTTP Method

### Symptoms
- Goal visibility toggle and edits failing
- 405 Method Not Allowed errors

### Root Cause
**Frontend using PUT, backend expecting PATCH:**

```tsx
// BEFORE
async updateGoal(id: string, data: Partial<Goal>): Promise<Goal> {
  return this.fetch(`/goals/${id}`, {
    method: "PUT",  // Wrong
```

### Fix Applied
```tsx
// AFTER
method: "PATCH",  // Correct
```

**File:** `frontend/lib/api.ts`

### Prevention
- Verify HTTP methods match between frontend and backend
- Use TypeScript to generate API client from OpenAPI spec
- Consistent REST conventions (PATCH for partial updates)

---

## Contributing Factors (Why Multiple Issues Accumulated)

### 1. Insufficient Testing After Changes
- Changes were made but not verified on live site
- E2E tests existed but weren't run consistently
- Manual smoke testing skipped

### 2. Rapid Development Cycle
- Multiple issues being fixed in quick succession
- No stabilization period between changes
- Build artifacts not refreshed

### 3. Dev Mode vs Production Differences
- Development container uses HMR (Hot Module Replacement)
- Production uses static build
- Issues that wouldn't occur in production (corrupted .next) appeared in dev

### 4. Missing Integration Points
- Frontend/backend API contract not fully synchronized
- HTTP methods, endpoint paths, response formats had mismatches

---

## Lessons Learned

### For Development
1. **Restart containers after significant changes** - Don't rely solely on HMR
2. **Test the actual UI** - Not just API endpoints or build success
3. **Clear build caches periodically** - Especially `.next` directory
4. **Verify API contracts** - HTTP methods, paths, request/response formats

### For Testing
1. **Run E2E smoke tests before declaring "fixed"**
2. **Test with realistic data** - Multiple comments, resources, reactions
3. **Test edge cases** - Double-click, rapid actions, empty states

### For Architecture
1. **Single source of truth for routes** - Don't split endpoints across routers
2. **Use API client generation** - Prevents frontend/backend drift
3. **Document toggle behaviors** - Is it POST+DELETE or POST-only?

### For CSS/UI
1. **Always use `flex-nowrap`** when items must stay on one line
2. **Test at minimum widths** - Components in constrained containers
3. **Calculate space requirements** - gaps + padding + content

---

## Action Items

- [ ] Add pre-commit hook to run basic smoke test
- [ ] Document API contract in OpenAPI spec
- [ ] Add container health checks that verify page loads
- [ ] Create development checklist for post-change verification
- [ ] Consider switching dev container to production build mode

---

## Timeline

| Time | Event |
|------|-------|
| Earlier | Multiple issues fixed (reactions, resources, visibility) |
| ~16:00 | User reports "NOTHING works" |
| ~16:05 | E2E smoke test reveals corrupted build |
| ~16:10 | Cleared .next, restarted container |
| ~16:15 | Site functional again |
| ~16:20 | User reports duplicate reaction icons |
| ~16:25 | Fixed CSS flex-wrap issue |
| ~16:30 | Site fully operational |

---

*Document created: 2026-01-22*
*Author: Orchestrator Agent*
