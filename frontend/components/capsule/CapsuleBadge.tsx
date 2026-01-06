"use client";

import { motion } from "framer-motion";

/**
 * CapsuleBadge - Time Capsule Count Badge (Issue #72)
 * ====================================================
 *
 * Small badge showing the number of time capsules on a node.
 * Can be placed on nodes in the quest map view.
 * Shows count and a capsule/envelope icon.
 */

interface CapsuleBadgeProps {
  count: number;
  hasLocked?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function CapsuleBadge({
  count,
  hasLocked = false,
  onClick,
  compact = false,
}: CapsuleBadgeProps) {
  if (count === 0) {
    return null;
  }

  const icon = hasLocked ? String.fromCodePoint(0x1F512) : String.fromCodePoint(0x1F48C); // 🔒 or 💌

  if (compact) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 hover:border-purple-400/50 transition-colors"
        onClick={onClick}
        title={`${count} time capsule${count !== 1 ? "s" : ""}`}
        data-testid="capsule-badge-compact"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-xs">{icon}</span>
        <span className="text-xs font-medium text-purple-300">{count}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-400/50 transition-colors"
      title={`${count} time capsule${count !== 1 ? "s" : ""}`}
      data-testid="capsule-badge"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className="text-sm"
        animate={hasLocked ? { rotate: [0, -5, 5, 0] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        {icon}
      </motion.span>
      <span className="text-sm font-medium text-purple-300">{count}</span>
      {hasLocked && (
        <motion.span
          className="text-xs text-purple-400/70"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          locked
        </motion.span>
      )}
    </motion.button>
  );
}
