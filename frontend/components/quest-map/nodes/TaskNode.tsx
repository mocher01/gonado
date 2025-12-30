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
    pathColor: string;
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

  // Status configuration
  const statusConfig = {
    completed: {
      icon: "✓",
      label: "Completed",
      bgGradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.3) 100%)",
      borderColor: "rgba(34, 197, 94, 0.6)",
      headerBg: "rgba(34, 197, 94, 0.3)",
      textColor: "text-green-300",
      titleColor: "text-green-100",
      shadow: "0 8px 32px rgba(34, 197, 94, 0.3)",
    },
    active: {
      icon: "→",
      label: "In Progress",
      bgGradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.25) 100%)",
      borderColor: "rgba(251, 191, 36, 0.6)",
      headerBg: "rgba(251, 191, 36, 0.25)",
      textColor: "text-amber-200",
      titleColor: "text-amber-100",
      shadow: "0 8px 32px rgba(251, 191, 36, 0.25)",
    },
    locked: {
      icon: "🔒",
      label: "Locked",
      bgGradient: "linear-gradient(135deg, rgba(71, 85, 105, 0.2) 0%, rgba(51, 65, 85, 0.3) 100%)",
      borderColor: "rgba(100, 116, 139, 0.3)",
      headerBg: "rgba(71, 85, 105, 0.3)",
      textColor: "text-slate-400",
      titleColor: "text-slate-300",
      shadow: "none",
    },
    failed: {
      icon: "✗",
      label: "Failed",
      bgGradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)",
      borderColor: "rgba(239, 68, 68, 0.6)",
      headerBg: "rgba(239, 68, 68, 0.3)",
      textColor: "text-red-300",
      titleColor: "text-red-100",
      shadow: "0 8px 32px rgba(239, 68, 68, 0.3)",
    },
  };

  const config = statusConfig[status];

  return (
    <div className="relative">
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-white/60 !border-2 !border-white/40 !-left-2"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`relative min-w-[300px] max-w-[380px] rounded-2xl overflow-hidden ${
          selected ? "ring-2 ring-white/50" : ""
        } ${isLocked ? "opacity-70" : ""}`}
        style={{
          background: config.bgGradient,
          border: `2px solid ${config.borderColor}`,
          boxShadow: config.shadow,
        }}
      >
        {/* Active pulse animation */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ border: `2px solid ${config.borderColor}` }}
            animate={{
              opacity: [0.4, 0.8, 0.4],
              scale: [1, 1.02, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Header Section */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: config.headerBg }}
        >
          {/* Step number badge */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
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

            {/* Status badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.textColor}`}
              style={{ background: "rgba(0,0,0,0.2)" }}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </div>
          </div>

          {/* Parallel indicator */}
          {data.can_parallel && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/30 text-purple-300 text-xs font-medium">
              <span>⚡</span>
              <span>Parallel</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="px-5 py-4">
          {/* Title */}
          <h3 className={`font-bold text-xl mb-3 leading-tight ${config.titleColor}`}>
            {title}
          </h3>

          {/* Description */}
          {description && (
            <div className={`text-sm leading-relaxed ${config.textColor}`}>
              <p className="line-clamp-4">{description}</p>
            </div>
          )}

          {/* Action Button for Active nodes */}
          {isActive && onComplete && (
            <motion.button
              className="mt-4 w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg"
              style={{
                background: themeColors.nodeActive,
                boxShadow: `0 4px 20px ${themeColors.pathColor}40`
              }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onComplete();
              }}
            >
              <span className="text-lg">✓</span>
              <span>Mark Complete</span>
            </motion.button>
          )}

          {/* Locked message */}
          {isLocked && (
            <div className="mt-3 flex items-center gap-2 text-slate-500 text-sm">
              <span className="text-base">🔒</span>
              <span>Complete previous steps to unlock</span>
            </div>
          )}

          {/* Completed celebration */}
          {isCompleted && (
            <div className="mt-3 flex items-center gap-2 text-green-400 text-sm font-medium">
              <span className="text-base">🎉</span>
              <span>Well done!</span>
            </div>
          )}
        </div>
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

export const TaskNode = memo(TaskNodeComponent);
