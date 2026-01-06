"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

export type SwapStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

export interface SwapUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface SwapGoal {
  id: string;
  title: string;
  world_theme: string;
}

export interface Swap {
  id: string;
  proposer: SwapUser;
  receiver: SwapUser;
  proposer_goal: SwapGoal;
  receiver_goal: SwapGoal | null;
  status: SwapStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

interface SwapCardProps {
  swap: Swap;
  currentUserId: string;
  onAccept?: (swapId: string) => void;
  onDecline?: (swapId: string) => void;
  onCancel?: (swapId: string) => void;
  isLoading?: boolean;
}

// Status badge configuration
const statusConfig: Record<SwapStatus, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  pending: {
    label: "Pending",
    bgColor: "rgba(251, 191, 36, 0.15)",
    textColor: "#fbbf24",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  accepted: {
    label: "Active",
    bgColor: "rgba(20, 184, 166, 0.15)",
    textColor: "#14b8a6",
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
  declined: {
    label: "Declined",
    bgColor: "rgba(239, 68, 68, 0.15)",
    textColor: "#f87171",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  cancelled: {
    label: "Cancelled",
    bgColor: "rgba(100, 116, 139, 0.15)",
    textColor: "#94a3b8",
    borderColor: "rgba(100, 116, 139, 0.3)",
  },
  completed: {
    label: "Completed",
    bgColor: "rgba(34, 197, 94, 0.15)",
    textColor: "#22c55e",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
};

// Swap icon
const SwapArrowIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    className="text-teal-400"
  >
    <path
      d="M7 16V4M7 4L3 8M7 4L11 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 8V20M17 20L21 16M17 20L13 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// User avatar component
function UserAvatar({ user, size = "md" }: { user: SwapUser; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.display_name || user.username}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-slate-700`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold ring-2 ring-slate-700`}
      style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        color: "#94a3b8",
      }}
    >
      {(user.display_name || user.username).charAt(0).toUpperCase()}
    </div>
  );
}

export function SwapCard({
  swap,
  currentUserId,
  onAccept,
  onDecline,
  onCancel,
  isLoading = false,
}: SwapCardProps) {
  const [actionLoading, setActionLoading] = useState<"accept" | "decline" | "cancel" | null>(null);

  const isProposer = swap.proposer.id === currentUserId;
  const isReceiver = swap.receiver.id === currentUserId;
  const isPending = swap.status === "pending";
  const isActive = swap.status === "accepted";

  const partnerUser = isProposer ? swap.receiver : swap.proposer;
  const partnerGoal = isProposer ? swap.receiver_goal : swap.proposer_goal;
  const myGoal = isProposer ? swap.proposer_goal : swap.receiver_goal;

  const status = statusConfig[swap.status];

  const handleAction = async (action: "accept" | "decline" | "cancel") => {
    setActionLoading(action);
    try {
      if (action === "accept" && onAccept) {
        await onAccept(swap.id);
      } else if (action === "decline" && onDecline) {
        await onDecline(swap.id);
      } else if (action === "cancel" && onCancel) {
        await onCancel(swap.id);
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
      }}
    >
      {/* Header with status */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <SwapArrowIcon />
          <span className="text-sm font-medium text-slate-300">
            {isProposer ? "Swap Sent" : "Swap Received"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: status.bgColor,
              color: status.textColor,
              border: `1px solid ${status.borderColor}`,
            }}
          >
            {status.label}
          </span>
          <span className="text-xs text-slate-500">
            {formatRelativeTime(swap.created_at)}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Users and Goals */}
        <div className="flex items-center gap-4">
          {/* Proposer Side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar user={swap.proposer} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {swap.proposer.display_name || swap.proposer.username}
                </p>
                <p className="text-xs text-slate-500">@{swap.proposer.username}</p>
              </div>
            </div>
            {swap.proposer_goal && (
              <Link
                href={`/goals/${swap.proposer_goal.id}`}
                className="block p-2 rounded-lg transition-colors hover:bg-white/5"
                style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(71, 85, 105, 0.3)",
                }}
              >
                <p className="text-xs text-slate-400 mb-0.5">Offering:</p>
                <p className="text-sm text-teal-300 truncate font-medium">
                  {swap.proposer_goal.title}
                </p>
              </Link>
            )}
          </div>

          {/* Swap Arrow */}
          <div className="flex-shrink-0 px-2">
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(20, 184, 166, 0.1)",
                border: "1px solid rgba(20, 184, 166, 0.2)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-teal-400"
              >
                <path
                  d="M8 7L4 12L8 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 7L20 12L16 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </div>

          {/* Receiver Side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar user={swap.receiver} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {swap.receiver.display_name || swap.receiver.username}
                </p>
                <p className="text-xs text-slate-500">@{swap.receiver.username}</p>
              </div>
            </div>
            {swap.receiver_goal ? (
              <Link
                href={`/goals/${swap.receiver_goal.id}`}
                className="block p-2 rounded-lg transition-colors hover:bg-white/5"
                style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(71, 85, 105, 0.3)",
                }}
              >
                <p className="text-xs text-slate-400 mb-0.5">Offering:</p>
                <p className="text-sm text-teal-300 truncate font-medium">
                  {swap.receiver_goal.title}
                </p>
              </Link>
            ) : (
              <div
                className="p-2 rounded-lg"
                style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px dashed rgba(71, 85, 105, 0.4)",
                }}
              >
                <p className="text-xs text-slate-500 text-center">
                  {isPending ? "Awaiting selection..." : "No goal selected"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Message if present */}
        {swap.message && (
          <div
            className="mt-3 p-3 rounded-lg"
            style={{
              background: "rgba(15, 23, 42, 0.5)",
              border: "1px solid rgba(71, 85, 105, 0.2)",
            }}
          >
            <p className="text-xs text-slate-400 mb-1">Message:</p>
            <p className="text-sm text-slate-300 italic">&ldquo;{swap.message}&rdquo;</p>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="mt-4 flex items-center gap-2">
            {/* Receiver can accept/decline */}
            {isReceiver && (
              <>
                <motion.button
                  onClick={() => handleAction("accept")}
                  disabled={isLoading || !!actionLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
                    boxShadow: "0 4px 12px rgba(20, 184, 166, 0.3)",
                  }}
                >
                  {actionLoading === "accept" ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Accept
                    </>
                  )}
                </motion.button>
                <motion.button
                  onClick={() => handleAction("decline")}
                  disabled={isLoading || !!actionLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                  }}
                >
                  {actionLoading === "decline" ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full"
                    />
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Decline
                    </>
                  )}
                </motion.button>
              </>
            )}

            {/* Proposer can cancel */}
            {isProposer && (
              <motion.button
                onClick={() => handleAction("cancel")}
                disabled={isLoading || !!actionLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: "rgba(100, 116, 139, 0.2)",
                  border: "1px solid rgba(100, 116, 139, 0.3)",
                  color: "#94a3b8",
                }}
              >
                {actionLoading === "cancel" ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full"
                  />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Cancel Request
                  </>
                )}
              </motion.button>
            )}
          </div>
        )}

        {/* Active swap - link to partner's goal */}
        {isActive && partnerGoal && (
          <div className="mt-4">
            <Link
              href={`/goals/${partnerGoal.id}`}
              className="block w-full py-2.5 px-4 rounded-lg text-sm font-medium text-center transition-colors"
              style={{
                background: "rgba(20, 184, 166, 0.1)",
                border: "1px solid rgba(20, 184, 166, 0.2)",
                color: "#14b8a6",
              }}
            >
              View Partner&apos;s Goal
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
