# Sentry and Feedback System Implementation

This document describes the Sentry error tracking and user feedback system implemented for Gonado.

## Overview

The implementation includes:
1. Sentry error tracking and performance monitoring
2. User feedback system with a floating button and modal
3. API endpoint for handling feedback submissions

## Files Added/Modified

### Sentry Configuration Files
- `/sentry.client.config.ts` - Client-side Sentry initialization
- `/sentry.server.config.ts` - Server-side Sentry initialization
- `/sentry.edge.config.ts` - Edge runtime Sentry initialization

### Feedback Components
- `/components/feedback/FeedbackButton.tsx` - Main feedback UI component
- `/components/feedback/index.ts` - Export file

### API Routes
- `/app/api/feedback/route.ts` - Handles feedback submission

### Modified Files
- `/app/layout.tsx` - Added FeedbackButton component
- `/next.config.js` - Added Sentry webpack configuration
- `/.env.example` - Added Sentry environment variables documentation

## Configuration

### Environment Variables

Add these to your `.env` file (all optional):

```bash
# Sentry DSN - Get this from your Sentry project settings
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id

# Optional: For source map uploads
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
```

If `NEXT_PUBLIC_SENTRY_DSN` is not provided, Sentry will not be initialized.

## Features

### Sentry Error Tracking

- **Automatic Error Capture**: Unhandled errors are automatically captured
- **Performance Monitoring**: 10% of transactions are sampled
- **Session Replay**: Captures user sessions on errors (with privacy settings)
- **Client and Server**: Works on both client and server-side code

### User Feedback System

- **Floating Button**: Always accessible in bottom-right corner
- **Feedback Modal**: Clean, animated modal with form
- **Categories**: Bug Report, Feature Request, General Feedback
- **Integration**: Feedback is sent to Sentry as informational messages
- **Console Logging**: Also logs to console for easy debugging

## Usage

### For Users

1. Click the feedback button (speech bubble icon) in the bottom-right corner
2. Select a category from the dropdown
3. Type your message
4. Click "Send Feedback"

### For Developers

#### Manually Capture Errors

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
}
```

#### Capture Messages

```typescript
Sentry.captureMessage("Something interesting happened", {
  level: "info",
  tags: { custom_tag: "value" },
});
```

#### Set User Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

## Feedback Storage

Currently, feedback is:
1. Logged to the console
2. Sent to Sentry as an informational message (if DSN is configured)

To store feedback in a database, modify `/app/api/feedback/route.ts` to:
- Add database schema for feedback
- Save to PostgreSQL via backend API
- Add admin dashboard to view feedback

## Privacy Considerations

Sentry Session Replay is configured with:
- `maskAllText: true` - All text is masked
- `blockAllMedia: true` - All media is blocked
- Only captures on errors (`replaysOnErrorSampleRate: 1.0`)

## Testing

### Test Feedback Locally

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Click the feedback button
4. Submit feedback
5. Check console logs for output

### Test Sentry (without DSN)

The app works perfectly fine without Sentry configured. All Sentry code is wrapped in conditional checks.

### Test with Sentry

1. Create a Sentry account at https://sentry.io
2. Create a new Next.js project
3. Copy the DSN to your `.env` file
4. Restart the dev server
5. Trigger an error or submit feedback
6. Check your Sentry dashboard

## Build Verification

The implementation has been verified with:
```bash
npm run build
```

Build completed successfully with no type errors. Minor warning about `require-in-the-middle` is expected from Sentry's OpenTelemetry integration and does not affect functionality.

## Styling

The feedback button and modal use:
- Tailwind CSS utility classes
- Framer Motion for animations
- Existing UI component patterns (Button, styling)
- Dark theme matching the app's design system

## Future Enhancements

- [ ] Store feedback in database
- [ ] Admin dashboard to view/manage feedback
- [ ] Email notifications for bug reports
- [ ] Screenshot attachment support
- [ ] Feedback status tracking (new/in-progress/resolved)
- [ ] User authentication integration
- [ ] Rate limiting for feedback submissions
