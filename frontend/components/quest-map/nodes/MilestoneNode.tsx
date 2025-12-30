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

  return (
    <div className="relative">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/30"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative flex flex-col items-center"
      >
        {/* Star/Trophy shape */}
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center border-4"
          style={{
            background: isCompleted
              ? themeColors.nodeCompleted
              : `linear-gradient(135deg, ${themeColors.pathColor}40, ${themeColors.pathColor}20)`,
            borderColor: isCompleted ? "transparent" : themeColors.pathColor,
            boxShadow: isCompleted
              ? `0 0 30px rgba(34, 197, 94, 0.5)`
              : `0 0 20px ${themeColors.pathColor}40`,
          }}
          animate={
            isCompleted
              ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-3xl">
            {isCompleted ? "🏆" : "⭐"}
          </span>
        </motion.div>

        {/* Label */}
        <div className="mt-2 text-center">
          <div
            className={`text-sm font-bold ${
              isCompleted ? "text-green-400" : "text-white"
            }`}
          >
            {title}
          </div>
          <div
            className="text-xs"
            style={{ color: themeColors.pathColor }}
          >
            MILESTONE
          </div>
        </div>

        {/* Celebration particles */}
        {isCompleted && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-sm"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI) / 3) * 40,
                  y: Math.sin((i * Math.PI) / 3) * 40,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              >
                ✨
              </motion.span>
            ))}
          </>
        )}
      </motion.div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white/50 !border-2 !border-white/30"
      />
    </div>
  );
}

export const MilestoneNode = memo(MilestoneNodeComponent);
