"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

/**
 * TaskNode - Quest Map Step Component
 * ===================================
 *
 * UI CHECKLIST (for future generation):
 * ✓ onComplete button MUST be visible for active nodes
 * ✓ No max-width that cuts content
 * ✓ Description fully visible (no line-clamp)
 * ✓ TODO format with bullet points
 * ✓ Clear status indicators
 */

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

/**
 * Parse description into TODO-style bullet points
 *
 * RULES FOR AI GENERATION:
 * - Use newlines or numbered lists in descriptions
 * - Each item should be a complete, actionable step
 * - Keep items concise (under 100 chars each)
 */
function parseDescription(desc: string | null): string[] {
  if (!desc) return [];

  // Priority 1: Split by newlines (most reliable)
  let lines = desc.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);

  // Priority 2: If only one line, try to split by numbered items (1. 2. 3.)
  if (lines.length === 1) {
    const numbered = desc.split(/(?:\d+\.\s+)/g).map(s => s.trim()).filter(s => s.length > 0);
    if (numbered.length > 1) {
      lines = numbered;
    }
  }

  // Priority 3: If still one line, try bullet points (- or •)
  if (lines.length === 1) {
    const bulleted = desc.split(/(?:[-•]\s+)/g).map(s => s.trim()).filter(s => s.length > 0);
    if (bulleted.length > 1) {
      lines = bulleted;
    }
  }

  // Clean up: remove leading numbers/bullets that might remain
  lines = lines.map(line => line.replace(/^[\d\.\-•\s]+/, '').trim());

  // Return all items (no limit) - let the content breathe
  return lines.filter(s => s.length > 0);
}

function TaskNodeComponent({ data, selected }: TaskNodeProps) {
  const { title, description, status, order, onComplete, themeColors } = data;

  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isLocked = status === "locked";

  const bulletPoints = parseDescription(description);

  // Status icons
  const statusIcon = isCompleted ? "✓" : isActive ? "●" : "○";
  const statusText = isCompleted ? "Done" : isActive ? "Current" : "Locked";

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
        className={`relative w-[400px] rounded-2xl overflow-visible ${
          selected ? "ring-2 ring-white/50" : ""
        } ${isLocked ? "opacity-60" : ""}`}
        style={{
          background: isCompleted
            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.25) 100%)"
            : isActive
            ? "linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.2) 100%)"
            : "linear-gradient(135deg, rgba(51, 65, 85, 0.3) 0%, rgba(30, 41, 59, 0.4) 100%)",
          border: `2px solid ${
            isCompleted ? "rgba(34, 197, 94, 0.5)" : isActive ? "rgba(251, 191, 36, 0.5)" : "rgba(71, 85, 105, 0.3)"
          }`,
          boxShadow: isCompleted
            ? "0 8px 32px rgba(34, 197, 94, 0.25)"
            : isActive
            ? "0 8px 32px rgba(251, 191, 36, 0.2)"
            : "none",
        }}
      >
        {/* Active pulse */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ border: "2px solid rgba(251, 191, 36, 0.4)" }}
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.01, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Header - Step number and status */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            background: isCompleted
              ? "rgba(34, 197, 94, 0.2)"
              : isActive
              ? "rgba(251, 191, 36, 0.15)"
              : "rgba(51, 65, 85, 0.3)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Step badge */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-base"
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

            {/* Status */}
            <span className={`text-sm font-medium ${
              isCompleted ? "text-green-400" : isActive ? "text-amber-400" : "text-slate-500"
            }`}>
              {statusIcon} {statusText}
            </span>
          </div>

          {/* Parallel badge */}
          {data.can_parallel && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
              ⚡ Parallel
            </span>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {/* Title */}
          <h3 className={`font-bold text-lg mb-3 leading-snug ${
            isCompleted ? "text-green-200" : isActive ? "text-amber-100" : "text-slate-400"
          }`}>
            {title}
          </h3>

          {/* Description as TODO list */}
          {bulletPoints.length > 0 && (
            <ul className="space-y-2">
              {bulletPoints.map((point, idx) => (
                <li
                  key={idx}
                  className={`flex items-start gap-2 text-sm ${
                    isCompleted ? "text-green-300/80" : isActive ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  <span className={`mt-0.5 flex-shrink-0 ${
                    isCompleted ? "text-green-400" : isActive ? "text-amber-400" : "text-slate-600"
                  }`}>
                    {isCompleted ? "✓" : "•"}
                  </span>
                  <span className="leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Show full description if no bullet points parsed */}
          {bulletPoints.length === 0 && description && (
            <p className={`text-sm leading-relaxed ${
              isCompleted ? "text-green-300/80" : isActive ? "text-slate-300" : "text-slate-500"
            }`}>
              {description}
            </p>
          )}

          {/* Complete button - ALWAYS visible for active nodes */}
          {isActive && onComplete && (
            <motion.button
              className="mt-4 w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${themeColors.nodeActive}, ${themeColors.pathColor})`,
                boxShadow: `0 4px 20px ${themeColors.pathColor}50`,
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onComplete();
              }}
            >
              <span className="text-xl">✓</span>
              <span>Mark as Complete</span>
            </motion.button>
          )}

          {/* Locked hint */}
          {isLocked && (
            <div className="mt-3 py-2 px-3 rounded-lg bg-slate-800/50 flex items-center gap-2 text-slate-500 text-sm">
              <span>🔒</span>
              <span>Complete previous step first</span>
            </div>
          )}

          {/* Completed message */}
          {isCompleted && (
            <div className="mt-3 py-2 px-3 rounded-lg bg-green-900/30 flex items-center gap-2 text-green-400 text-sm font-medium">
              <span>🎉</span>
              <span>Completed!</span>
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
