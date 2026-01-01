"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

/**
 * NodeInteractionPopup - Quick Interaction Popup for Quest Map Nodes
 * ==================================================================
 *
 * Appears when a user clicks on a node in the quest map, providing
 * quick access to social interactions like reactions, comments, and resources.
 */

interface NodeInteractionPopupProps {
  node: { id: string; title: string; status: string; description?: string };
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  isOwner: boolean;
  isAuthenticated: boolean;
  socialSummary: {
    reactions: { fire: number; water: number; nature: number; lightning: number; magic: number };
    reactions_total: number;
    comments_count: number;
    resources_count: number;
    top_comments: Array<{ id: string; username: string; content: string; reply_count: number }>;
  } | null;
  userReaction: string | null;
  onReact: (type: string) => void;
  onViewAllComments: () => void;
  onAddComment: () => void;
  onDropResource: () => void;
  onBoost: () => void;
}

const ELEMENTS = [
  { type: "fire", emoji: "\u{1F525}", label: "On fire!", color: "#f97316", glow: "rgba(249, 115, 22, 0.4)" },
  { type: "water", emoji: "\u{1F4A7}", label: "Stay cool", color: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" },
  { type: "nature", emoji: "\u{1F33F}", label: "Growing", color: "#22c55e", glow: "rgba(34, 197, 94, 0.4)" },
  { type: "lightning", emoji: "\u26A1", label: "Fast!", color: "#eab308", glow: "rgba(234, 179, 8, 0.4)" },
  { type: "magic", emoji: "\u2728", label: "Inspired", color: "#a855f7", glow: "rgba(168, 85, 247, 0.4)" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  completed: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  in_progress: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  pending: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30" },
  blocked: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
};

export function NodeInteractionPopup({
  node,
  isOpen,
  onClose,
  position,
  isOwner,
  isAuthenticated,
  socialSummary,
  userReaction,
  onReact,
  onViewAllComments,
  onAddComment,
  onDropResource,
  onBoost,
}: NodeInteractionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const statusStyle = STATUS_COLORS[node.status] || STATUS_COLORS.pending;
  const reactions = socialSummary?.reactions || { fire: 0, water: 0, nature: 0, lightning: 0, magic: 0 };
  const topComments = socialSummary?.top_comments || [];

  // Calculate safe position for desktop (avoid going off-screen)
  const safeX = typeof window !== "undefined" ? Math.min(position.x, window.innerWidth - 360) : position.x;
  const safeY = typeof window !== "undefined" ? Math.min(position.y, window.innerHeight - 500) : position.y;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile: centered modal with backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
            onClick={onClose}
          />

          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-50 w-[90vw] max-w-sm rounded-2xl bg-slate-800 border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:left-auto md:top-auto md:translate-x-0 md:translate-y-0"
            style={{
              // Desktop: positioned near node
              ...(typeof window !== "undefined" && window.innerWidth >= 768
                ? { left: safeX, top: safeY }
                : {}),
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-slate-800/80">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white truncate">{node.title}</h3>
                  {node.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{node.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
                  >
                    {node.status.replace("_", " ")}
                  </span>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Sign in banner for anonymous users */}
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="block p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-center hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
                >
                  <p className="text-sm text-amber-300 font-medium">
                    🔐 Sign in to interact with this node →
                  </p>
                </Link>
              )}

              {/* Reactions Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Reactions
                  </h4>
                  {socialSummary && socialSummary.reactions_total > 0 && (
                    <span className="text-xs text-slate-500">
                      {socialSummary.reactions_total} total
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/50 border border-white/5">
                  {ELEMENTS.map((el) => {
                    const count = reactions[el.type as keyof typeof reactions];
                    const isSelected = userReaction === el.type;

                    return (
                      <motion.button
                        key={el.type}
                        disabled={!isAuthenticated}
                        onClick={() => onReact(el.type)}
                        className={`relative flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all flex-1 justify-center ${
                          !isAuthenticated ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        }`}
                        style={{
                          background: isSelected
                            ? `linear-gradient(135deg, ${el.color}20, ${el.color}10)`
                            : "transparent",
                          boxShadow: isSelected ? `0 0 12px ${el.glow}` : "none",
                          border: isSelected ? `1px solid ${el.color}40` : "1px solid transparent",
                        }}
                        whileHover={isAuthenticated ? { scale: 1.05 } : {}}
                        whileTap={isAuthenticated ? { scale: 0.95 } : {}}
                        title={el.label}
                      >
                        <span className="text-lg">{el.emoji}</span>
                        {count > 0 && (
                          <span
                            className="text-xs font-medium"
                            style={{ color: isSelected ? el.color : "rgb(148, 163, 184)" }}
                          >
                            {count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Trail Markers
                  </h4>
                  <span className="text-xs text-slate-500">
                    {socialSummary?.comments_count || 0} comments
                  </span>
                </div>

                {/* Top comments preview */}
                {topComments.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {topComments.slice(0, 3).map((comment) => (
                      <div
                        key={comment.id}
                        className="p-2 rounded-lg bg-slate-900/50 border border-white/5"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-slate-300">
                            {comment.username}
                          </span>
                          {comment.reply_count > 0 && (
                            <span className="text-xs text-slate-500">
                              +{comment.reply_count} replies
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mb-3">No trail markers yet. Be the first!</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onViewAllComments}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-700/50 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                  >
                    View all
                  </button>
                  <button
                    onClick={onAddComment}
                    disabled={!isAuthenticated}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      isAuthenticated
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                        : "bg-slate-700/30 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    Add comment
                  </button>
                </div>
              </div>

              {/* Resources Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Resources
                  </h4>
                  <span className="text-xs text-slate-500">
                    {socialSummary?.resources_count || 0} dropped
                  </span>
                </div>
                <button
                  onClick={onDropResource}
                  disabled={!isAuthenticated}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    isAuthenticated
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                      : "bg-slate-700/30 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>{"\u{1F4E6}"}</span>
                  <span>Drop a resource</span>
                </button>
              </div>

              {/* Sacred Boost (only for non-owners) */}
              {!isOwner && (
                <div>
                  <motion.button
                    onClick={onBoost}
                    disabled={!isAuthenticated}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      isAuthenticated
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600"
                        : "bg-slate-700/30 text-slate-500 cursor-not-allowed"
                    }`}
                    whileHover={isAuthenticated ? { scale: 1.02 } : {}}
                    whileTap={isAuthenticated ? { scale: 0.98 } : {}}
                  >
                    <span>{"\u26A1"}</span>
                    <span>Give Sacred Boost</span>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
