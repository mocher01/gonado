"use client";

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: string;
}

class Analytics {
  private enabled: boolean;
  private isDevelopment: boolean;

  constructor() {
    this.enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  /**
   * Track a custom event
   * @param event - Event name (e.g., "goal_created", "node_completed")
   * @param properties - Additional event properties
   */
  track(event: string, properties?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    const eventData: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        referrer: typeof window !== "undefined" ? document.referrer : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      },
      timestamp: new Date().toISOString(),
    };

    if (this.isDevelopment) {
      // Log to console in development
      console.log("[Analytics]", eventData);
    } else {
      // Send to API in production
      this.sendToAPI(eventData);
    }
  }

  /**
   * Track a page view
   * @param name - Page name or path
   */
  page(name: string): void {
    this.track("page_view", { page: name });
  }

  /**
   * Track goal creation
   * @param goalId - The created goal ID
   * @param goalTitle - The goal title
   */
  goalCreated(goalId: string, goalTitle: string): void {
    this.track("goal_created", { goal_id: goalId, goal_title: goalTitle });
  }

  /**
   * Track node completion
   * @param nodeId - The completed node ID
   * @param goalId - The parent goal ID
   */
  nodeCompleted(nodeId: string, goalId: string): void {
    this.track("node_completed", { node_id: nodeId, goal_id: goalId });
  }

  /**
   * Track user registration
   * @param userId - The new user ID
   * @param username - The username
   */
  userRegistered(userId: string, username: string): void {
    this.track("user_registered", { user_id: userId, username });
  }

  /**
   * Track user login
   * @param userId - The logged in user ID
   */
  userLoggedIn(userId: string): void {
    this.track("user_logged_in", { user_id: userId });
  }

  /**
   * Send event data to the analytics API endpoint
   */
  private sendToAPI(eventData: AnalyticsEvent): void {
    if (typeof window === "undefined") {
      return;
    }

    // Use sendBeacon for reliability (fires even if user navigates away)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(eventData)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/analytics", blob);
    } else {
      // Fallback to fetch with keepalive
      fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
        keepalive: true,
      }).catch((error) => {
        console.error("Analytics error:", error);
      });
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();
