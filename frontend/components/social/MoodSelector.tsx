"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MoodType } from "@/types";

/**
 * MoodSelector - Goal Mood Indicator (Issue #67)
 * =============================================
 *
 * Allows goal owners to set their current mood:
 * - Motivated (fire emoji) - "I'm on fire!"
 * - Confident (flexed bicep) - "Feeling strong"
 * - Focused (target) - "In the zone"
 * - Struggling (sweat) - "Having a tough time"
 * - Stuck (brick) - "Need help getting unstuck"
 * - Celebrating (party) - "Celebrating progress!"
 *
 * "Struggling" or "Stuck" moods show a support message to visitors.
 */

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  color: string;
  glow: string;
  supportMessage?: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { type: "motivated", emoji: "\uD83D\uDD25", label: "Motivated", color: "#f97316", glow: "rgba(249, 115, 22, 0.4)" },
  { type: "confident", emoji: "\uD83D\uDCAA", label: "Confident", color: "#22c55e", glow: "rgba(34, 197, 94, 0.4)" },
  { type: "focused", emoji: "\uD83C\uDFAF", label: "Focused", color: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" },
  {
    type: "struggling",
    emoji: "\uD83D\uDE13",
    label: "Struggling",
    color: "#eab308",
    glow: "rgba(234, 179, 8, 0.4)",
    supportMessage: "This traveler could use some encouragement!"
  },
  {
    type: "stuck",
    emoji: "\uD83E\uDDF1",
    label: "Stuck",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.4)",
    supportMessage: "This traveler is stuck and needs help!"
  },
  { type: "celebrating", emoji: "\uD83C\uDF89", label: "Celebrating", color: "#a855f7", glow: "rgba(168, 85, 247, 0.4)" },
];

interface MoodSelectorProps {
  currentMood: MoodType | null;
  onMoodChange: (mood: MoodType | null) => void;
  isOwner: boolean;
  disabled?: boolean;
}

export function MoodSelector({
  currentMood,
  onMoodChange,
  isOwner,
  disabled = false,
}: MoodSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredMood, setHoveredMood] = useState<MoodType | null>(null);

  const currentMoodOption = currentMood ? MOOD_OPTIONS.find(m => m.type === currentMood) : null;

  const handleMoodSelect = (mood: MoodType) => {
    if (disabled) return;
    // Toggle off if same mood selected
    if (mood === currentMood) {
      onMoodChange(null);
    } else {
      onMoodChange(mood);
    }
    setShowPicker(false);
  };

  // If not owner and no mood set, don't show anything
  if (!isOwner && !currentMood) {
    return null;
  }

  // Read-only view for non-owners
  if (!isOwner && currentMoodOption) {
    return (
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${currentMoodOption.color}15, ${currentMoodOption.color}05)`,
            border: `1px solid ${currentMoodOption.color}30`,
            boxShadow: `0 0 12px ${currentMoodOption.glow}`,
          }}
        >
          <motion.span
            className="text-xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {currentMoodOption.emoji}
          </motion.span>
          <div>
            <span
              className="text-sm font-medium"
              style={{ color: currentMoodOption.color }}
            >
              {currentMoodOption.label}
            </span>
          </div>
        </motion.div>

        {/* Support message for struggling/stuck moods */}
        {currentMoodOption.supportMessage && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
          >
            <p className="text-xs text-amber-400 flex items-center gap-2">
              <span>💛</span>
              {currentMoodOption.supportMessage}
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  // Owner view with selector
  return (
    <div className="relative" data-testid="mood-selector">
      {/* Current mood display / trigger button */}
      <motion.button
        onClick={() => !disabled && setShowPicker(!showPicker)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{
          background: currentMoodOption
            ? `linear-gradient(135deg, ${currentMoodOption.color}15, ${currentMoodOption.color}05)`
            : "rgba(30, 41, 59, 0.5)",
          border: currentMoodOption
            ? `1px solid ${currentMoodOption.color}30`
            : "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: currentMoodOption ? `0 0 8px ${currentMoodOption.glow}` : "none",
        }}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        data-testid="mood-trigger"
      >
        {currentMoodOption ? (
          <>
            <span className="text-xl">{currentMoodOption.emoji}</span>
            <span
              className="text-sm font-medium"
              style={{ color: currentMoodOption.color }}
            >
              {currentMoodOption.label}
            </span>
          </>
        ) : (
          <>
            <span className="text-lg text-slate-400">😊</span>
            <span className="text-sm text-slate-400">Set mood</span>
          </>
        )}
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${showPicker ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      {/* Mood picker dropdown */}
      <AnimatePresence>
        {showPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />

            {/* Picker panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 z-50 p-3 rounded-xl bg-slate-800/95 backdrop-blur-lg border border-white/10 shadow-2xl min-w-[280px]"
              data-testid="mood-picker"
            >
              <div className="text-xs text-slate-400 mb-2 px-1">How are you feeling about this goal?</div>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const isSelected = currentMood === mood.type;
                  const isHovered = hoveredMood === mood.type;

                  return (
                    <motion.button
                      key={mood.type}
                      onClick={() => handleMoodSelect(mood.type)}
                      onMouseEnter={() => setHoveredMood(mood.type)}
                      onMouseLeave={() => setHoveredMood(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all`}
                      style={{
                        background: isSelected
                          ? `linear-gradient(135deg, ${mood.color}25, ${mood.color}10)`
                          : isHovered
                          ? "rgba(255, 255, 255, 0.05)"
                          : "transparent",
                        border: isSelected
                          ? `1px solid ${mood.color}40`
                          : "1px solid transparent",
                        boxShadow: isSelected ? `0 0 10px ${mood.glow}` : "none",
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid={`mood-option-${mood.type}`}
                    >
                      <motion.span
                        className="text-xl"
                        animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {mood.emoji}
                      </motion.span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: isSelected || isHovered ? mood.color : "rgb(203, 213, 225)" }}
                      >
                        {mood.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Clear mood option */}
              {currentMood && (
                <motion.button
                  onClick={() => {
                    onMoodChange(null);
                    setShowPicker(false);
                  }}
                  className="w-full mt-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.98 }}
                  data-testid="mood-clear"
                >
                  <span>Clear mood</span>
                </motion.button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * MoodBadge - Compact inline mood display for goal cards
 */
export function MoodBadge({ mood, size = "sm" }: { mood: MoodType | null; size?: "sm" | "md" }) {
  if (!mood) return null;

  const moodOption = MOOD_OPTIONS.find(m => m.type === mood);
  if (!moodOption) return null;

  const sizeClasses = size === "sm"
    ? "text-base px-1.5 py-0.5"
    : "text-lg px-2 py-1";

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 rounded-full ${sizeClasses}`}
      style={{
        background: `${moodOption.color}15`,
        border: `1px solid ${moodOption.color}30`,
      }}
      title={moodOption.label}
      data-testid="mood-badge"
    >
      <span>{moodOption.emoji}</span>
      {size === "md" && (
        <span
          className="text-xs font-medium"
          style={{ color: moodOption.color }}
        >
          {moodOption.label}
        </span>
      )}
    </motion.div>
  );
}

/**
 * MoodSupportAlert - Shows encouragement message for struggling/stuck goals
 */
export function MoodSupportAlert({ mood }: { mood: MoodType | null }) {
  if (!mood) return null;

  const moodOption = MOOD_OPTIONS.find(m => m.type === mood);
  if (!moodOption?.supportMessage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20"
    >
      <div className="flex items-center gap-3">
        <motion.span
          className="text-2xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {moodOption.emoji}
        </motion.span>
        <div>
          <p className="text-sm font-medium text-amber-400">
            {moodOption.supportMessage}
          </p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Consider leaving an encouraging comment or reaction!
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export { MOOD_OPTIONS };
export type { MoodOption };
