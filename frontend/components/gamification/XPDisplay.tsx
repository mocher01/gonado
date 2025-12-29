"use client";

import { motion } from "framer-motion";
import { getXpForNextLevel } from "@/lib/utils";

interface XPDisplayProps {
  xp: number;
  level: number;
  showProgress?: boolean;
}

export function XPDisplay({ xp, level, showProgress = true }: XPDisplayProps) {
  const nextLevelXp = getXpForNextLevel(level);
  const prevLevelXp = level > 1 ? getXpForNextLevel(level - 1) : 0;
  const progress = ((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;

  return (
    <div className="flex items-center gap-3">
      {/* Level badge */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{level}</span>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full w-5 h-5 flex items-center justify-center">
          <span className="text-xs">⭐</span>
        </div>
      </motion.div>

      {/* XP info */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-300">Level {level}</span>
          <span className="text-sm text-gray-400">
            {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
          </span>
        </div>

        {showProgress && (
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
