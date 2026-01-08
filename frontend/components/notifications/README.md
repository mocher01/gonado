# Notification Components

UI components for displaying and managing notifications in the Gonado application.

## Components

### NotificationBell
A bell icon button with an unread count badge. Clicking opens the notification dropdown.

**Usage:**
```tsx
import { NotificationBell } from "@/components/notifications";

<NotificationBell />
```

**Features:**
- Shows unread count badge
- Pulse animation for new notifications
- Opens dropdown on click

### NotificationDropdown
A dropdown panel showing recent notifications (max 10).

**Features:**
- Auto-loads notifications when opened
- Marks notifications as read on click
- "Mark all read" button
- "View all" link to full notifications page
- Closes when clicking outside

### NotificationItem
Displays a single notification with icon, title, message, and timestamp.

**Props:**
- `notification`: Notification object
- `onClick?`: Optional click handler

**Features:**
- Different icons based on notification type
- Visual distinction for unread notifications
- Relative timestamps (e.g., "5m ago")
- Hover animations

### NotificationProvider
Initializes WebSocket connection and loads notifications on mount.

**Usage:**
```tsx
import { NotificationProvider } from "@/components/notifications";

<NotificationProvider>
  {/* Your authenticated content */}
</NotificationProvider>
```

**Important:** Add this to any page that needs real-time notifications.

## Notification Types

The system supports various notification types with custom icons:

- `follow` - 👥 User followed you or your goal
- `reaction` - ⚡ Elemental reaction on your content
- `comment` - 💬 New comment
- `boost` - 🌟 Sacred Boost received
- `milestone` - 🏆 Milestone reached
- `struggle` - 🆘 Struggle detected
- `achievement` - 🎖️ Achievement unlocked
- `swap_request` - 🔄 Swap proposal
- `swap_accepted` - ✅ Swap accepted
- `time_capsule` - 📦 Time capsule unlocked
- Default - 🔔

## Data Flow

1. **WebSocket** (`useWebSocket`) receives real-time notifications
2. **Store** (`useNotificationStore`) manages notification state
3. **API** (`lib/api.ts`) provides REST endpoints for loading/marking read
4. **UI Components** render notifications with animations

## Styling

- Dark theme with slate-800 background
- Amber accent color (#F59E0B) for unread indicators
- Framer Motion animations
- Tailwind CSS utilities
- Responsive design

## Example Integration

```tsx
// In dashboard or authenticated page
import { NotificationBell, NotificationProvider } from "@/components/notifications";

export default function DashboardPage() {
  return (
    <NotificationProvider>
      <header>
        <nav>
          <NotificationBell />
        </nav>
      </header>
      {/* Rest of page */}
    </NotificationProvider>
  );
}
```

## Pages

### /notifications
Full notifications page showing all notifications with pagination support.

**Features:**
- Lists all notifications (not just recent 10)
- Mark all read button
- Back navigation
- Individual notification click handling
- Empty state with call-to-action
