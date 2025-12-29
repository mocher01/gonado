"use client";

import { motion } from "framer-motion";
import type { Node } from "@/types";

interface QuestMapProps {
  nodes: Node[];
  worldTheme: string;
  onNodeClick?: (node: Node) => void;
  onCompleteNode?: (nodeId: string) => void;
}

const THEME_CONFIGS: Record<string, { bg: string; accent: string; icon: string; gradient: string }> = {
  mountain: {
    bg: "from-slate-900 via-stone-800 to-slate-900",
    accent: "from-amber-500 to-orange-600",
    icon: "🏔️",
    gradient: "from-stone-700/50 to-stone-900/50"
  },
  ocean: {
    bg: "from-slate-900 via-cyan-900 to-slate-900",
    accent: "from-cyan-400 to-blue-600",
    icon: "🌊",
    gradient: "from-cyan-800/50 to-blue-900/50"
  },
  forest: {
    bg: "from-slate-900 via-emerald-900 to-slate-900",
    accent: "from-emerald-400 to-green-600",
    icon: "🌲",
    gradient: "from-emerald-800/50 to-green-900/50"
  },
  desert: {
    bg: "from-slate-900 via-amber-900 to-slate-900",
    accent: "from-yellow-400 to-amber-600",
    icon: "🏜️",
    gradient: "from-amber-800/50 to-orange-900/50"
  },
  space: {
    bg: "from-slate-900 via-purple-900 to-slate-900",
    accent: "from-violet-400 to-purple-600",
    icon: "🚀",
    gradient: "from-purple-800/50 to-violet-900/50"
  },
  city: {
    bg: "from-slate-900 via-zinc-800 to-slate-900",
    accent: "from-sky-400 to-indigo-600",
    icon: "🏙️",
    gradient: "from-zinc-700/50 to-slate-900/50"
  },
};

export function QuestMap({ nodes, worldTheme, onNodeClick, onCompleteNode }: QuestMapProps) {
  const theme = THEME_CONFIGS[worldTheme] || THEME_CONFIGS.mountain;
  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
  const completedCount = nodes.filter(n => n.status === "completed").length;
  const progress = nodes.length > 0 ? (completedCount / nodes.length) * 100 : 0;

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${theme.bg} p-8`}>
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 text-6xl opacity-10">{theme.icon}</div>
        <div className="absolute bottom-10 right-10 text-8xl opacity-10">{theme.icon}</div>
        <div className="absolute top-1/2 left-1/4 text-4xl opacity-5">{theme.icon}</div>
        {/* Stars for space theme */}
        {worldTheme === "space" && (
          <>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 2 + Math.random() * 2, repeat: Infinity }}
              />
            ))}
          </>
        )}
      </div>

      {/* Header */}
      <div className="relative mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{theme.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white">Your Quest</h3>
              <p className="text-gray-400 text-sm">{completedCount} of {nodes.length} milestones completed</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {Math.round(progress)}%
            </div>
            <div className="text-gray-500 text-sm">Complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${theme.accent}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Quest Path */}
      <div className="relative">
        {/* Connection line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: `${sortedNodes.length * 120}px` }}>
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>
          </defs>
          {sortedNodes.map((node, index) => {
            if (index === sortedNodes.length - 1) return null;
            const startX = index % 2 === 0 ? 60 : 340;
            const endX = (index + 1) % 2 === 0 ? 60 : 340;
            const startY = 60 + index * 120;
            const endY = 60 + (index + 1) * 120;
            const midY = (startY + endY) / 2;

            return (
              <motion.path
                key={`path-${index}`}
                d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="3"
                strokeDasharray="8 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        <div className="relative" style={{ minHeight: `${sortedNodes.length * 120}px` }}>
          {sortedNodes.map((node, index) => {
            const isLeft = index % 2 === 0;
            const isCompleted = node.status === "completed";
            const isActive = node.status === "active";
            const isLocked = node.status === "locked";

            return (
              <motion.div
                key={node.id}
                className={`absolute ${isLeft ? "left-0" : "right-0"} w-80`}
                style={{ top: `${index * 120}px` }}
                initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className={`relative p-4 rounded-xl border backdrop-blur-sm cursor-pointer transition-all duration-300 ${
                    isCompleted
                      ? `bg-gradient-to-r ${theme.gradient} border-green-500/50 shadow-lg shadow-green-500/20`
                      : isActive
                      ? `bg-gradient-to-r ${theme.gradient} border-white/30 shadow-lg shadow-white/10 hover:border-white/50`
                      : "bg-white/5 border-white/10 opacity-60"
                  }`}
                  onClick={() => onNodeClick?.(node)}
                >
                  {/* Node number/status */}
                  <div
                    className={`absolute -top-3 ${isLeft ? "-right-3" : "-left-3"} w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      isCompleted
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/50"
                        : isActive
                        ? `bg-gradient-to-r ${theme.accent} text-white shadow-lg`
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>

                  <div className="pr-6">
                    <h4 className={`font-semibold ${isCompleted ? "text-green-400" : isActive ? "text-white" : "text-gray-500"}`}>
                      {node.title}
                    </h4>
                    {node.description && (
                      <p className={`text-sm mt-1 ${isCompleted ? "text-green-300/70" : isActive ? "text-gray-400" : "text-gray-600"}`}>
                        {node.description}
                      </p>
                    )}

                    {/* Action button for active node */}
                    {isActive && onCompleteNode && (
                      <motion.button
                        className={`mt-3 px-4 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r ${theme.accent} text-white shadow-lg`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompleteNode(node.id);
                        }}
                      >
                        Mark Complete
                      </motion.button>
                    )}

                    {/* Locked indicator */}
                    {isLocked && (
                      <div className="mt-2 flex items-center gap-1 text-gray-500 text-xs">
                        <span>🔒</span>
                        <span>Complete previous step to unlock</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Finish line */}
      {nodes.length > 0 && (
        <motion.div
          className="relative mt-8 p-6 rounded-xl border border-dashed border-white/20 bg-white/5 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: nodes.length * 0.1 + 0.5 }}
        >
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-white font-semibold">Goal Achieved!</div>
          <div className="text-gray-400 text-sm">Complete all milestones to reach your destination</div>
        </motion.div>
      )}
    </div>
  );
}
