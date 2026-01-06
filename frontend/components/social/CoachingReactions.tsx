"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * CoachingReactions - Coaching & Celebration Reaction System (Issue #64)
 * =====================================================================
 *
 * 5 action-based reaction types aligned with Gonado's coaching philosophy:
 * - Encourage - "Keep going!" - General support
 * - Celebrate - "Amazing progress!" - Milestone recognition
 * - Light the Path - "Showing you the way" - Guidance/tips
 * - Send Strength - "Power boost!" - Energy for hard tasks
 * - Mark Struggle - "I see you struggling" - Triggers support
 */

export type CoachingReactionType =
  | "encourage"
  | "celebrate"
  | "light-path"
  | "send-strength"
  | "mark-struggle";

export interface CoachingReactionCounts {
  encourage: number;
  celebrate: number;
  light_path: number;
  send_strength: number;
  mark_struggle: number;
}

interface CoachingReactionsProps {
  targetType: "goal" | "node" | "update";
  targetId: string;
  reactions: CoachingReactionCounts;
  userReaction?: CoachingReactionType | null;
  onReact: (type: CoachingReactionType) => void;
  compact?: boolean;
  disabled?: boolean;
}

const REACTIONS: {
  type: CoachingReactionType;
  fieldName: keyof CoachingReactionCounts;
  emoji: string;
  label: string;
  description: string;
  color: string;
  glow: string;
}[] = [
  {
    type: "encourage",
    fieldName: "encourage",
    emoji: "\uD83D\uDC4A", // Fist bump
    label: "Encourage",
    description: "Keep going!",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.4)",
  },
  {
    type: "celebrate",
    fieldName: "celebrate",
    emoji: "\uD83C\uDF89", // Party popper
    label: "Celebrate",
    description: "Amazing progress!",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.4)",
  },
  {
    type: "light-path",
    fieldName: "light_path",
    emoji: "\uD83D\uDD26", // Flashlight
    label: "Light Path",
    description: "Showing you the way",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.4)",
  },
  {
    type: "send-strength",
    fieldName: "send_strength",
    emoji: "\uD83D\uDCAA", // Flexed bicep
    label: "Send Strength",
    description: "Power boost!",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.4)",
  },
  {
    type: "mark-struggle",
    fieldName: "mark_struggle",
    emoji: "\uD83C\uDFF4", // Black flag
    label: "Mark Struggle",
    description: "I see you struggling",
    color: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.4)",
  },
];

export function CoachingReactions({
  targetType,
  targetId,
  reactions,
  userReaction,
  onReact,
  compact = false,
  disabled = false,
}: CoachingReactionsProps) {
  const [hoveredReaction, setHoveredReaction] = useState<CoachingReactionType | null>(null);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  // Find dominant reaction
  const dominantReaction = REACTIONS.reduce((prev, curr) =>
    reactions[curr.fieldName] > reactions[prev.fieldName] ? curr : prev
  );
  const hasDominant = reactions[dominantReaction.fieldName] > 0;

  if (compact) {
    // Compact view: just show totals with dominant reaction glow
    return (
      <div
        className="flex items-center gap-1 text-sm"
        style={{
          color: hasDominant ? dominantReaction.color : "rgb(148, 163, 184)",
        }}
      >
        {REACTIONS.map(
          (r) =>
            reactions[r.fieldName] > 0 && (
              <span key={r.type} className="flex items-center">
                <span>{r.emoji}</span>
                <span className="ml-0.5 text-xs">{reactions[r.fieldName]}</span>
              </span>
            )
        )}
        {totalReactions === 0 && (
          <span className="text-slate-500 text-xs">No reactions yet</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Reaction bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-white/5"
      >
        {REACTIONS.map((r) => {
          const count = reactions[r.fieldName];
          const isSelected = userReaction === r.type;
          const isHovered = hoveredReaction === r.type;

          return (
            <motion.button
              key={r.type}
              data-testid={`reaction-${r.type}`}
              disabled={disabled}
              onClick={() => onReact(r.type)}
              onMouseEnter={() => setHoveredReaction(r.type)}
              onMouseLeave={() => setHoveredReaction(null)}
              className={`relative flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${r.color}20, ${r.color}10)`
                  : isHovered
                  ? "rgba(255, 255, 255, 0.05)"
                  : "transparent",
                boxShadow: isSelected ? `0 0 12px ${r.glow}` : "none",
                border: isSelected ? `1px solid ${r.color}40` : "1px solid transparent",
              }}
              whileHover={{ scale: disabled ? 1 : 1.05 }}
              whileTap={{ scale: disabled ? 1 : 0.95 }}
            >
              <motion.span
                className="text-lg"
                animate={{
                  scale: isSelected ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {r.emoji}
              </motion.span>
              {count > 0 && (
                <span
                  data-testid={`${r.type}-count`}
                  className="text-xs font-medium"
                  style={{ color: isSelected ? r.color : "rgb(148, 163, 184)" }}
                >
                  {count}
                </span>
              )}

              {/* Tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 whitespace-nowrap z-50"
                  >
                    <span className="text-xs font-medium text-white">{r.label}</span>
                    <p className="text-[10px] text-slate-400">{r.description}</p>
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: "4px solid transparent",
                        borderRight: "4px solid transparent",
                        borderTop: "4px solid rgb(15, 23, 42)",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Dominant reaction indicator */}
      {hasDominant && totalReactions >= 5 && (
        <div className="mt-2 text-center">
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              background: `${dominantReaction.color}15`,
              color: dominantReaction.color,
              border: `1px solid ${dominantReaction.color}30`,
            }}
          >
            {dominantReaction.emoji} {dominantReaction.label} dominant (
            {Math.round((reactions[dominantReaction.fieldName] / totalReactions) * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline version for node cards or inline displays
 * Can be read-only (onClick) or interactive (onReact)
 */
export function CoachingReactionsInline({
  reactions,
  onClick,
  userReaction,
  onReact,
  disabled = false,
}: {
  reactions: CoachingReactionCounts;
  onClick?: () => void;
  userReaction?: CoachingReactionType | null;
  onReact?: (type: CoachingReactionType) => void;
  disabled?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  // Interactive mode - show a small reaction picker
  if (onReact && !onClick) {
    const handleReact = (type: CoachingReactionType) => {
      onReact(type);
      setShowPicker(false);
    };

    return (
      <div className="relative flex items-center gap-1">
        {/* Current user reaction or picker trigger */}
        <button
          onClick={() => !disabled && setShowPicker(!showPicker)}
          disabled={disabled}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"
          }`}
        >
          {userReaction ? (
            <span className="text-lg">
              {REACTIONS.find((r) => r.type === userReaction)?.emoji}
            </span>
          ) : (
            <span className="text-slate-400 text-sm">React</span>
          )}
        </button>

        {/* Reaction counts */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-0.5">
            {REACTIONS.filter((r) => reactions[r.fieldName] > 0)
              .sort((a, b) => reactions[b.fieldName] - reactions[a.fieldName])
              .slice(0, 3)
              .map((r) => (
                <span key={r.type} className="text-xs">
                  {r.emoji}
                  {reactions[r.fieldName]}
                </span>
              ))}
          </div>
        )}

        {/* Picker dropdown */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full left-0 mb-2 flex gap-1 p-1.5 rounded-xl bg-slate-800 border border-white/10 shadow-xl z-50"
            >
              {REACTIONS.map((r) => (
                <motion.button
                  key={r.type}
                  data-testid={`reaction-${r.type}`}
                  onClick={() => handleReact(r.type)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`text-xl p-1 rounded-lg transition-colors ${
                    userReaction === r.type ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                  title={r.label}
                >
                  {r.emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Read-only mode with onClick
  if (totalReactions === 0) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
      >
        <span>React</span>
      </button>
    );
  }

  // Show top 3 reactions with counts
  const sorted = REACTIONS.filter((r) => reactions[r.fieldName] > 0)
    .sort((a, b) => reactions[b.fieldName] - reactions[a.fieldName])
    .slice(0, 3);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-0.5 text-sm hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
    >
      {sorted.map((r) => (
        <span key={r.type} className="flex items-center">
          <span>{r.emoji}</span>
          <span className="text-xs text-slate-400 ml-0.5">{reactions[r.fieldName]}</span>
        </span>
      ))}
    </button>
  );
}

/**
 * Helper to convert old elemental reactions to new coaching reactions
 * This is for backwards compatibility during migration
 */
export function convertElementalToCoaching(
  elemental: { fire?: number; water?: number; nature?: number; lightning?: number; magic?: number } | null
): CoachingReactionCounts {
  if (!elemental) {
    return {
      encourage: 0,
      celebrate: 0,
      light_path: 0,
      send_strength: 0,
      mark_struggle: 0,
    };
  }
  // Map old elemental reactions to new coaching reactions:
  // fire -> encourage (both are about energy/motivation)
  // lightning -> celebrate (both are about excitement)
  // water -> light_path (both are about guidance/calm)
  // nature -> send_strength (both are about growth/power)
  // magic -> mark_struggle (repurposed for support detection)
  return {
    encourage: elemental.fire || 0,
    celebrate: elemental.lightning || 0,
    light_path: elemental.water || 0,
    send_strength: elemental.nature || 0,
    mark_struggle: elemental.magic || 0,
  };
}
