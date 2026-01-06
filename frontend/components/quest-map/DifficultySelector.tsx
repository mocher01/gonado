"use client";

import { memo } from "react";
import { motion } from "framer-motion";

interface DifficultySelectorProps {
  value: number;
  onChange: (difficulty: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Moderate",
  3: "Medium",
  4: "Hard",
  5: "Very Hard",
};

const DIFFICULTY_COLORS: Record<number, { bg: string; text: string; glow: string }> = {
  1: { bg: "rgba(34, 197, 94, 0.2)", text: "text-green-400", glow: "rgba(34, 197, 94, 0.4)" },
  2: { bg: "rgba(132, 204, 22, 0.2)", text: "text-lime-400", glow: "rgba(132, 204, 22, 0.4)" },
  3: { bg: "rgba(251, 191, 36, 0.2)", text: "text-amber-400", glow: "rgba(251, 191, 36, 0.4)" },
  4: { bg: "rgba(249, 115, 22, 0.2)", text: "text-orange-400", glow: "rgba(249, 115, 22, 0.4)" },
  5: { bg: "rgba(239, 68, 68, 0.2)", text: "text-red-400", glow: "rgba(239, 68, 68, 0.4)" },
};

function DifficultySelectorComponent({ value, onChange, disabled = false, compact = false }: DifficultySelectorProps) {
  const colors = DIFFICULTY_COLORS[value] || DIFFICULTY_COLORS[3];

  return (
    <div className={`flex ${compact ? "gap-1" : "gap-2"} items-center`}>
      {[1, 2, 3, 4, 5].map((level) => {
        const isSelected = level <= value;
        const levelColors = DIFFICULTY_COLORS[level];

        return (
          <motion.button
            key={level}
            type="button"
            onClick={() => !disabled && onChange(level)}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.15 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            className={`
              relative flex items-center justify-center transition-all
              ${compact ? "w-6 h-6 text-sm" : "w-8 h-8 text-base"}
              rounded-lg border-2
              ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
              ${isSelected
                ? `${levelColors.text} border-current`
                : "text-slate-500 border-slate-600 hover:border-slate-400"
              }
            `}
            style={{
              background: isSelected ? levelColors.bg : "transparent",
              boxShadow: isSelected ? `0 0 12px ${levelColors.glow}` : "none",
            }}
            title={`Difficulty ${level}: ${DIFFICULTY_LABELS[level]}`}
            data-testid={`difficulty-${level}`}
          >
            <span className="font-bold">{level}</span>
          </motion.button>
        );
      })}

      {!compact && (
        <span className={`ml-2 text-sm font-medium ${colors.text}`}>
          {DIFFICULTY_LABELS[value]}
        </span>
      )}
    </div>
  );
}

export const DifficultySelector = memo(DifficultySelectorComponent);

/**
 * DifficultyIndicator - Display-only difficulty badge
 */
interface DifficultyIndicatorProps {
  value: number;
  compact?: boolean;
}

function DifficultyIndicatorComponent({ value, compact = false }: DifficultyIndicatorProps) {
  const colors = DIFFICULTY_COLORS[value] || DIFFICULTY_COLORS[3];
  const label = DIFFICULTY_LABELS[value] || "Medium";

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${colors.text}`}
        style={{ background: colors.bg }}
        title={`Difficulty: ${label}`}
        data-testid={`node-difficulty-${value}`}
      >
        {[...Array(value)].map((_, i) => (
          <span key={i} className="text-[10px]">*</span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${colors.text}`}
      style={{
        background: colors.bg,
        boxShadow: `0 0 8px ${colors.glow}`,
      }}
      data-testid={`node-difficulty-${value}`}
    >
      <span className="font-bold">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

export const DifficultyIndicator = memo(DifficultyIndicatorComponent);
