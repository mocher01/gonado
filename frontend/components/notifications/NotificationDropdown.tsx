"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useNotificationStore } from "@/stores";
import { NotificationItem } from "./NotificationItem";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, markAsRead, loadNotifications } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(unreadNotifications.map((n) => markAsRead(n.id)));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      toast.error("Failed to mark all as read");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (id: string, read: boolean) => {
    if (!read) {
      await markAsRead(id);
    }
    onClose();
  };

  const displayNotifications = notifications.slice(0, 10);
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-full mt-2 w-96 bg-slate-800 rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-semibold">Notifications</h3>
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                disabled={isLoading}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {displayNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {displayNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification.id, notification.read)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="px-4 py-3 border-t border-white/10 text-center">
              <Link
                href="/notifications"
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
                onClick={onClose}
              >
                View all notifications
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
