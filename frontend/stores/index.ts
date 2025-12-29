import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Goal, Node, Notification } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => {
        api.setToken(accessToken);
        set({ accessToken, refreshToken });
      },
      logout: () => {
        api.setToken(null);
        set({ user: null, accessToken: null, refreshToken: null });
      },
      initialize: async () => {
        const { accessToken } = get();
        if (accessToken) {
          api.setToken(accessToken);
          try {
            const user = await api.getCurrentUser();
            set({ user, isLoading: false });
          } catch {
            set({ user: null, accessToken: null, refreshToken: null, isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "gonado-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

interface GoalState {
  currentGoal: Goal | null;
  currentNodes: Node[];
  setCurrentGoal: (goal: Goal | null) => void;
  setCurrentNodes: (nodes: Node[]) => void;
  loadGoal: (goalId: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set) => ({
  currentGoal: null,
  currentNodes: [],
  setCurrentGoal: (goal) => set({ currentGoal: goal }),
  setCurrentNodes: (nodes) => set({ currentNodes: nodes }),
  loadGoal: async (goalId) => {
    const [goal, nodes] = await Promise.all([
      api.getGoal(goalId),
      api.getGoalNodes(goalId),
    ]);
    set({ currentGoal: goal, currentNodes: nodes });
  },
}));

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  loadNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),
  markAsRead: async (id) => {
    await api.markNotificationRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  loadNotifications: async () => {
    const notifications = await api.getNotifications();
    get().setNotifications(notifications);
  },
}));
