"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * StruggleBadge - Needs Support Badge Component (Issue #68)
 * =========================================================
 *
 * Shows when a goal achiever is struggling based on detection signals:
 * - Mood set to "Struggling" or "Stuck" (owner-controlled)
 * - Multiple "mark-struggle" coaching reactions (3+)
 * - No progress for X days (default 7)
 * - High-difficulty node with long dwell time (>14 days)
 *
 * Displays a prominent badge to visitors with encouragement prompts.
 * Owner can see the badge but cannot dismiss auto-detected signals
 * (they can change their mood though).
 */

export interface StruggleStatus {
  goal_id: string;
  is_struggling: boolean;
  signals: string[];
  struggle_detected_at: string | null;
  mood_signal: boolean;
  reaction_signal: boolean;
  no_progress_signal: boolean;
  hard_node_signal: boolean;
  last_activity_at: string | null;
  days_since_progress: number | null;
  struggle_reactions_count: number;
}

interface StruggleBadgeProps {
  status: StruggleStatus | null;
  isOwner: boolean;
  onDismiss?: () => void;
  compact?: boolean;
}

// Signal descriptions for tooltip
const SIGNAL_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  mood: { icon: "\uD83D\uDE13", label: "Feeling stuck", color: "#eab308" },
  reactions: { icon: "\uD83C\uDFF4", label: "Community flagged", color: "#8b5cf6" },
  no_progress: { icon: "\u23F1\uFE0F", label: "No recent progress", color: "#f97316" },
  hard_node: { icon: "\uD83D\uDCAA", label: "Stuck on hard task", color: "#ef4444" },
};

export function StruggleBadge({
  status,
  isOwner,
  onDismiss,
  compact = false,
}: StruggleBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!status?.is_struggling) {
    return null;
  }

  // Parse active signals
  const activeSignals = status.signals.map((signal) => {
    const [type] = signal.split(":");
    return SIGNAL_LABELS[type] || { icon: "!", label: signal, color: "#94a3b8" };
  });

  // Compact badge for inline use
  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
        title="Needs Support"
        data-testid="struggle-badge-compact"
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-sm"
        >
          {"\uD83C\uDD98"}
        </motion.span>
        <span className="text-xs font-medium text-amber-400">Needs Support</span>
      </motion.div>
    );
  }

  // Full badge with details
  return (
    <div className="relative" data-testid="struggle-badge">
      {/* Main badge */}
      <motion.button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 transition-all hover:border-amber-500/50"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        data-testid="struggle-badge-trigger"
      >
        {/* Animated SOS icon */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-xl"
        >
          {"\uD83C\uDD98"}
        </motion.div>

        <div className="text-left">
          <div className="text-sm font-medium text-amber-400">Needs Support</div>
          <div className="text-xs text-amber-400/70 flex items-center gap-1">
            {activeSignals.slice(0, 2).map((s, i) => (
              <span key={i}>{s.icon}</span>
            ))}
            {activeSignals.length > 2 && (
              <span>+{activeSignals.length - 2}</span>
            )}
          </div>
        </div>

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-amber-400/60 transition-transform ${showDetails ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      {/* Details dropdown */}
      <AnimatePresence>
        {showDetails && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowDetails(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 z-50 p-4 rounded-xl bg-slate-800/95 backdrop-blur-lg border border-amber-500/20 shadow-2xl min-w-[280px]"
              data-testid="struggle-details"
            >
              <div className="flex items-start gap-3 mb-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-3xl"
                >
                  {"\uD83D\uDCA1"}
                </motion.div>
                <div>
                  <h3 className="font-semibold text-white">This traveler could use help!</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {isOwner
                      ? "Your journey is showing signs of difficulty"
                      : "Consider offering encouragement or guidance"}
                  </p>
                </div>
              </div>

              {/* Active signals list */}
              <div className="space-y-2 mb-4">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Detection Signals</div>
                {status.mood_signal && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20" data-testid="signal-mood">
                    <span className="text-lg">{"\uD83D\uDE13"}</span>
                    <span className="text-sm text-yellow-400">Owner set mood to struggling/stuck</span>
                  </div>
                )}
                {status.reaction_signal && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20" data-testid="signal-reactions">
                    <span className="text-lg">{"\uD83C\uDFF4"}</span>
                    <span className="text-sm text-purple-400">
                      {status.struggle_reactions_count} community members flagged struggle
                    </span>
                  </div>
                )}
                {status.no_progress_signal && status.days_since_progress && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20" data-testid="signal-no-progress">
                    <span className="text-lg">{"\u23F1\uFE0F"}</span>
                    <span className="text-sm text-orange-400">
                      No progress for {status.days_since_progress} days
                    </span>
                  </div>
                )}
                {status.hard_node_signal && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20" data-testid="signal-hard-node">
                    <span className="text-lg">{"\uD83D\uDCAA"}</span>
                    <span className="text-sm text-red-400">Stuck on a high-difficulty task</span>
                  </div>
                )}
              </div>

              {/* Help suggestions for visitors */}
              {!isOwner && (
                <div className="pt-3 border-t border-white/10">
                  <div className="text-xs text-slate-400 mb-2">Ways to help:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                      {"\uD83D\uDC4A"} Encourage
                    </span>
                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                      {"\uD83D\uDD26"} Light the Path
                    </span>
                    <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                      {"\uD83D\uDCAA"} Send Strength
                    </span>
                    <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                      {"\u26A1"} Sacred Boost
                    </span>
                  </div>
                </div>
              )}

              {/* Owner view - can only dismiss non-mood signals */}
              {isOwner && onDismiss && !status.mood_signal && (
                <div className="pt-3 border-t border-white/10">
                  <button
                    onClick={() => {
                      onDismiss();
                      setShowDetails(false);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm transition-colors"
                    data-testid="dismiss-struggle"
                  >
                    Dismiss this alert
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    This won't hide mood-based alerts. Change your mood to remove those.
                  </p>
                </div>
              )}

              {isOwner && status.mood_signal && (
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-slate-400 text-center">
                    {"\uD83D\uDCA1"} Change your mood indicator to remove this alert
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * StruggleSupportAlert - Prominent alert for visitors
 * Shows when viewing a goal that needs support
 */
export function StruggleSupportAlert({
  status,
  isOwner,
  ownerName,
}: {
  status: StruggleStatus | null;
  isOwner: boolean;
  ownerName?: string;
}) {
  if (!status?.is_struggling || isOwner) {
    return null;
  }

  const name = ownerName || "This traveler";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/25"
      data-testid="struggle-support-alert"
    >
      <div className="flex items-start gap-4">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="text-3xl flex-shrink-0"
        >
          {"\uD83D\uDC9B"}
        </motion.div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-400 mb-1">
            {name} could use your support!
          </h3>
          <p className="text-sm text-slate-300">
            {status.mood_signal
              ? "They've indicated they're struggling with this journey."
              : status.reaction_signal
              ? "The community has noticed they might need some help."
              : status.no_progress_signal
              ? `They haven't made progress in ${status.days_since_progress} days.`
              : "They're working on a challenging task for a while now."}
          </p>
          <p className="text-xs text-amber-400/70 mt-2">
            {"\uD83D\uDC4A"} Leave an encouraging reaction or comment to brighten their day!
          </p>
        </div>
      </div>
    </motion.div>
  );
}
