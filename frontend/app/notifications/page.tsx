"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationStore } from "@/stores";
import { NotificationItem, NotificationProvider } from "@/components/notifications";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth(true);
  const { notifications, markAsRead, loadNotifications } = useNotificationStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(unreadNotifications.map((n) => markAsRead(n.id)));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = async (id: string, read: boolean) => {
    if (!read) {
      await markAsRead(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <NotificationProvider>
      <div className="min-h-screen p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          {hasUnread && (
            <Button variant="secondary" onClick={handleMarkAllRead} size="sm">
              Mark all read
            </Button>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white">Notifications</h1>
        <p className="text-gray-400 mt-1">
          Stay updated with your quest progress and community interactions
        </p>
      </motion.header>

      {/* Notifications List */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-3xl mx-auto"
      >
        <Card variant="glass">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-400 mb-6">
                When you get notifications, they'll appear here
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <NotificationItem
                    notification={notification}
                    onClick={() => handleNotificationClick(notification.id, notification.read)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </motion.section>
    </div>
    </NotificationProvider>
  );
}
