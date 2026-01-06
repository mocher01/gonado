import type { User, Goal, Node, Update, AuthTokens, Notification, LeaderboardEntry, CanInteractResponse, NodeWithDependencies, DependencyType } from "@/types";

// Use relative URL - requests proxied through Next.js rewrites to backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

class ApiClient {
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  private onTokensRefreshed: ((accessToken: string, refreshToken: string) => void) | null = null;
  private onSessionExpired: (() => void) | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  setRefreshToken(token: string | null) {
    this.refreshTokenValue = token;
  }

  setTokenRefreshCallback(callback: (accessToken: string, refreshToken: string) => void) {
    this.onTokensRefreshed = callback;
  }

  setSessionExpiredCallback(callback: () => void) {
    this.onSessionExpired = callback;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (!this.refreshTokenValue) {
      return false;
    }

    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: this.refreshTokenValue }),
        });

        if (!response.ok) {
          return false;
        }

        const tokens = await response.json();
        this.accessToken = tokens.access_token;
        this.refreshTokenValue = tokens.refresh_token;

        if (this.onTokensRefreshed) {
          this.onTokensRefreshed(tokens.access_token, tokens.refresh_token);
        }

        return true;
      } catch {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}/api${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && !isRetry && !endpoint.includes('/auth/')) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the request with new token
        return this.fetch<T>(endpoint, options, true);
      } else {
        // Refresh failed - session expired
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
        throw new Error("Session expired. Please login again.");
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      let message = `HTTP ${response.status}`;
      if (error.detail) {
        if (typeof error.detail === 'string') {
          message = error.detail;
        } else if (Array.isArray(error.detail)) {
          // FastAPI validation errors
          message = error.detail.map((e: { msg?: string; loc?: string[] }) =>
            e.msg || JSON.stringify(e)
          ).join(', ');
        } else {
          message = JSON.stringify(error.detail);
        }
      }
      throw new Error(message);
    }

    return response.json();
  }

  // Auth
  async register(data: { email: string; password: string; username: string; display_name?: string }): Promise<User> {
    return this.fetch<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    return this.fetch<AuthTokens>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return this.fetch<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  // Users
  async getCurrentUser(): Promise<User> {
    return this.fetch<User>("/users/me");
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.fetch<User>("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getUserByUsername(username: string): Promise<User> {
    return this.fetch<User>(`/users/${username}`);
  }

  // Goals
  async createGoal(data: Partial<Goal>): Promise<Goal> {
    return this.fetch<Goal>("/goals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getGoals(params?: { user_id?: string; category?: string; status?: string }): Promise<{ goals: Goal[]; total: number }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.fetch(`/goals${query ? `?${query}` : ""}`);
  }

  async getGoal(id: string): Promise<Goal> {
    return this.fetch<Goal>(`/goals/${id}`);
  }

  async updateGoal(id: string, data: Partial<Goal>): Promise<Goal> {
    return this.fetch<Goal>(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(id: string): Promise<void> {
    await this.fetch(`/goals/${id}`, { method: "DELETE" });
  }

  async generatePlan(goalId: string): Promise<{ world_theme: string; nodes: Partial<Node>[] }> {
    return this.fetch(`/goals/${goalId}/generate-plan`, { method: "POST" });
  }

  async getGoalNodes(goalId: string): Promise<Node[]> {
    return this.fetch<Node[]>(`/goals/${goalId}/nodes`);
  }

  // Mood Indicators (Issue #67)
  async updateGoalMood(goalId: string, mood: string): Promise<Goal> {
    return this.fetch<Goal>(`/goals/${goalId}/mood`, {
      method: "PUT",
      body: JSON.stringify({ mood }),
    });
  }

  async clearGoalMood(goalId: string): Promise<Goal> {
    return this.fetch<Goal>(`/goals/${goalId}/mood`, {
      method: "DELETE",
    });
  }

  // Nodes
  async getNode(id: string): Promise<Node> {
    return this.fetch<Node>(`/nodes/${id}`);
  }

  async createNode(goalId: string, data: {
    title: string;
    description?: string;
    order: number;
    node_type?: "task" | "milestone" | "parallel_start" | "parallel_end";
    estimated_duration?: number;
    position_x?: number;
    position_y?: number;
  }): Promise<Node> {
    return this.fetch<Node>(`/goals/${goalId}/nodes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateNode(id: string, data: Partial<Node>): Promise<Node> {
    return this.fetch<Node>(`/nodes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteNode(id: string): Promise<void> {
    await this.fetch(`/nodes/${id}`, { method: "DELETE" });
  }

  async updateNodePosition(id: string, position_x: number, position_y: number): Promise<Node> {
    return this.fetch<Node>(`/nodes/${id}/position`, {
      method: "PATCH",
      body: JSON.stringify({ position_x, position_y }),
    });
  }

  async completeNode(id: string): Promise<Node> {
    return this.fetch<Node>(`/nodes/${id}/complete`, { method: "POST" });
  }

  // Node Dependencies (Issue #63)
  async canInteractWithNode(nodeId: string): Promise<CanInteractResponse> {
    return this.fetch<CanInteractResponse>(`/nodes/${nodeId}/can-interact`);
  }

  async getNodeWithDependencies(nodeId: string): Promise<NodeWithDependencies> {
    return this.fetch<NodeWithDependencies>(`/nodes/${nodeId}/with-dependencies`);
  }

  async getGoalFlow(goalId: string): Promise<NodeWithDependencies[]> {
    return this.fetch<NodeWithDependencies[]>(`/nodes/goal/${goalId}/flow`);
  }

  async addNodeDependency(nodeId: string, dependsOnId: string, dependencyType: DependencyType = "finish_to_start"): Promise<any> {
    return this.fetch(`/nodes/${nodeId}/dependencies`, {
      method: "POST",
      body: JSON.stringify({ depends_on_id: dependsOnId, dependency_type: dependencyType }),
    });
  }

  async removeNodeDependency(nodeId: string, dependsOnId: string): Promise<void> {
    await this.fetch(`/nodes/${nodeId}/dependencies/${dependsOnId}`, { method: "DELETE" });
  }

  async updateChecklistItem(nodeId: string, itemId: string, completed: boolean): Promise<Node> {
    return this.fetch<Node>(`/nodes/${nodeId}/checklist`, {
      method: "PUT",
      body: JSON.stringify({ item_id: itemId, completed }),
    });
  }

  // Updates
  async createUpdate(nodeId: string, data: { content: string; media_urls?: string[]; update_type?: string }): Promise<Update> {
    return this.fetch<Update>(`/updates/nodes/${nodeId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getNodeUpdates(nodeId: string): Promise<Update[]> {
    return this.fetch<Update[]>(`/updates/nodes/${nodeId}`);
  }

  // Gamification
  async getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    return this.fetch<LeaderboardEntry[]>(`/gamification/leaderboard${limit ? `?limit=${limit}` : ""}`);
  }

  async getMyStats(): Promise<{ xp: number; level: number; streak_days: number }> {
    return this.fetch("/gamification/stats");
  }

  // Notifications
  async getNotifications(unreadOnly?: boolean): Promise<Notification[]> {
    return this.fetch<Notification[]>(`/notifications${unreadOnly ? "?unread_only=true" : ""}`);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.fetch(`/notifications/${id}/read`, { method: "PUT" });
  }

  // Discovery
  async getTrendingGoals(): Promise<Goal[]> {
    return this.fetch<Goal[]>("/discovery/trending");
  }

  async getGoalsNeedingHelp(): Promise<Goal[]> {
    return this.fetch<Goal[]>("/discovery/needs-help");
  }

  // Queue - AI Goal Generation
  async submitGoalToQueue(goalText: string): Promise<{
    queue_id: string;
    status: string;
    message: string;
    position: number;
  }> {
    return this.fetch("/queue/submit", {
      method: "POST",
      body: JSON.stringify({ goal_text: goalText }),
    });
  }

  async getQueueStatus(queueId: string): Promise<{
    queue_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    goal_text: string;
    goal_id: string | null;
    error_message: string | null;
    created_at: string;
    processing_started_at: string | null;
    completed_at: string | null;
    estimated_wait_seconds: number | null;
  }> {
    return this.fetch(`/queue/status/${queueId}`);
  }

  // Chat - Conversational Goal Creation
  async startConversation(): Promise<{
    id: string;
    status: string;
    goal_id: string | null;
    created_at: string;
    updated_at: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      sequence: number;
      created_at: string;
    }>;
  }> {
    return this.fetch("/chat/start", { method: "POST" });
  }

  async getCurrentConversation(): Promise<{
    id: string;
    status: string;
    goal_id: string | null;
    created_at: string;
    updated_at: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      sequence: number;
      created_at: string;
    }>;
  } | null> {
    return this.fetch("/chat/current");
  }

  async sendChatMessage(conversationId: string, content: string): Promise<{
    id: string;
    role: string;
    content: string;
    sequence: number;
    created_at: string;
  }> {
    return this.fetch(`/chat/${conversationId}/send`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async getChatMessages(conversationId: string, sinceSequence: number = 0): Promise<Array<{
    id: string;
    role: string;
    content: string;
    sequence: number;
    created_at: string;
  }>> {
    return this.fetch(`/chat/${conversationId}/messages?since_sequence=${sinceSequence}`);
  }

  async getConversation(conversationId: string): Promise<{
    id: string;
    status: string;
    goal_id: string | null;
    created_at: string;
    updated_at: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      sequence: number;
      created_at: string;
    }>;
  } | null> {
    try {
      return await this.fetch(`/chat/${conversationId}`);
    } catch {
      return null;
    }
  }

  async abandonConversation(conversationId: string): Promise<{ status: string }> {
    return this.fetch(`/chat/${conversationId}/abandon`, { method: "POST" });
  }

  // ============================================
  // SOCIAL FEATURES
  // ============================================

  // Follows
  async followTarget(followType: "user" | "goal", targetId: string): Promise<any> {
    return this.fetch("/follows", {
      method: "POST",
      body: JSON.stringify({ follow_type: followType, target_id: targetId }),
    });
  }

  async unfollowTarget(followType: "user" | "goal", targetId: string): Promise<void> {
    await this.fetch(`/follows/${followType}/${targetId}`, { method: "DELETE" });
  }

  async getGoalFollowers(goalId: string): Promise<any> {
    return this.fetch(`/follows/goals/${goalId}/followers`);
  }

  /**
   * Get fellow travelers (followers) of a goal for display on the quest map.
   * Issue #66: Fellow Travelers / Progress Visualization
   * Returns the most recent followers with a limit of 10 for performance.
   */
  async getGoalTravelers(goalId: string, limit: number = 10): Promise<{
    travelers: Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      followed_at: string;
    }>;
    total_count: number;
    has_more: boolean;
  }> {
    return this.fetch(`/goals/${goalId}/travelers?limit=${Math.min(limit, 10)}`);
  }

  async checkFollowStatus(followType: "user" | "goal", targetId: string): Promise<{ is_following: boolean }> {
    return this.fetch(`/follows/check/${followType}/${targetId}`);
  }

  // Reactions (Elemental)
  async addReaction(targetType: "goal" | "node" | "update", targetId: string, reactionType: string): Promise<any> {
    return this.fetch("/interactions/reactions", {
      method: "POST",
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reaction_type: reactionType }),
    });
  }

  async removeReaction(targetType: "goal" | "node" | "update", targetId: string): Promise<void> {
    await this.fetch(`/interactions/reactions/${targetType}/${targetId}`, { method: "DELETE" });
  }

  async getReactions(targetType: "goal" | "node" | "update", targetId: string): Promise<any> {
    return this.fetch(`/interactions/reactions/${targetType}/${targetId}/summary`);
  }

  // Comments
  async addComment(targetType: "goal" | "node" | "update", targetId: string, content: string, parentId?: string): Promise<any> {
    return this.fetch("/comments", {
      method: "POST",
      body: JSON.stringify({ target_type: targetType, target_id: targetId, content, parent_id: parentId }),
    });
  }

  async getComments(targetType: "goal" | "node" | "update", targetId: string): Promise<any> {
    return this.fetch(`/comments/${targetType}/${targetId}`);
  }

  // Batch endpoint for trail markers - get comments for all nodes in a goal
  async getGoalNodesComments(goalId: string, limit: number = 3): Promise<{
    goal_id: string;
    nodes: Record<string, {
      node_id: string;
      comments_count: number;
      recent_comments: Array<{
        id: string;
        user_id: string;
        content: string;
        created_at: string;
        is_edited: boolean;
        user: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
        };
        replies: Array<{
          id: string;
          user_id: string;
          content: string;
          created_at: string;
          is_edited: boolean;
          user: {
            id: string;
            username: string;
            display_name: string | null;
            avatar_url: string | null;
          };
        }>;
      }>;
      has_more: boolean;
    }>;
  }> {
    return this.fetch(`/comments/goal/${goalId}/nodes?limit=${limit}`);
  }

  // Activity Feed
  async getActivityFeed(limit?: number, offset?: number): Promise<any> {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    return this.fetch(`/activity/feed${params.toString() ? `?${params}` : ""}`);
  }

  async getGoalActivity(goalId: string): Promise<any> {
    return this.fetch(`/activity/goal/${goalId}`);
  }

  // Sacred Boosts
  async giveSacredBoost(goalId: string, message?: string): Promise<any> {
    return this.fetch(`/sacred-boosts/goals/${goalId}`, {
      method: "POST",
      body: JSON.stringify({ message: message || null }),
    });
  }

  async getGoalBoosts(goalId: string): Promise<{
    boosts: Array<{
      id: string;
      giver_id: string;
      receiver_id: string;
      goal_id: string;
      message: string | null;
      xp_awarded: number;
      created_at: string;
      giver_username: string | null;
      giver_display_name: string | null;
      giver_avatar_url: string | null;
    }>;
    total: number;
  }> {
    return this.fetch(`/sacred-boosts/goals/${goalId}`);
  }

  async getBoostStatus(): Promise<{
    boosts_remaining_today: number;
    boosts_given_today: number;
    max_boosts_per_day: number;
    boosts_received_total: number;
    already_boosted_goal: boolean;
  }> {
    return this.fetch("/sacred-boosts/status");
  }

  async checkCanBoost(goalId: string): Promise<{
    can_boost: boolean;
    boosts_today_for_goal: number;
    boosts_remaining_for_goal: number;
    total_boosts_today: number;
    max_per_day: number;
    reason: string | null;
  }> {
    return this.fetch(`/sacred-boosts/check/${goalId}`);
  }

  // Prophecies
  async makeProphecy(goalId: string, predictedDate: string): Promise<any> {
    return this.fetch(`/prophecies/goals/${goalId}`, {
      method: "POST",
      body: JSON.stringify({ goal_id: goalId, predicted_date: predictedDate }),
    });
  }

  async getProphecyBoard(goalId: string): Promise<any> {
    return this.fetch(`/prophecies/goals/${goalId}`);
  }

  // Resource Drops
  async dropResource(nodeId: string, message?: string, resources?: any[]): Promise<any> {
    return this.fetch(`/resource-drops/nodes/${nodeId}`, {
      method: "POST",
      body: JSON.stringify({ node_id: nodeId, message, resources }),
    });
  }

  async getNodeDrops(nodeId: string): Promise<any> {
    return this.fetch(`/resource-drops/nodes/${nodeId}`);
  }

  async openDrop(dropId: string): Promise<any> {
    return this.fetch(`/resource-drops/${dropId}/open`, { method: "POST" });
  }

  async getGoalResourceSummary(goalId: string): Promise<any> {
    return this.fetch(`/resource-drops/goals/${goalId}/summary`);
  }

  // Time Capsules
  async buryTimeCapsule(goalId: string, message: string, triggerType: string, triggerValue?: string): Promise<any> {
    return this.fetch(`/time-capsules/goals/${goalId}`, {
      method: "POST",
      body: JSON.stringify({ goal_id: goalId, message, trigger_type: triggerType, trigger_value: triggerValue }),
    });
  }

  async getGoalCapsules(goalId: string): Promise<any> {
    return this.fetch(`/time-capsules/goals/${goalId}`);
  }

  async openCapsule(capsuleId: string): Promise<any> {
    return this.fetch(`/time-capsules/${capsuleId}/open`, { method: "POST" });
  }

  // User Stats
  async getUserStats(userId: string): Promise<any> {
    return this.fetch(`/user-stats/${userId}/stats`);
  }

  async getUserReputation(userId: string): Promise<any> {
    return this.fetch(`/user-stats/${userId}/reputation`);
  }

  // Node Social Summaries
  async getNodeSocialSummary(nodeId: string): Promise<{
    reaction_counts: { fire: number; water: number; nature: number; lightning: number; magic: number };
    total_reactions: number;
    comment_count: number;
    user_reaction: string | null;
    recent_reactors: Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      reaction_type: string;
    }>;
  }> {
    return this.fetch(`/nodes/${nodeId}/social-summary`);
  }

  async getGoalNodesSocialSummary(goalId: string): Promise<{
    nodes: Record<string, {
      reaction_counts: { fire: number; water: number; nature: number; lightning: number; magic: number };
      total_reactions: number;
      comment_count: number;
    }>;
  }> {
    return this.fetch(`/nodes/goal/${goalId}/social-summary`);
  }

  // Struggle Detection (Issue #68)
  async getStruggleStatus(goalId: string): Promise<{
    goal_id: string;
    is_struggling: boolean;
    signals: string[];
    struggle_detected_at: string | null;
    mood_signal: boolean;
    reaction_signal: boolean;
    no_progress_signal: boolean;
    hard_node_signal: boolean;
    last_activity_at: string | null;
    days_since_progress: number | null;
    struggle_reactions_count: number;
  }> {
    return this.fetch(`/goals/${goalId}/struggle-status`);
  }

  async dismissStruggleAlert(goalId: string): Promise<Goal> {
    return this.fetch<Goal>(`/goals/${goalId}/dismiss-struggle`, {
      method: "POST",
    });
  }

  // ============================================
  // SWAP FEATURE
  // ============================================

  /**
   * Propose a swap to another user.
   * The proposer offers one of their goals for an accountability partnership.
   */
  async proposeSwap(
    receiverId: string,
    proposerGoalId: string,
    message?: string
  ): Promise<{
    id: string;
    proposer_id: string;
    receiver_id: string;
    proposer_goal_id: string;
    receiver_goal_id: string | null;
    status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
    message: string | null;
    created_at: string;
    updated_at: string;
  }> {
    return this.fetch("/swaps", {
      method: "POST",
      body: JSON.stringify({
        receiver_id: receiverId,
        proposer_goal_id: proposerGoalId,
        message: message || null,
      }),
    });
  }

  /**
   * Get all swaps for the current user (both sent and received).
   * Returns swaps in all statuses: pending, accepted, declined, cancelled, completed.
   */
  async getMySwaps(): Promise<{
    swaps: Array<{
      id: string;
      proposer: {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      };
      receiver: {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      };
      proposer_goal: {
        id: string;
        title: string;
        world_theme: string;
      };
      receiver_goal: {
        id: string;
        title: string;
        world_theme: string;
      } | null;
      status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
      message: string | null;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
  }> {
    return this.fetch("/swaps");
  }

  /**
   * Accept a swap proposal.
   * The receiver must select one of their goals to offer in return.
   */
  async acceptSwap(
    swapId: string,
    receiverGoalId: string
  ): Promise<{
    id: string;
    status: "accepted";
    receiver_goal_id: string;
    updated_at: string;
  }> {
    return this.fetch(`/swaps/${swapId}/accept`, {
      method: "POST",
      body: JSON.stringify({ receiver_goal_id: receiverGoalId }),
    });
  }

  /**
   * Decline a swap proposal.
   * Only the receiver can decline a pending swap.
   */
  async declineSwap(swapId: string): Promise<{
    id: string;
    status: "declined";
    updated_at: string;
  }> {
    return this.fetch(`/swaps/${swapId}/decline`, {
      method: "POST",
    });
  }

  /**
   * Cancel a swap proposal.
   * Only the proposer can cancel a pending swap they sent.
   */
  async cancelSwap(swapId: string): Promise<{
    id: string;
    status: "cancelled";
    updated_at: string;
  }> {
    return this.fetch(`/swaps/${swapId}/cancel`, {
      method: "POST",
    });
  }
}

export const api = new ApiClient();
