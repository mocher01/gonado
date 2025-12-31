import type { User, Goal, Node, Update, AuthTokens, Notification, LeaderboardEntry } from "@/types";

// Use relative URL - requests proxied through Next.js rewrites to backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

class ApiClient {
  private accessToken: string | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
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

  // Nodes
  async getNode(id: string): Promise<Node> {
    return this.fetch<Node>(`/nodes/${id}`);
  }

  async updateNode(id: string, data: Partial<Node>): Promise<Node> {
    return this.fetch<Node>(`/nodes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async completeNode(id: string): Promise<Node> {
    return this.fetch<Node>(`/nodes/${id}/complete`, { method: "POST" });
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
    return this.fetch(`/interactions/reactions/${targetType}/${targetId}`);
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
  async giveSacredBoost(goalId: string): Promise<any> {
    return this.fetch(`/sacred-boosts/goals/${goalId}`, { method: "POST" });
  }

  async getGoalBoosts(goalId: string): Promise<any> {
    return this.fetch(`/sacred-boosts/goals/${goalId}`);
  }

  async getBoostStatus(): Promise<any> {
    return this.fetch("/sacred-boosts/status");
  }

  async checkCanBoost(goalId: string): Promise<any> {
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
}

export const api = new ApiClient();
