"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNotificationStore } from "@/stores";

/**
 * NotificationProvider component that initializes WebSocket connection
 * and loads notifications when the user is authenticated.
 *
 * This should be included in authenticated pages to enable real-time notifications.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth(false);
  const { loadNotifications } = useNotificationStore();

  // Initialize WebSocket connection (handles auto-reconnect)
  useWebSocket();

  // Load initial notifications on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, loadNotifications]);

  return <>{children}</>;
}
