"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import Link from "next/link";
import type { Goal } from "@/types";

/**
 * MobileFeed - TikTok-Style Vertical Swipe Feed (Issue #69)
 * =========================================================
 *
 * Full-screen vertical swipe navigation for the discover page.
 * Features:
 * - Snap scrolling between goal cards
 * - Vertical swipe transitions
 * - Pull-to-refresh functionality
 * - Position indicator dots
 * - Smooth spring animations
 */

interface MobileFeedProps {
  goals: Goal[];
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

export function MobileFeed({ goals, onRefresh, isLoading = false }: MobileFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const PULL_THRESHOLD = 80;
  const SWIPE_THRESHOLD = 50;
  const SWIPE_VELOCITY_THRESHOLD = 500;

  // Handle vertical pan/swipe
  const handlePan = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Pull-to-refresh logic (only at first item)
      if (currentIndex === 0 && offset.y > 0) {
        setPullDistance(Math.min(offset.y, PULL_THRESHOLD * 1.5));
        return;
      }

      // Don't allow swiping past boundaries
      if (currentIndex === 0 && offset.y > 0) return;
      if (currentIndex === goals.length - 1 && offset.y < 0) return;
    },
    [currentIndex, goals.length]
  );

  const handlePanEnd = useCallback(
    async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Handle pull-to-refresh
      if (currentIndex === 0 && offset.y > PULL_THRESHOLD && onRefresh) {
        setIsRefreshing(true);
        setPullDistance(0);
        await onRefresh();
        setIsRefreshing(false);
        return;
      }

      setPullDistance(0);

      // Determine swipe direction
      const shouldSwipe =
        Math.abs(offset.y) > SWIPE_THRESHOLD ||
        Math.abs(velocity.y) > SWIPE_VELOCITY_THRESHOLD;

      if (!shouldSwipe) {
        await controls.start({ y: 0 });
        return;
      }

      // Navigate to next/previous
      if (offset.y < 0 || velocity.y < 0) {
        // Swipe up - next item
        if (currentIndex < goals.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (offset.y > 0 || velocity.y > 0) {
        // Swipe down - previous item
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      }
    },
    [currentIndex, goals.length, controls, onRefresh]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && currentIndex < goals.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === "ArrowUp" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, goals.length]);

  const getCategoryIcon = (category: string | null) => {
    const icons: Record<string, string> = {
      health: "heart",
      career: "briefcase",
      education: "book",
      finance: "dollar",
      relationships: "heart",
      creativity: "palette",
      personal: "seedling",
      other: "sparkles",
    };
    return icons[category || "other"] || "target";
  };

  const getCategoryEmoji = (category: string | null) => {
    const emojis: Record<string, string> = {
      health: ".",
      career: ".",
      education: ".",
      finance: ".",
      relationships: ".",
      creativity: ".",
      personal: ".",
      other: ".",
    };
    return emojis[category || "other"] || ".";
  };

  if (goals.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center px-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
            <span className="text-4xl">*</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No goals to explore yet
          </h3>
          <p className="text-gray-400 mb-6">
            Be the first to share your journey!
          </p>
          <Link
            href="/register"
            className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium"
          >
            Create Your First Goal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative"
      data-testid="mobile-feed"
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-20"
            style={{ height: pullDistance || 60 }}
            data-testid="pull-to-refresh-indicator"
          >
            <motion.div
              animate={
                isRefreshing
                  ? { rotate: 360 }
                  : { rotate: (pullDistance / PULL_THRESHOLD) * 180 }
              }
              transition={
                isRefreshing
                  ? { repeat: Infinity, duration: 1, ease: "linear" }
                  : { duration: 0 }
              }
              className={`w-8 h-8 rounded-full border-2 border-t-transparent ${
                pullDistance >= PULL_THRESHOLD || isRefreshing
                  ? "border-primary-400"
                  : "border-slate-500"
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main feed container */}
      <motion.div
        className="h-full"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        animate={controls}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="h-full"
          >
            <GoalCard goal={goals[currentIndex]} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Position indicator dots */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10"
        data-testid="feed-position-indicator"
      >
        {goals.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? "bg-primary-400 w-2 h-4"
                : "bg-white/30 hover:bg-white/50"
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`Go to goal ${index + 1}`}
            data-testid={`feed-dot-${index}`}
          />
        ))}
      </div>

      {/* Swipe hint (bottom) */}
      {currentIndex < goals.length - 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-sm flex flex-col items-center gap-1"
        >
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronUpIcon className="w-5 h-5 rotate-180" />
          </motion.div>
          <span className="text-xs">Swipe up for more</span>
        </motion.div>
      )}

      {/* Counter */}
      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white text-sm font-medium">
        {currentIndex + 1} / {goals.length}
      </div>
    </div>
  );
}

/**
 * Individual goal card shown in the feed
 */
function GoalCard({ goal }: { goal: Goal }) {
  const statusColors = {
    active: "from-green-500/20 to-green-500/5 border-green-500/30",
    completed: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    planning: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
    abandoned: "from-red-500/20 to-red-500/5 border-red-500/30",
  };

  const statusBadgeColors = {
    active: "bg-green-500/20 text-green-400",
    completed: "bg-blue-500/20 text-blue-400",
    planning: "bg-yellow-500/20 text-yellow-400",
    abandoned: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="h-full flex flex-col justify-center px-6 py-16">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`rounded-3xl bg-gradient-to-b ${statusColors[goal.status]} border backdrop-blur-sm p-8`}
        data-testid="goal-card"
      >
        {/* Category icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center mb-6 mx-auto">
          <span className="text-3xl">*</span>
        </div>

        {/* Status and visibility */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeColors[goal.status]}`}
          >
            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
          </span>
          {goal.visibility === "public" && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <GlobeIcon className="w-3 h-3" />
              Public
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">
          {goal.title}
        </h2>

        {/* Description */}
        {goal.description && (
          <p className="text-gray-400 text-center mb-6 line-clamp-3">
            {goal.description}
          </p>
        )}

        {/* Target date */}
        {goal.target_date && (
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-6">
            <CalendarIcon className="w-4 h-4" />
            <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
          </div>
        )}

        {/* Action button */}
        <Link
          href={`/goals/${goal.id}`}
          className="block w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-center font-semibold hover:shadow-lg hover:shadow-primary-500/25 transition-all"
          data-testid="view-goal-button"
        >
          View Quest Map
        </Link>
      </motion.div>
    </div>
  );
}

// Icon components
function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
