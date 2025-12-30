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
}

export const api = new ApiClient();
