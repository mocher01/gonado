"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Swap, SwapStatus } from "./SwapCard";

interface ActiveSwapsProps {
  userId: string;
  limit?: number;
  showHeader?: boolean;
  onSwapClick?: (swap: Swap) => void;
}

// Swap icon
const SwapIcon = () => (
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

// Status badge colors
const statusColors: Record<SwapStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" },
  accepted: { bg: "rgba(20, 184, 166, 0.15)", text: "#14b8a6", border: "rgba(20, 184, 166, 0.3)" },
  declined: { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
  cancelled: { bg: "rgba(100, 116, 139, 0.15)", text: "#94a3b8", border: "rgba(100, 116, 139, 0.3)" },
  completed: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e", border: "rgba(34, 197, 94, 0.3)" },
};

export function ActiveSwaps({
  userId,
  limit = 5,
  showHeader = true,
  onSwapClick,
}: ActiveSwapsProps) {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSwaps = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getMySwaps();
        // Filter to only active (accepted) swaps and limit
        const activeSwaps = (response.swaps || [])
          .filter((swap: Swap) => swap.status === "accepted")
          .slice(0, limit);
        setSwaps(activeSwaps);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load swaps";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSwaps();
  }, [userId, limit]);

  // Get partner info based on current user
  const getPartnerInfo = (swap: Swap) => {
    const isProposer = swap.proposer.id === userId;
    const partner = isProposer ? swap.receiver : swap.proposer;
    const partnerGoal = isProposer ? swap.receiver_goal : swap.proposer_goal;
    return { partner, partnerGoal };
  };

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <SwapIcon />
            <h3 className="text-lg font-semibold text-white">Active Swaps</h3>
          </div>
        )}
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg p-3"
              style={{ background: "rgba(15, 23, 42, 0.5)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-700 rounded w-24 mb-1" />
                  <div className="h-3 bg-slate-700 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <SwapIcon />
            <h3 className="text-lg font-semibold text-white">Active Swaps</h3>
          </div>
        )}
        <div
          className="p-3 rounded-lg text-center"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {showHeader && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SwapIcon />
              <h3 className="text-lg font-semibold text-white">Active Swaps</h3>
            </div>
            {swaps.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(20, 184, 166, 0.15)",
                  color: "#14b8a6",
                  border: "1px solid rgba(20, 184, 166, 0.3)",
                }}
              >
                {swaps.length}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        <AnimatePresence mode="wait">
          {swaps.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{
                  background: "rgba(20, 184, 166, 0.1)",
                  border: "1px solid rgba(20, 184, 166, 0.2)",
                }}
              >
                <SwapIcon />
              </div>
              <p className="text-sm text-slate-400 mb-1">No active swaps yet</p>
              <p className="text-xs text-slate-500">
                Start by proposing a swap to another user
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {swaps.map((swap, index) => {
                const { partner, partnerGoal } = getPartnerInfo(swap);
                const statusColor = statusColors[swap.status];

                return (
                  <motion.div
                    key={swap.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div
                      onClick={() => onSwapClick?.(swap)}
                      className={`rounded-lg p-3 transition-all duration-200 ${
                        onSwapClick ? "cursor-pointer hover:bg-white/5" : ""
                      }`}
                      style={{
                        background: "rgba(15, 23, 42, 0.5)",
                        border: "1px solid rgba(71, 85, 105, 0.2)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Partner Avatar */}
                        <div className="flex-shrink-0">
                          {partner.avatar_url ? (
                            <img
                              src={partner.avatar_url}
                              alt={partner.display_name || partner.username}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center font-semibold ring-2 ring-slate-700"
                              style={{
                                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                                color: "#94a3b8",
                              }}
                            >
                              {(partner.display_name || partner.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium text-white truncate">
                              {partner.display_name || partner.username}
                            </p>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                              style={{
                                background: statusColor.bg,
                                color: statusColor.text,
                                border: `1px solid ${statusColor.border}`,
                              }}
                            >
                              Active
                            </span>
                          </div>
                          {partnerGoal && (
                            <Link
                              href={`/goals/${partnerGoal.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-teal-400 hover:text-teal-300 truncate block transition-colors"
                            >
                              {partnerGoal.title}
                            </Link>
                          )}
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {formatRelativeTime(swap.created_at)}
                          </p>
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex-shrink-0 text-slate-500 group-hover:text-teal-400 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Compact version for sidebars
export function ActiveSwapsCompact({
  userId,
  limit = 3,
}: {
  userId: string;
  limit?: number;
}) {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSwaps = async () => {
      setIsLoading(true);
      try {
        const response = await api.getMySwaps();
        const activeSwaps = (response.swaps || [])
          .filter((swap: Swap) => swap.status === "accepted")
          .slice(0, limit);
        setSwaps(activeSwaps);
      } catch {
        // Silently fail for compact view
      } finally {
        setIsLoading(false);
      }
    };

    fetchSwaps();
  }, [userId, limit]);

  if (isLoading || swaps.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <SwapIcon />
      <span className="text-xs text-slate-400">
        {swaps.length} active swap{swaps.length !== 1 ? "s" : ""}
      </span>
      <div className="flex -space-x-2 ml-1">
        {swaps.slice(0, 3).map((swap) => {
          const isProposer = swap.proposer.id === userId;
          const partner = isProposer ? swap.receiver : swap.proposer;
          return partner.avatar_url ? (
            <img
              key={swap.id}
              src={partner.avatar_url}
              alt={partner.username}
              className="w-5 h-5 rounded-full ring-1 ring-slate-800"
            />
          ) : (
            <div
              key={swap.id}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold ring-1 ring-slate-800"
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                color: "#94a3b8",
              }}
            >
              {partner.username.charAt(0).toUpperCase()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
