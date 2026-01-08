"use client";

import { motion } from "framer-motion";
import { Notification } from "@/types";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
}

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case "follow":
      return "👥";
    case "reaction":
      return "⚡";
    case "comment":
      return "💬";
    case "boost":
      return "🌟";
    case "milestone":
      return "🏆";
    case "struggle":
      return "🆘";
    case "achievement":
      return "🎖️";
    case "swap_request":
      return "🔄";
    case "swap_accepted":
      return "✅";
    case "time_capsule":
      return "📦";
    default:
      return "🔔";
  }
};

const getRelativeTime = (date: string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-colors rounded-lg border-b border-white/5 last:border-0",
        !notification.read && "bg-amber-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm mb-1",
            notification.read ? "text-gray-400" : "text-white font-medium"
          )}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {notification.message}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-600">
              {getRelativeTime(notification.created_at)}
            </span>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
