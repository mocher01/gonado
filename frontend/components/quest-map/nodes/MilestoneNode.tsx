"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

interface MilestoneNodeData {
  title: string;
  status: "locked" | "active" | "completed" | "failed";
  themeColors: {
    pathColor: string;
    nodeCompleted: string;
  };
}

interface MilestoneNodeProps {
  data: MilestoneNodeData;
}

function MilestoneNodeComponent({ data }: MilestoneNodeProps) {
  const { title, status, themeColors } = data;
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isLocked = status === "locked";

  return (
    <div className="relative">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-left-2"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`relative flex flex-col items-center p-6 rounded-2xl ${
          isLocked ? "opacity-60" : ""
        }`}
        style={{
          background: isCompleted
            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(22, 163, 74, 0.35) 100%)"
            : isActive
            ? "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.3) 100%)"
            : "linear-gradient(135deg, rgba(71, 85, 105, 0.2) 0%, rgba(51, 65, 85, 0.3) 100%)",
          border: `2px solid ${
            isCompleted
              ? "rgba(34, 197, 94, 0.6)"
              : isActive
              ? "rgba(251, 191, 36, 0.6)"
              : "rgba(100, 116, 139, 0.3)"
          }`,
          boxShadow: isCompleted
            ? "0 8px 40px rgba(34, 197, 94, 0.4)"
            : isActive
            ? "0 8px 40px rgba(251, 191, 36, 0.3)"
            : "none",
        }}
      >
        {/* Trophy/Star icon */}
        <motion.div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{
            background: isCompleted
              ? themeColors.nodeCompleted
              : isActive
              ? `linear-gradient(135deg, ${themeColors.pathColor}, ${themeColors.pathColor}CC)`
              : "linear-gradient(135deg, rgba(100, 116, 139, 0.5), rgba(71, 85, 105, 0.5))",
            boxShadow: isCompleted
              ? "0 0 40px rgba(34, 197, 94, 0.5), inset 0 -4px 10px rgba(0,0,0,0.2)"
              : isActive
              ? `0 0 30px ${themeColors.pathColor}60, inset 0 -4px 10px rgba(0,0,0,0.2)`
              : "inset 0 -4px 10px rgba(0,0,0,0.2)",
          }}
          animate={
            isCompleted
              ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }
              : isActive
              ? { scale: [1, 1.05, 1] }
              : {}
          }
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-4xl drop-shadow-lg">
            {isCompleted ? "🏆" : isActive ? "🎯" : "⭐"}
          </span>
        </motion.div>

        {/* Title */}
        <div className="text-center max-w-[200px]">
          <h3
            className={`text-xl font-bold mb-1 ${
              isCompleted
                ? "text-green-100"
                : isActive
                ? "text-amber-100"
                : "text-slate-300"
            }`}
          >
            {title}
          </h3>
          <div
            className={`text-xs font-semibold uppercase tracking-wider ${
              isCompleted
                ? "text-green-400"
                : isActive
                ? "text-amber-400"
                : "text-slate-500"
            }`}
          >
            {isCompleted ? "🎉 Achieved!" : isActive ? "Current Goal" : "Milestone"}
          </div>
        </div>

        {/* Celebration particles for completed */}
        {isCompleted && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-lg pointer-events-none"
                style={{ top: "50%", left: "50%" }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0],
                  x: Math.cos((i * Math.PI) / 4) * 60 - 10,
                  y: Math.sin((i * Math.PI) / 4) * 60 - 10,
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeOut",
                }}
              >
                {["✨", "🌟", "💫", "⭐"][i % 4]}
              </motion.span>
            ))}
          </>
        )}

        {/* Active glow ring */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ border: "2px solid rgba(251, 191, 36, 0.5)" }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.03, 1],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-right-2"
      />
    </div>
  );
}

export const MilestoneNode = memo(MilestoneNodeComponent);
