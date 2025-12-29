"use client";

import { motion } from "framer-motion";

interface StreakCounterProps {
  days: number;
}

export function StreakCounter({ days }: StreakCounterProps) {
  const isActive = days > 0;

  return (
    <motion.div
      className={`flex items-center gap-2 px-4 py-2 rounded-full ${
        isActive ? "bg-orange-500/20" : "bg-gray-500/20"
      }`}
      whileHover={{ scale: 1.05 }}
    >
      <motion.span
        className="text-2xl"
        animate={isActive ? { scale: [1, 1.2, 1] } : undefined}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        🔥
      </motion.span>
      <div>
        <span className={`font-bold ${isActive ? "text-orange-400" : "text-gray-400"}`}>
          {days}
        </span>
        <span className="text-sm text-gray-400 ml-1">
          day{days !== 1 ? "s" : ""}
        </span>
      </div>
    </motion.div>
  );
}
