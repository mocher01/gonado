"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ElementalReactions - Unique 5-Element Reaction System
 * =====================================================
 *
 * Instead of generic likes, we use 5 elemental reactions:
 * 🔥 Fire      - "You're on fire, keep going!"
 * 💧 Water     - "Stay cool, pace yourself"
 * 🌿 Nature    - "Growing beautifully"
 * ⚡ Lightning - "Fast progress!"
 * ✨ Magic     - "This inspired me"
 */

export type ElementType = "fire" | "water" | "nature" | "lightning" | "magic";

interface ReactionCounts {
  fire: number;
  water: number;
  nature: number;
  lightning: number;
  magic: number;
}

interface ElementalReactionsProps {
  targetType: "goal" | "node" | "update";
  targetId: string;
  reactions: ReactionCounts;
  userReaction?: ElementType | null;
  onReact: (element: ElementType) => void;
  compact?: boolean;
  disabled?: boolean;
}

const ELEMENTS: { type: ElementType; emoji: string; label: string; color: string; glow: string }[] = [
  { type: "fire", emoji: "🔥", label: "On fire!", color: "#f97316", glow: "rgba(249, 115, 22, 0.4)" },
  { type: "water", emoji: "💧", label: "Stay cool", color: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" },
  { type: "nature", emoji: "🌿", label: "Growing", color: "#22c55e", glow: "rgba(34, 197, 94, 0.4)" },
  { type: "lightning", emoji: "⚡", label: "Fast!", color: "#eab308", glow: "rgba(234, 179, 8, 0.4)" },
  { type: "magic", emoji: "✨", label: "Inspired", color: "#a855f7", glow: "rgba(168, 85, 247, 0.4)" },
];

export function ElementalReactions({
  targetType,
  targetId,
  reactions,
  userReaction,
  onReact,
  compact = false,
  disabled = false,
}: ElementalReactionsProps) {
  const [hoveredElement, setHoveredElement] = useState<ElementType | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  // Find dominant element
  const dominantElement = ELEMENTS.reduce((prev, curr) =>
    reactions[curr.type] > reactions[prev.type] ? curr : prev
  );
  const hasDominant = reactions[dominantElement.type] > 0;

  if (compact) {
    // Compact view: just show totals with dominant element glow
    return (
      <div
        className="flex items-center gap-1 text-sm"
        style={{
          color: hasDominant ? dominantElement.color : "rgb(148, 163, 184)",
        }}
      >
        {ELEMENTS.map((el) => (
          reactions[el.type] > 0 && (
            <span key={el.type} className="flex items-center">
              <span>{el.emoji}</span>
              <span className="ml-0.5 text-xs">{reactions[el.type]}</span>
            </span>
          )
        ))}
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
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {ELEMENTS.map((el) => {
          const count = reactions[el.type];
          const isSelected = userReaction === el.type;
          const isHovered = hoveredElement === el.type;

          return (
            <motion.button
              key={el.type}
              disabled={disabled}
              onClick={() => onReact(el.type)}
              onMouseEnter={() => setHoveredElement(el.type)}
              onMouseLeave={() => setHoveredElement(null)}
              className={`relative flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${el.color}20, ${el.color}10)`
                  : isHovered
                  ? "rgba(255, 255, 255, 0.05)"
                  : "transparent",
                boxShadow: isSelected ? `0 0 12px ${el.glow}` : "none",
                border: isSelected ? `1px solid ${el.color}40` : "1px solid transparent",
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
                {el.emoji}
              </motion.span>
              {count > 0 && (
                <span
                  className="text-xs font-medium"
                  style={{ color: isSelected ? el.color : "rgb(148, 163, 184)" }}
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
                    <span className="text-xs text-white">{el.label}</span>
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

      {/* Dominant element aura indicator */}
      {hasDominant && totalReactions >= 5 && (
        <div className="mt-2 text-center">
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              background: `${dominantElement.color}15`,
              color: dominantElement.color,
              border: `1px solid ${dominantElement.color}30`,
            }}
          >
            {dominantElement.emoji} {dominantElement.label} dominant ({Math.round((reactions[dominantElement.type] / totalReactions) * 100)}%)
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
export function ElementalReactionsInline({
  reactions,
  onClick,
  userReaction,
  onReact,
  disabled = false,
}: {
  reactions: ReactionCounts;
  onClick?: () => void;
  userReaction?: ElementType | null;
  onReact?: (element: ElementType) => void;
  disabled?: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  // Interactive mode - show a small reaction picker
  if (onReact && !onClick) {
    const handleReact = (el: ElementType) => {
      onReact(el);
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
              {ELEMENTS.find(e => e.type === userReaction)?.emoji}
            </span>
          ) : (
            <span className="text-slate-400 text-sm">React ✨</span>
          )}
        </button>

        {/* Reaction counts */}
        {totalReactions > 0 && (
          <div className="flex items-center gap-0.5">
            {ELEMENTS.filter(el => reactions[el.type] > 0)
              .sort((a, b) => reactions[b.type] - reactions[a.type])
              .slice(0, 3)
              .map(el => (
                <span key={el.type} className="text-xs">
                  {el.emoji}{reactions[el.type]}
                </span>
              ))
            }
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
              {ELEMENTS.map(el => (
                <motion.button
                  key={el.type}
                  onClick={() => handleReact(el.type)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`text-xl p-1 rounded-lg transition-colors ${
                    userReaction === el.type
                      ? "bg-white/20"
                      : "hover:bg-white/10"
                  }`}
                  title={el.label}
                >
                  {el.emoji}
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
        <span>✨</span>
        <span>React</span>
      </button>
    );
  }

  // Show top 3 elements with counts
  const sorted = ELEMENTS.filter((el) => reactions[el.type] > 0)
    .sort((a, b) => reactions[b.type] - reactions[a.type])
    .slice(0, 3);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-0.5 text-sm hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
    >
      {sorted.map((el) => (
        <span key={el.type} className="flex items-center">
          <span>{el.emoji}</span>
          <span className="text-xs text-slate-400 ml-0.5">{reactions[el.type]}</span>
        </span>
      ))}
    </button>
  );
}
