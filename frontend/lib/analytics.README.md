# Analytics System

A lightweight analytics tracking system for Gonado frontend.

## Overview

The analytics system provides a simple, extensible foundation for tracking user events and behaviors. It's designed to be easily replaced with a production analytics service (e.g., PostHog, Mixpanel, Plausible) later.

## Configuration

Set the environment variable to enable/disable analytics:

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

## Behavior

- **Development**: Events are logged to console
- **Production**: Events are sent to `/api/analytics` endpoint via `sendBeacon` API

## Usage

### Auto-tracking Page Views

Page views are automatically tracked via the `useAnalytics` hook in `ClientProviders`:

```tsx
import { useAnalytics } from "@/hooks/useAnalytics";

export function MyComponent() {
  useAnalytics(); // Automatically tracks page views on route change
  // ...
}
```

### Manual Event Tracking

Import the analytics singleton and track custom events:

```tsx
import { analytics } from "@/lib/analytics";

// Track custom event
analytics.track("button_clicked", { button_name: "hero_cta" });

// Track page view
analytics.page("/dashboard");

// Track goal creation
analytics.goalCreated("goal-123", "Learn TypeScript");

// Track node completion
analytics.nodeCompleted("node-456", "goal-123");

// Track user registration
analytics.userRegistered("user-789", "johndoe");

// Track user login
analytics.userLoggedIn("user-789");
```

## Architecture

### Files

- `lib/analytics.ts` - Core analytics singleton
- `hooks/useAnalytics.ts` - Hook for auto-tracking page views
- `app/api/analytics/route.ts` - API endpoint to receive events in production

### Event Structure

```typescript
interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
}
```

All events automatically include:
- Current URL
- Referrer
- User agent
- Timestamp (ISO 8601)

## Integration Points

Analytics is currently integrated at:

1. **Page views** - `ClientProviders.tsx` (auto-tracked via `useAnalytics`)
2. **User login** - `hooks/useAuth.ts`
3. **User registration** - `hooks/useAuth.ts`
4. **Goal creation** - `app/goals/new/page.tsx`
5. **Node completion** - `app/goals/[id]/page.tsx`

## Extending

### Add New Event Type

1. Add method to `Analytics` class in `lib/analytics.ts`:

```typescript
class Analytics {
  // ...

  commentPosted(commentId: string, targetType: string): void {
    this.track("comment_posted", {
      comment_id: commentId,
      target_type: targetType
    });
  }
}
```

2. Call it where the event occurs:

```typescript
analytics.commentPosted(comment.id, "goal");
```

### Replace with Production Service

To integrate a real analytics service (e.g., PostHog):

1. Install the SDK: `npm install posthog-js`
2. Update `lib/analytics.ts` to use the SDK instead of custom implementation
3. Update environment variables as needed

Example:

```typescript
import posthog from 'posthog-js';

class Analytics {
  constructor() {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST
      });
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.enabled) return;
    posthog.capture(event, properties);
  }

  // ...
}
```

## Testing

Run tests:

```bash
npm test lib/__tests__/analytics.test.ts
```

## Privacy

- No PII (Personally Identifiable Information) is tracked by default
- User IDs are internal database IDs, not emails or names
- Events can be disabled by setting `NEXT_PUBLIC_ANALYTICS_ENABLED=false`

## Future Enhancements

- [ ] Add session tracking
- [ ] Add error tracking integration
- [ ] Add A/B testing support
- [ ] Add funnel analysis helpers
- [ ] Add cohort analysis
- [ ] Add event buffering for better performance
- [ ] Add user properties tracking
