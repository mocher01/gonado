# Manual Test Plan for Bug #55 and #56

## Bug #56: Drop Resource Button

### Test Steps:
1. Open browser to http://localhost:3000
2. Login as testuser@example.com / test123456
3. Navigate to a public goal (not your own)
4. Click on any node to open the interaction popup
5. Click the "Drop resource" button
6. Verify: ResourceDropModal opens
7. Fill in the form:
   - URL: https://example.com/helpful-guide
   - Title: Test Resource
   - Description: This is a test resource drop
8. Click "Drop Resource" button
9. Verify: Success toast appears
10. Verify: Resource count increments

### Expected API Call:
```
POST /api/resource-drops/nodes/{nodeId}
Body: {
  "message": "This is a test resource drop",
  "resources": [{
    "url": "https://example.com/helpful-guide",
    "title": "Test Resource",
    "type": "link"
  }]
}
```

### Backend Verification:
Check Docker logs for the API call:
```bash
docker logs gonado-backend --tail 50 | grep -i "resource"
```

---

## Bug #55: Sacred Boost Button

### Test Steps:
1. Open browser to http://localhost:3000
2. Login as testuser@example.com / test123456
3. Navigate to a public goal (not your own)
4. Click on any node to open the interaction popup
5. Click the "Sacred Boost" button (gold gradient button)
6. Verify: SacredBoostModal opens
7. Enter an optional message: "You can do it!"
8. Click "Send Boost" button
9. Verify: Success feedback appears
10. Verify: Modal closes
11. Verify: Boost count updates

### Expected API Call:
```
POST /api/sacred-boosts/goals/{goalId}
Body: {
  "message": "You can do it!"
}
```

### Backend Verification:
Check Docker logs for the API call:
```bash
docker logs gonado-backend --tail 50 | grep -i "boost"
```

---

## Browser DevTools Checks

### Network Tab:
1. Open DevTools > Network
2. Perform the actions above
3. Look for POST requests to:
   - `/api/resource-drops/nodes/*`
   - `/api/sacred-boosts/goals/*`
4. Verify request payload matches expected format
5. Verify response is 200 or 201

### Console:
1. Open DevTools > Console
2. Check for any errors
3. Verify no "Failed to drop resource" or "Failed to send boost" errors

---

## Automated E2E Tests

Run the existing E2E tests to verify:

```bash
cd /var/apps/gonado/frontend
npx playwright test tests/e2e/social/resource-drop.spec.ts
npx playwright test tests/e2e/social/sacred-boost.spec.ts
```

---

## Test Results

### Bug #56 - Drop Resource:
- [ ] Modal opens when button clicked
- [ ] Form accepts input
- [ ] Submit sends correct API payload
- [ ] Backend receives and processes request
- [ ] Success feedback shows
- [ ] Resource count updates

### Bug #55 - Sacred Boost:
- [ ] Modal opens when button clicked
- [ ] Message input works
- [ ] Submit sends correct API payload
- [ ] Backend receives and processes request
- [ ] Success feedback shows
- [ ] Boost is recorded

---

## Code Changes Made

### File: `/var/apps/gonado/frontend/lib/api.ts`
**Line 642-650**: Updated `dropResource()` function signature to accept `{url, title, description}` and transform it to backend format `{message, resources: [{url, title, type}]}`.

### File: `/var/apps/gonado/frontend/app/goals/[id]/page.tsx`
**Line 2004-2007**: Simplified `handleResourceDropSubmit()` to pass data directly to API.

---

## Expected Outcome

Both buttons should now:
1. Open their respective modals when clicked
2. Accept user input
3. Send properly formatted API requests
4. Show success feedback
5. Update UI state correctly
