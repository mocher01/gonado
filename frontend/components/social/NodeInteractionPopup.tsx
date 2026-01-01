"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * NodeInteractionPopup - Compact Mystic Cartographer Design
 * Optimized for minimal scrolling and maximum viewport compatibility
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
  { type: "fire", emoji: "\u{1F525}", color: "#f97316", glow: "rgba(249, 115, 22, 0.5)" },
  { type: "water", emoji: "\u{1F4A7}", color: "#06b6d4", glow: "rgba(6, 182, 212, 0.5)" },
  { type: "nature", emoji: "\u{1F33F}", color: "#22c55e", glow: "rgba(34, 197, 94, 0.5)" },
  { type: "lightning", emoji: "\u26A1", color: "#eab308", glow: "rgba(234, 179, 8, 0.5)" },
  { type: "magic", emoji: "\u2728", color: "#14b8a6", glow: "rgba(20, 184, 166, 0.5)" },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  completed: { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
  in_progress: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" },
  pending: { bg: "rgba(100, 116, 139, 0.15)", text: "#94a3b8", border: "rgba(100, 116, 139, 0.3)" },
  blocked: { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
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
  const pathname = usePathname();

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

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const statusStyle = STATUS_CONFIG[node.status] || STATUS_CONFIG.pending;
  const reactions = socialSummary?.reactions || { fire: 0, water: 0, nature: 0, lightning: 0, magic: 0 };
  const topComments = socialSummary?.top_comments || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{
              background: "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.7) 0%, rgba(2, 6, 23, 0.85) 100%)",
              backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
          />

          {/* Popup - Centered modal, compact design */}
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[340px] max-h-[85vh] overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)",
              borderRadius: "16px",
              border: "1px solid rgba(71, 85, 105, 0.3)",
              boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px -8px rgba(251, 191, 36, 0.08)",
            }}
          >
            {/* Top glow */}
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            {/* Header - Compact */}
            <div className="flex-shrink-0 px-4 pt-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
                      style={{ background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}
                    >
                      {node.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight line-clamp-2">{node.title}</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
              {/* Sign in banner - Compact */}
              {!isAuthenticated && (
                <Link
                  href={`/login?returnUrl=${encodeURIComponent(pathname)}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)",
                    border: "1px solid rgba(251, 191, 36, 0.25)",
                  }}
                >
                  <span className="text-amber-400 text-sm">🔑</span>
                  <span className="text-sm font-medium text-amber-200">Sign in to interact</span>
                  <svg className="w-3 h-3 text-amber-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}

              {/* Reactions - Inline compact */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Reactions</span>
                  {socialSummary && socialSummary.reactions_total > 0 && (
                    <span className="text-[10px] text-slate-500">{socialSummary.reactions_total}</span>
                  )}
                </div>
                <div
                  className="flex items-center gap-0.5 p-1 rounded-xl"
                  style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(51, 65, 85, 0.4)" }}
                >
                  {ELEMENTS.map((el) => {
                    const count = reactions[el.type as keyof typeof reactions];
                    const isSelected = userReaction === el.type;
                    return (
                      <motion.button
                        key={el.type}
                        disabled={!isAuthenticated}
                        onClick={() => onReact(el.type)}
                        className="flex-1 flex flex-col items-center py-1.5 rounded-lg transition-all"
                        style={{
                          background: isSelected ? `linear-gradient(135deg, ${el.color}15, ${el.color}08)` : "transparent",
                          boxShadow: isSelected ? `0 0 12px ${el.glow}` : "none",
                          border: isSelected ? `1px solid ${el.color}50` : "1px solid transparent",
                          cursor: isAuthenticated ? "pointer" : "not-allowed",
                          opacity: isAuthenticated ? 1 : 0.5,
                        }}
                        whileHover={isAuthenticated ? { scale: 1.1 } : {}}
                        whileTap={isAuthenticated ? { scale: 0.95 } : {}}
                      >
                        <span className="text-base leading-none">{el.emoji}</span>
                        <span className="text-[9px] font-bold mt-0.5" style={{ color: isSelected ? el.color : "#64748b" }}>
                          {count || "·"}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Comments - Compact */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Comments</span>
                  <span className="text-[10px] text-slate-500">{socialSummary?.comments_count || 0}</span>
                </div>

                {topComments.length > 0 && (
                  <div className="mb-2 p-2 rounded-lg bg-slate-800/30 border border-slate-700/20">
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      <span className="font-medium text-slate-300">{topComments[0].username}:</span> {topComments[0].content}
                    </p>
                    {topComments.length > 1 && (
                      <span className="text-[10px] text-slate-500 mt-1 block">+{topComments.length - 1} more</span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onViewAllComments}
                    className="flex-1 py-2 rounded-lg text-xs font-medium bg-slate-700/40 text-slate-300 hover:bg-slate-700/60 transition-colors"
                  >
                    View all
                  </button>
                  <button
                    onClick={onAddComment}
                    disabled={!isAuthenticated}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: isAuthenticated ? "rgba(20, 184, 166, 0.15)" : "rgba(51, 65, 85, 0.3)",
                      border: isAuthenticated ? "1px solid rgba(20, 184, 166, 0.3)" : "1px solid rgba(71, 85, 105, 0.2)",
                      color: isAuthenticated ? "#5eead4" : "#64748b",
                      cursor: isAuthenticated ? "pointer" : "not-allowed",
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Resources - Single line */}
              <button
                onClick={onDropResource}
                disabled={!isAuthenticated}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: isAuthenticated ? "rgba(16, 185, 129, 0.1)" : "rgba(51, 65, 85, 0.3)",
                  border: isAuthenticated ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(71, 85, 105, 0.2)",
                  color: isAuthenticated ? "#6ee7b7" : "#64748b",
                  cursor: isAuthenticated ? "pointer" : "not-allowed",
                }}
              >
                <span>📦</span>
                <span>Drop resource ({socialSummary?.resources_count || 0})</span>
              </button>

              {/* Sacred Boost */}
              {!isOwner && (
                <motion.button
                  onClick={onBoost}
                  disabled={!isAuthenticated}
                  whileHover={isAuthenticated ? { scale: 1.01 } : {}}
                  whileTap={isAuthenticated ? { scale: 0.99 } : {}}
                  className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                  style={{
                    background: isAuthenticated
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : "rgba(51, 65, 85, 0.4)",
                    boxShadow: isAuthenticated ? "0 4px 15px -4px rgba(245, 158, 11, 0.4)" : "none",
                    color: isAuthenticated ? "#fffbeb" : "#64748b",
                    cursor: isAuthenticated ? "pointer" : "not-allowed",
                  }}
                >
                  <span>⚡</span>
                  <span>Sacred Boost</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
