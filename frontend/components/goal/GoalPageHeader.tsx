"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { MoodType } from "@/types";

/**
 * GoalPageHeader - Unified header for goal detail pages
 *
 * UX Information Architecture:
 * 1. Navigation Zone (left): Back button - utility, always available
 * 2. Identity Zone (center): Goal icon, title, progress - primary info
 * 3. State Zone: Visibility + Mood grouped as "journey state" indicators
 * 4. Action Zone (right): Context-aware actions (add, edit, share, auth)
 *
 * Key UX insight: Visibility (public/private) and Mood are semantically related -
 * they both describe "the current state of this goal journey". They should be
 * visually grouped to show this relationship.
 */

interface GoalPageHeaderProps {
  goalTitle: string;
  themeIcon: string;
  themeColor: string;
  completedCount: number;
  totalCount: number;
  progress: number;
  backHref: string;
  backLabel: string;
  isOwner?: boolean;
  isPublic?: boolean;
  currentMood?: MoodType | null;
  isStruggling?: boolean;
  // Actions
  authSlot?: React.ReactNode;
  onAddNode?: () => void;
  onEditGoal?: () => void;
  onToggleVisibility?: () => void;
  onMoodChange?: (mood: MoodType | null) => void | Promise<void>;
  onGeneratePlan?: () => void;
  generatingPlan?: boolean;
  goalStatus?: string;
  // Slots for complex components
  struggleSlot?: React.ReactNode;
  shareSlot?: React.ReactNode;
}

// Mood configuration - matches MoodType from @/types
const MOOD_CONFIG: Record<MoodType, { icon: string; label: string; color: string }> = {
  motivated: { icon: "🔥", label: "Motivated", color: "#f59e0b" },
  confident: { icon: "💪", label: "Confident", color: "#22c55e" },
  focused: { icon: "🎯", label: "Focused", color: "#3b82f6" },
  struggling: { icon: "😤", label: "Pushing through", color: "#ef4444" },
  stuck: { icon: "🤔", label: "Stuck", color: "#8b5cf6" },
  celebrating: { icon: "🎉", label: "Celebrating", color: "#10b981" },
};

const MOOD_OPTIONS: { value: MoodType; icon: string; label: string; color: string }[] =
  (Object.entries(MOOD_CONFIG) as [MoodType, { icon: string; label: string; color: string }][]).map(([key, config]) => ({
    value: key,
    ...config,
  }));

export function GoalPageHeader({
  goalTitle,
  themeIcon,
  themeColor,
  completedCount,
  totalCount,
  progress,
  backHref,
  backLabel,
  isOwner = false,
  isPublic = false,
  currentMood,
  isStruggling = false,
  authSlot,
  onAddNode,
  onEditGoal,
  onToggleVisibility,
  onMoodChange,
  onGeneratePlan,
  generatingPlan = false,
  goalStatus = "active",
  struggleSlot,
  shareSlot,
}: GoalPageHeaderProps) {
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const moodConfig = currentMood ? MOOD_CONFIG[currentMood] : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
      {/* Gradient backdrop */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/90 via-black/60 to-transparent" />

      {/* Main header row */}
      <div className="relative px-3 pt-3 pb-2">
        <div className="flex items-start gap-2">

          {/* Left: Back button */}
          <div className="flex-shrink-0 pointer-events-auto pt-0.5">
            <Link
              href={backHref}
              className="inline-flex items-center justify-center w-9 h-9 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white/70 hover:text-white transition-all duration-200"
              title={`Back to ${backLabel}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>

          {/* Center: Goal Identity + State Capsule */}
          <div className="flex-1 min-w-0 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden max-w-lg mx-auto"
            >
              {/* Goal Identity Row */}
              <div className="px-3 py-2.5 flex items-center gap-2.5">
                {/* Theme Icon */}
                <span className="text-xl flex-shrink-0">{themeIcon}</span>

                {/* Title + Progress */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-semibold text-white truncate leading-tight">
                    {goalTitle}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: themeColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-white/50 flex-shrink-0">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                </div>

                {/* Progress % */}
                <div className="flex-shrink-0 pl-1">
                  <span
                    className="text-base font-bold tabular-nums"
                    style={{ color: themeColor }}
                  >
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              {/* State Capsule Row - Visibility + Mood grouped together */}
              <div className="px-3 py-2 bg-white/[0.03] border-t border-white/[0.06] flex items-center gap-2">
                {/* Visibility State */}
                {isOwner && onToggleVisibility ? (
                  <button
                    onClick={onToggleVisibility}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isPublic
                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                    }`}
                    title={isPublic ? "Goal is public - click to make private" : "Goal is private - click to make public"}
                  >
                    {isPublic ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    <span>{isPublic ? "Public" : "Private"}</span>
                  </button>
                ) : (
                  // Visitor view - just show visibility status
                  isPublic && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 rounded-lg text-xs font-medium text-emerald-300/80">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Public</span>
                    </div>
                  )
                )}

                {/* Divider */}
                {(isPublic || isOwner) && (currentMood || isOwner) && (
                  <div className="w-px h-4 bg-white/10" />
                )}

                {/* Mood State */}
                {isOwner && onMoodChange ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowMoodPicker(!showMoodPicker)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                        moodConfig
                          ? "bg-white/10 hover:bg-white/15"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                      }`}
                      title="Set your current mood"
                    >
                      {moodConfig ? (
                        <>
                          <span>{moodConfig.icon}</span>
                          <span style={{ color: moodConfig.color }}>{moodConfig.label}</span>
                        </>
                      ) : (
                        <>
                          <span>😶</span>
                          <span>Set mood</span>
                        </>
                      )}
                      <svg className={`w-3 h-3 transition-transform ${showMoodPicker ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Mood Picker Dropdown */}
                    <AnimatePresence>
                      {showMoodPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full mt-1 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 min-w-[160px] z-50 shadow-xl"
                        >
                          {MOOD_OPTIONS.map((mood) => (
                            <button
                              key={mood.value}
                              onClick={() => {
                                onMoodChange(mood.value === currentMood ? null : mood.value);
                                setShowMoodPicker(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                                mood.value === currentMood
                                  ? "bg-white/15 text-white"
                                  : "text-white/70 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span>{mood.icon}</span>
                              <span>{mood.label}</span>
                              {mood.value === currentMood && (
                                <svg className="w-3.5 h-3.5 ml-auto text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                          {currentMood && (
                            <>
                              <div className="my-1 border-t border-white/10" />
                              <button
                                onClick={() => {
                                  onMoodChange(null);
                                  setShowMoodPicker(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors text-left"
                              >
                                <span>✕</span>
                                <span>Clear mood</span>
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  // Visitor view - just show mood if set
                  moodConfig && (
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg text-xs font-medium"
                      title={`Owner is feeling: ${moodConfig.label}`}
                    >
                      <span>{moodConfig.icon}</span>
                      <span style={{ color: moodConfig.color }}>{moodConfig.label}</span>
                    </div>
                  )
                )}

                {/* Struggle indicator */}
                {isStruggling && struggleSlot}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Owner quick actions - always visible, no menu */}
                {isOwner && (
                  <div className="flex items-center gap-1">
                    {/* Generate Plan button - only show in planning mode with no nodes */}
                    {onGeneratePlan && goalStatus === "planning" && totalCount === 0 && (
                      <button
                        onClick={onGeneratePlan}
                        disabled={generatingPlan}
                        className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-lg text-purple-300 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Generate AI plan with daily tasks"
                      >
                        <span className="text-sm">{generatingPlan ? "⏳" : "✨"}</span>
                        <span>{generatingPlan ? "Generating..." : "AI Plan"}</span>
                      </button>
                    )}
                    {onAddNode && (
                      <button
                        onClick={onAddNode}
                        data-testid="add-node-btn"
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-300 transition-colors text-xs font-medium"
                        title="Add new step"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add</span>
                      </button>
                    )}
                    {onEditGoal && (
                      <button
                        onClick={onEditGoal}
                        className="flex items-center justify-center w-7 h-7 bg-white/10 hover:bg-white/15 rounded-lg text-white/60 hover:text-white/90 transition-colors"
                        title="Edit goal"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right: Auth + Share */}
          <div className="flex-shrink-0 flex items-center gap-1.5 pointer-events-auto pt-0.5">
            {isPublic && shareSlot}
            {authSlot}
          </div>
        </div>
      </div>
    </header>
  );
}
