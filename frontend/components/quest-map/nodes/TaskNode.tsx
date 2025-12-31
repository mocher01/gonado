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

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskNodeData {
  title: string;
  description: string | null;
  status: "locked" | "active" | "completed" | "failed";
  order: number;
  can_parallel: boolean;
  extra_data?: {
    checklist?: ChecklistItem[];
  };
  onComplete?: () => void;
  onChecklistToggle?: (itemId: string, completed: boolean) => void;
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
  const { title, description, status, order, onComplete, onChecklistToggle, themeColors, extra_data } = data;

  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isLocked = status === "locked";

  // Get checklist from extra_data, or fallback to parsing description
  const checklist = extra_data?.checklist || [];
  const bulletPoints = checklist.length === 0 ? parseDescription(description) : [];
  const completedCount = checklist.filter(i => i.completed).length;

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
            ? "rgba(34, 197, 94, 0.08)"
            : isActive
            ? "rgba(251, 191, 36, 0.06)"
            : "rgba(30, 41, 59, 0.6)",
          border: `1px solid ${
            isCompleted ? "rgba(34, 197, 94, 0.3)" : isActive ? "rgba(251, 191, 36, 0.3)" : "rgba(255, 255, 255, 0.08)"
          }`,
          boxShadow: isCompleted
            ? "0 4px 16px rgba(34, 197, 94, 0.12)"
            : isActive
            ? "0 4px 16px rgba(251, 191, 36, 0.1)"
            : "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >

        {/* Header - Step number and status */}
        <div
          className="px-4 py-3 flex items-center justify-between border-b"
          style={{
            background: isCompleted
              ? "rgba(34, 197, 94, 0.1)"
              : isActive
              ? "rgba(251, 191, 36, 0.08)"
              : "rgba(255, 255, 255, 0.02)",
            borderColor: isCompleted
              ? "rgba(34, 197, 94, 0.15)"
              : isActive
              ? "rgba(251, 191, 36, 0.15)"
              : "rgba(255, 255, 255, 0.05)",
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
            <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300">
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

          {/* Brief description */}
          {description && checklist.length > 0 && (
            <p className={`text-sm mb-3 ${
              isCompleted ? "text-green-300/70" : isActive ? "text-slate-400" : "text-slate-500"
            }`}>
              {description}
            </p>
          )}

          {/* Interactive Checklist */}
          {checklist.length > 0 && (
            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 text-sm group ${
                    isActive && onChecklistToggle ? "cursor-pointer" : ""
                  }`}
                  onClick={(e) => {
                    if (isActive && onChecklistToggle) {
                      e.stopPropagation();
                      onChecklistToggle(item.id, !item.completed);
                    }
                  }}
                >
                  {/* Checkbox */}
                  <div
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? "bg-emerald-500 border-emerald-500"
                        : isActive
                        ? "border-slate-500 group-hover:border-emerald-400"
                        : "border-slate-600"
                    }`}
                  >
                    {item.completed && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                      </svg>
                    )}
                  </div>
                  <span className={`leading-snug ${
                    item.completed
                      ? "line-through text-slate-500"
                      : isCompleted
                      ? "text-green-300"
                      : isActive
                      ? "text-slate-200"
                      : "text-slate-500"
                  }`}>
                    {item.text}
                  </span>
                </div>
              ))}

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%` }}
                  />
                </div>
                <span>{completedCount}/{checklist.length}</span>
              </div>
            </div>
          )}

          {/* Fallback: Legacy bullet points (from description) */}
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

          {/* Fallback: Show full description if no checklist or bullet points */}
          {checklist.length === 0 && bulletPoints.length === 0 && description && (
            <p className={`text-sm leading-relaxed ${
              isCompleted ? "text-green-300/80" : isActive ? "text-slate-300" : "text-slate-500"
            }`}>
              {description}
            </p>
          )}

          {/* Complete button - ALWAYS visible for active nodes */}
          {isActive && onComplete && (
            <motion.button
              className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-base flex items-center justify-center gap-2 transition-shadow"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
              }}
              whileHover={{ scale: 1.01, boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)" }}
              whileTap={{ scale: 0.99 }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onComplete();
              }}
            >
              <span className="text-lg">✓</span>
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
