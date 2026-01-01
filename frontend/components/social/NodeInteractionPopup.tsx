"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * NodeInteractionPopup - Mystic Cartographer Design
 * ==================================================
 * Adventure-themed popup for interacting with quest map nodes.
 * Features torchlight glow effects and parchment-inspired textures.
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
  { type: "fire", emoji: "\u{1F525}", label: "On fire!", color: "#f97316", glow: "rgba(249, 115, 22, 0.5)" },
  { type: "water", emoji: "\u{1F4A7}", label: "Stay cool", color: "#06b6d4", glow: "rgba(6, 182, 212, 0.5)" },
  { type: "nature", emoji: "\u{1F33F}", label: "Growing", color: "#22c55e", glow: "rgba(34, 197, 94, 0.5)" },
  { type: "lightning", emoji: "\u26A1", label: "Fast!", color: "#eab308", glow: "rgba(234, 179, 8, 0.5)" },
  { type: "magic", emoji: "\u2728", label: "Inspired", color: "#14b8a6", glow: "rgba(20, 184, 166, 0.5)" },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  completed: {
    bg: "rgba(16, 185, 129, 0.15)",
    text: "#34d399",
    border: "rgba(16, 185, 129, 0.3)",
    icon: "M5 13l4 4L19 7"
  },
  in_progress: {
    bg: "rgba(251, 191, 36, 0.15)",
    text: "#fbbf24",
    border: "rgba(251, 191, 36, 0.3)",
    icon: "M13 10V3L4 14h7v7l9-11h-7z"
  },
  pending: {
    bg: "rgba(100, 116, 139, 0.15)",
    text: "#94a3b8",
    border: "rgba(100, 116, 139, 0.3)",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  blocked: {
    bg: "rgba(239, 68, 68, 0.15)",
    text: "#f87171",
    border: "rgba(239, 68, 68, 0.3)",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
  },
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
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const statusStyle = STATUS_CONFIG[node.status] || STATUS_CONFIG.pending;
  const reactions = socialSummary?.reactions || { fire: 0, water: 0, nature: 0, lightning: 0, magic: 0 };
  const topComments = socialSummary?.top_comments || [];

  const safeX = typeof window !== "undefined" ? Math.min(position.x, window.innerWidth - 380) : position.x;
  const safeY = typeof window !== "undefined" ? Math.min(position.y, window.innerHeight - 550) : position.y;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:bg-transparent"
            style={{
              background: "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.7) 0%, rgba(2, 6, 23, 0.85) 100%)",
              backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed z-50 w-[92vw] max-w-[360px] overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:left-auto md:top-auto md:translate-x-0 md:translate-y-0"
            style={{
              ...(typeof window !== "undefined" && window.innerWidth >= 768
                ? { left: safeX, top: safeY }
                : {}),
              background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 50%, rgba(8, 12, 28, 1) 100%)",
              borderRadius: "20px",
              border: "1px solid rgba(71, 85, 105, 0.3)",
              boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px -8px rgba(251, 191, 36, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Top glow accent */}
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            {/* Subtle grain texture */}
            <div
              className="absolute inset-0 rounded-[20px] opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* Header */}
            <div className="relative px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: statusStyle.bg,
                        color: statusStyle.text,
                        border: `1px solid ${statusStyle.border}`,
                      }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={statusStyle.icon} />
                      </svg>
                      {node.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-lg font-bold leading-tight text-transparent bg-clip-text"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)",
                    }}
                  >
                    {node.title}
                  </h3>

                  {node.description && (
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {node.description}
                    </p>
                  )}
                </div>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />

            {/* Content */}
            <div className="relative p-5 space-y-5">
              {/* Sign in banner */}
              {!isAuthenticated && (
                <Link
                  href={`/login?returnUrl=${encodeURIComponent(pathname)}`}
                  className="block relative overflow-hidden rounded-xl transition-all group"
                  style={{
                    background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)",
                    border: "1px solid rgba(251, 191, 36, 0.25)",
                  }}
                >
                  <div className="relative px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-200">Join the expedition</p>
                      <p className="text-[10px] text-amber-400/70">Sign in to interact with this waypoint</p>
                    </div>
                    <svg className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )}

              {/* Elemental Reactions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center">
                      <span className="text-xs">✨</span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Elemental Energy
                    </h4>
                  </div>
                  {socialSummary && socialSummary.reactions_total > 0 && (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                      {socialSummary.reactions_total} total
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center gap-1 p-1.5 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)",
                    border: "1px solid rgba(51, 65, 85, 0.4)",
                  }}
                >
                  {ELEMENTS.map((el) => {
                    const count = reactions[el.type as keyof typeof reactions];
                    const isSelected = userReaction === el.type;

                    return (
                      <motion.button
                        key={el.type}
                        disabled={!isAuthenticated}
                        onClick={() => onReact(el.type)}
                        className="relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all"
                        style={{
                          background: isSelected
                            ? `linear-gradient(135deg, ${el.color}15, ${el.color}08)`
                            : "transparent",
                          boxShadow: isSelected ? `0 0 20px ${el.glow}` : "none",
                          border: isSelected ? `1px solid ${el.color}50` : "1px solid transparent",
                          cursor: isAuthenticated ? "pointer" : "not-allowed",
                          opacity: isAuthenticated ? 1 : 0.5,
                        }}
                        whileHover={isAuthenticated ? { scale: 1.08, y: -2 } : {}}
                        whileTap={isAuthenticated ? { scale: 0.95 } : {}}
                        title={el.label}
                      >
                        <span className="text-xl leading-none">{el.emoji}</span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: isSelected ? el.color : "rgb(100, 116, 139)" }}
                        >
                          {count || "·"}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Trail Markers (Comments) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                      </svg>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Trail Markers
                    </h4>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                    {socialSummary?.comments_count || 0}
                  </span>
                </div>

                {/* Comments preview */}
                {topComments.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {topComments.slice(0, 2).map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 rounded-xl transition-colors"
                        style={{
                          background: "linear-gradient(135deg, rgba(51, 65, 85, 0.3) 0%, rgba(30, 41, 59, 0.3) 100%)",
                          border: "1px solid rgba(71, 85, 105, 0.2)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-300">{comment.username}</span>
                          {comment.reply_count > 0 && (
                            <span className="text-[10px] text-slate-500">+{comment.reply_count}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mb-3 italic">No markers yet. Be the first explorer!</p>
                )}

                <div className="flex gap-2">
                  <motion.button
                    onClick={onViewAllComments}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: "linear-gradient(135deg, rgba(51, 65, 85, 0.5) 0%, rgba(71, 85, 105, 0.3) 100%)",
                      border: "1px solid rgba(100, 116, 139, 0.3)",
                      color: "#cbd5e1",
                    }}
                  >
                    View all
                  </motion.button>
                  <motion.button
                    onClick={onAddComment}
                    disabled={!isAuthenticated}
                    whileHover={isAuthenticated ? { scale: 1.02 } : {}}
                    whileTap={isAuthenticated ? { scale: 0.98 } : {}}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: isAuthenticated
                        ? "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)"
                        : "rgba(51, 65, 85, 0.3)",
                      border: isAuthenticated ? "1px solid rgba(20, 184, 166, 0.3)" : "1px solid rgba(71, 85, 105, 0.2)",
                      color: isAuthenticated ? "#5eead4" : "#64748b",
                      cursor: isAuthenticated ? "pointer" : "not-allowed",
                    }}
                  >
                    + Add marker
                  </motion.button>
                </div>
              </div>

              {/* Resources */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400/20 to-green-500/20 flex items-center justify-center">
                      <span className="text-xs">📦</span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Supply Cache
                    </h4>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full">
                    {socialSummary?.resources_count || 0} dropped
                  </span>
                </div>

                <motion.button
                  onClick={onDropResource}
                  disabled={!isAuthenticated}
                  whileHover={isAuthenticated ? { scale: 1.01 } : {}}
                  whileTap={isAuthenticated ? { scale: 0.99 } : {}}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: isAuthenticated
                      ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)"
                      : "rgba(51, 65, 85, 0.3)",
                    border: isAuthenticated ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(71, 85, 105, 0.2)",
                    color: isAuthenticated ? "#6ee7b7" : "#64748b",
                    cursor: isAuthenticated ? "pointer" : "not-allowed",
                  }}
                >
                  <span>📦</span>
                  <span>Drop a resource</span>
                </motion.button>
              </div>

              {/* Sacred Boost */}
              {!isOwner && (
                <motion.button
                  onClick={onBoost}
                  disabled={!isAuthenticated}
                  whileHover={isAuthenticated ? { scale: 1.02 } : {}}
                  whileTap={isAuthenticated ? { scale: 0.98 } : {}}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 relative overflow-hidden group"
                  style={{
                    background: isAuthenticated
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)"
                      : "rgba(51, 65, 85, 0.4)",
                    boxShadow: isAuthenticated
                      ? "0 4px 20px -4px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
                      : "none",
                    color: isAuthenticated ? "#fffbeb" : "#64748b",
                    cursor: isAuthenticated ? "pointer" : "not-allowed",
                  }}
                >
                  {/* Animated shimmer */}
                  {isAuthenticated && (
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                      }}
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span>Grant Sacred Boost</span>
                  </span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
