"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

interface TaskNodeData {
  title: string;
  description: string | null;
  status: "locked" | "active" | "completed" | "failed";
  order: number;
  can_parallel: boolean;
  onComplete?: () => void;
  themeColors: {
    nodeActive: string;
    nodeCompleted: string;
    nodeLocked: string;
  };
}

interface TaskNodeProps {
  data: TaskNodeData;
  selected?: boolean;
}

function TaskNodeComponent({ data, selected }: TaskNodeProps) {
  const { title, description, status, order, onComplete, themeColors } = data;

  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isLocked = status === "locked";

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
        className={`relative p-5 rounded-xl border-2 backdrop-blur-sm min-w-[280px] max-w-[350px] ${
          isCompleted
            ? "border-green-500/50 shadow-lg shadow-green-500/20"
            : isActive
            ? "border-amber-500/50 shadow-lg shadow-amber-500/20"
            : "border-white/10 opacity-60"
        } ${selected ? "ring-2 ring-primary-500" : ""}`}
        style={{
          background: isCompleted
            ? "rgba(34, 197, 94, 0.15)"
            : isActive
            ? "rgba(245, 158, 11, 0.15)"
            : "rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Node number badge */}
        <div
          className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
          style={{
            background: isCompleted
              ? themeColors.nodeCompleted
              : isActive
              ? themeColors.nodeActive
              : themeColors.nodeLocked,
          }}
        >
          {isCompleted ? "✓" : order}
        </div>

        {/* Parallel indicator */}
        {data.can_parallel && (
          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs shadow-lg">
            ||
          </div>
        )}

        {/* Active pulse animation */}
        {isActive && (
          <motion.div
            className="absolute -inset-0.5 rounded-xl border-2 border-amber-500/50"
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.01, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <h3
          className={`font-bold text-lg mb-2 pr-6 ${
            isCompleted
              ? "text-green-400"
              : isActive
              ? "text-amber-400"
              : "text-gray-500"
          }`}
        >
          {title}
        </h3>

        {description && (
          <p
            className={`text-sm line-clamp-3 ${
              isCompleted
                ? "text-green-300/70"
                : isActive
                ? "text-gray-300"
                : "text-gray-600"
            }`}
          >
            {description}
          </p>
        )}

        {isActive && onComplete && (
          <motion.button
            className="mt-4 w-full py-2.5 rounded-lg text-white font-semibold text-sm"
            style={{ background: themeColors.nodeActive }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onComplete();
            }}
          >
            ✓ Complete
          </motion.button>
        )}

        {isLocked && (
          <div className="mt-2 flex items-center gap-1 text-gray-500 text-xs">
            <span>🔒</span>
            <span>Locked</span>
          </div>
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

export const TaskNode = memo(TaskNodeComponent);
