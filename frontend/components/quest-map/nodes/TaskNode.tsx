"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";
import { DifficultyIndicator } from "../DifficultySelector";

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

interface NodeSocialSummary {
  reactions_total: number;
  comments_count: number;
  resources_count: number;
}

interface NodeReactionCounts {
  encourage: number;
  celebrate: number;
  light_path: number;
  send_strength: number;
  mark_struggle: number;
}

interface Comment {
  id: string;
  author: string;
  text: string;
  timeAgo: string;
}

interface Resource {
  id: string;
  type: 'file' | 'link';
  title: string;
}

interface TaskNodeData {
  nodeId: string;
  title: string;
  description: string | null;
  status: "locked" | "active" | "completed" | "failed";
  order: number;
  can_parallel: boolean;
  difficulty?: number;
  // Sequential/Parallel structuring (Issue #63)
  is_sequential?: boolean;
  parallel_group?: number | null;
  extra_data?: {
    checklist?: ChecklistItem[];
  };
  onComplete?: () => void;
  onChecklistToggle?: (itemId: string, completed: boolean) => void;
  onEdit?: () => void;

  // Reactions - MULTIPLE allowed
  reactionCounts?: NodeReactionCounts;
  userReactions?: string[];  // User's active reactions (can have multiple)
  onReaction?: (reactionType: string) => void;

  // Comments
  latestComments?: Comment[];
  commentsCount?: number;
  onCommentsClick?: () => void;

  // Resources
  latestResources?: Resource[];
  resourcesCount?: number;
  onResourcesClick?: () => void;

  // Permissions
  canInteract?: boolean;  // false for anonymous users
  isOwner?: boolean;  // true for owner/admin

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
  const {
    title,
    description,
    status,
    order,
    onComplete,
    onChecklistToggle,
    onEdit,
    reactionCounts,
    userReactions = [],
    onReaction,
    latestComments,
    commentsCount = 0,
    onCommentsClick,
    latestResources,
    resourcesCount = 0,
    onResourcesClick,
    canInteract = true,
    isOwner = false,
    themeColors,
    extra_data
  } = data;

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

  // Handle reaction click
  const handleReactionClick = (reactionType: string) => {
    if (!canInteract) {
      // Show login prompt for anonymous users
      alert("Please log in to react to this step");
      return;
    }
    onReaction?.(reactionType);
  };

  // Handle comments click
  const handleCommentsClick = () => {
    if (!canInteract) {
      alert("Please log in to view and add comments");
      return;
    }
    onCommentsClick?.();
  };

  // Handle resources click
  const handleResourcesClick = () => {
    if (!canInteract) {
      alert("Please log in to view and add resources");
      return;
    }
    onResourcesClick?.();
  };

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

          <div className="flex items-center gap-2">
            {/* Difficulty indicator */}
            {data.difficulty !== undefined && (
              <DifficultyIndicator value={data.difficulty} compact />
            )}

            {/* Parallel badge */}
            {data.can_parallel && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300">
                ⚡ Parallel
              </span>
            )}

            {/* Edit button */}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Edit step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
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
                    isActive && isOwner && onChecklistToggle ? "cursor-pointer" : ""
                  }`}
                  onClick={(e) => {
                    if (isActive && isOwner && onChecklistToggle) {
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
                        : isActive && isOwner
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

          {/* Reactions Bar - Centered with tooltips (Issue #49) */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center justify-center gap-3">
              {[
                { type: 'encourage', emoji: '👊', label: 'Keep going!', activeClass: 'bg-emerald-500/20 border-emerald-500/50 shadow-emerald-500/20', textClass: 'text-emerald-300' },
                { type: 'celebrate', emoji: '🎉', label: 'Amazing progress!', activeClass: 'bg-amber-500/20 border-amber-500/50 shadow-amber-500/20', textClass: 'text-amber-300' },
                { type: 'light-path', emoji: '🔦', label: 'Showing the way', activeClass: 'bg-blue-500/20 border-blue-500/50 shadow-blue-500/20', textClass: 'text-blue-300' },
                { type: 'send-strength', emoji: '💪', label: 'Power boost!', activeClass: 'bg-red-500/20 border-red-500/50 shadow-red-500/20', textClass: 'text-red-300' },
                { type: 'mark-struggle', emoji: '🚩', label: 'I see you struggling', activeClass: 'bg-purple-500/20 border-purple-500/50 shadow-purple-500/20', textClass: 'text-purple-300' },
              ].map(reaction => {
                const isActive = userReactions.includes(reaction.type);
                const count = reactionCounts?.[reaction.type.replace(/-/g, '_') as keyof NodeReactionCounts] || 0;

                return (
                  <motion.button
                    key={reaction.type}
                    title={reaction.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactionClick(reaction.type);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all border-2 ${
                      isActive
                        ? `${reaction.activeClass} shadow-lg`
                        : "bg-white/5 hover:bg-white/10 border-transparent hover:border-white/20"
                    }`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-lg">{reaction.emoji}</span>
                    <span className={`text-xs font-medium ${
                      isActive ? reaction.textClass : "text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Comments Section - TikTok style */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1 text-sm text-slate-400 min-h-[2rem]">
                {latestComments && latestComments.length > 0 ? (
                  latestComments.slice(0, 3).map(c => (
                    <div key={c.id} className="truncate">
                      <span className="font-medium text-cyan-400">@{c.author}</span>: "{c.text}" <span className="text-slate-500">• {c.timeAgo}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No comments yet</div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCommentsClick();
                }}
                className="flex flex-col items-center ml-3 text-cyan-400 hover:text-cyan-300 transition-colors flex-shrink-0"
                title="View all comments"
              >
                <span className="text-2xl">💬</span>
                <span className="text-xs font-medium">{commentsCount}</span>
              </button>
            </div>
          </div>

          {/* Resources Section - TikTok style */}
          <div className="mt-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 flex flex-wrap gap-2 text-sm text-slate-400 min-h-[1.5rem]">
                {latestResources && latestResources.length > 0 ? (
                  latestResources.slice(0, 3).map(r => (
                    <span key={r.id} className="flex items-center gap-1">
                      {r.type === 'file' ? '📄' : '🔗'} <span className="truncate max-w-[120px]">{r.title}</span>
                    </span>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No resources yet</div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResourcesClick();
                }}
                className="flex flex-col items-center ml-3 text-teal-400 hover:text-teal-300 transition-colors flex-shrink-0"
                title="View all resources"
              >
                <span className="text-2xl">📦</span>
                <span className="text-xs font-medium">{resourcesCount}</span>
              </button>
            </div>
          </div>

          {/* Complete button - Only visible for owner on active nodes */}
          {isActive && isOwner && onComplete && (
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

          {/* Locked hint - shows lock icon for sequential nodes (Issue #63) */}
          {isLocked && (
            <div className="mt-3 py-2 px-3 rounded-lg bg-slate-800/50 flex items-center gap-2 text-slate-500 text-sm">
              <span className="text-lg">🔒</span>
              <span>
                {data.is_sequential !== false
                  ? "Complete previous step first"
                  : data.parallel_group
                    ? `Part of parallel group ${data.parallel_group}`
                    : "Waiting for dependencies"
                }
              </span>
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
