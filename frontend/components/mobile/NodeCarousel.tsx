"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import type { Node } from "@/types";

/**
 * NodeCarousel - Horizontal Swipe Navigation for Nodes (Issue #69)
 * =================================================================
 *
 * Horizontal swipe carousel for navigating between nodes within a goal.
 * Features:
 * - Horizontal swipe navigation
 * - Position indicator dots
 * - Smooth spring animations
 * - Current node highlighting
 * - Node status indicators
 */

interface NodeCarouselProps {
  nodes: Node[];
  currentNodeId?: string;
  onNodeSelect?: (node: Node) => void;
  onNodeInteract?: (node: Node) => void;
}

export function NodeCarousel({
  nodes,
  currentNodeId,
  onNodeSelect,
  onNodeInteract,
}: NodeCarouselProps) {
  // Sort nodes by order
  const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (currentNodeId) {
      const idx = sortedNodes.findIndex((n) => n.id === currentNodeId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const SWIPE_THRESHOLD = 50;
  const SWIPE_VELOCITY_THRESHOLD = 500;

  // Update current index when currentNodeId changes
  useEffect(() => {
    if (currentNodeId) {
      const idx = sortedNodes.findIndex((n) => n.id === currentNodeId);
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    }
  }, [currentNodeId, sortedNodes]);

  // Notify parent when node changes
  useEffect(() => {
    if (onNodeSelect && sortedNodes[currentIndex]) {
      onNodeSelect(sortedNodes[currentIndex]);
    }
  }, [currentIndex, sortedNodes, onNodeSelect]);

  const handlePanEnd = useCallback(
    async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Determine swipe direction
      const shouldSwipe =
        Math.abs(offset.x) > SWIPE_THRESHOLD ||
        Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD;

      if (!shouldSwipe) {
        await controls.start({ x: 0 });
        return;
      }

      // Navigate to next/previous
      if (offset.x < 0 || velocity.x < 0) {
        // Swipe left - next node
        if (currentIndex < sortedNodes.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (offset.x > 0 || velocity.x > 0) {
        // Swipe right - previous node
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      }
    },
    [currentIndex, sortedNodes.length, controls]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentIndex < sortedNodes.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, sortedNodes.length]);

  if (sortedNodes.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center p-6"
        data-testid="node-carousel-empty"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
            <span className="text-2xl text-slate-500">*</span>
          </div>
          <p className="text-slate-400">No nodes in this quest yet</p>
        </div>
      </div>
    );
  }

  const currentNode = sortedNodes[currentIndex];

  return (
    <div
      ref={containerRef}
      className="relative h-full flex flex-col"
      data-testid="node-carousel"
    >
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
            initial={{ width: "0%" }}
            animate={{
              width: `${((currentIndex + 1) / sortedNodes.length) * 100}%`,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>
            {currentIndex + 1} of {sortedNodes.length}
          </span>
          <span>
            {sortedNodes.filter((n) => n.status === "completed").length} completed
          </span>
        </div>
      </div>

      {/* Main carousel area */}
      <div className="flex-1 relative overflow-hidden">
        <motion.div
          className="h-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onPanEnd={handlePanEnd}
          animate={controls}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentNode.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="h-full"
            >
              <NodeCard
                node={currentNode}
                onInteract={() => onNodeInteract?.(currentNode)}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Navigation arrows (visible but tap targets) */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((prev) => prev - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all"
            aria-label="Previous node"
            data-testid="carousel-prev"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        )}
        {currentIndex < sortedNodes.length - 1 && (
          <button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-all"
            aria-label="Next node"
            data-testid="carousel-next"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Position indicator dots */}
      <div
        className="flex justify-center gap-2 py-4 px-4"
        data-testid="carousel-position-indicator"
      >
        {sortedNodes.map((node, index) => (
          <motion.button
            key={node.id}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all rounded-full ${
              index === currentIndex
                ? "w-6 h-2 bg-primary-400"
                : node.status === "completed"
                ? "w-2 h-2 bg-green-400"
                : node.status === "active"
                ? "w-2 h-2 bg-amber-400"
                : "w-2 h-2 bg-slate-600"
            }`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`Go to node ${index + 1}: ${node.title}`}
            data-testid={`carousel-dot-${index}`}
          />
        ))}
      </div>

      {/* Swipe hints */}
      <SwipeHints
        showLeft={currentIndex > 0}
        showRight={currentIndex < sortedNodes.length - 1}
      />
    </div>
  );
}

/**
 * Individual node card in the carousel
 */
function NodeCard({
  node,
  onInteract,
}: {
  node: Node;
  onInteract?: () => void;
}) {
  const statusConfig = {
    locked: {
      bg: "from-slate-700/50 to-slate-800/50",
      border: "border-slate-600/30",
      icon: "lock",
      label: "Locked",
      labelColor: "text-slate-400",
    },
    active: {
      bg: "from-amber-500/20 to-amber-600/10",
      border: "border-amber-500/30",
      icon: "play",
      label: "In Progress",
      labelColor: "text-amber-400",
    },
    completed: {
      bg: "from-green-500/20 to-green-600/10",
      border: "border-green-500/30",
      icon: "check",
      label: "Completed",
      labelColor: "text-green-400",
    },
    failed: {
      bg: "from-red-500/20 to-red-600/10",
      border: "border-red-500/30",
      icon: "x",
      label: "Failed",
      labelColor: "text-red-400",
    },
  };

  const config = statusConfig[node.status];

  const nodeTypeLabels: Record<string, string> = {
    task: "Task",
    milestone: "Milestone",
    parallel_start: "Parallel Start",
    parallel_end: "Parallel End",
  };

  const difficultyStars = Array.from({ length: 5 }, (_, i) => i < node.difficulty);

  return (
    <div className="h-full flex items-center justify-center px-6 py-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`w-full max-w-sm rounded-2xl bg-gradient-to-b ${config.bg} border ${config.border} backdrop-blur-sm p-6`}
        data-testid="node-card"
      >
        {/* Status badge and type */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${config.labelColor} bg-black/20`}
          >
            {config.label}
          </span>
          <span className="text-xs text-slate-500">
            {nodeTypeLabels[node.node_type] || node.node_type}
          </span>
        </div>

        {/* Node icon based on status */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/20 flex items-center justify-center">
          {node.status === "completed" ? (
            <CheckIcon className="w-8 h-8 text-green-400" />
          ) : node.status === "locked" ? (
            <LockIcon className="w-8 h-8 text-slate-500" />
          ) : node.status === "active" ? (
            <PlayIcon className="w-8 h-8 text-amber-400" />
          ) : (
            <XIcon className="w-8 h-8 text-red-400" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center mb-2">
          {node.title}
        </h3>

        {/* Description */}
        {node.description && (
          <p className="text-gray-400 text-center text-sm mb-4 line-clamp-3">
            {node.description}
          </p>
        )}

        {/* Difficulty */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <span className="text-xs text-slate-500 mr-2">Difficulty:</span>
          {difficultyStars.map((filled, i) => (
            <span
              key={i}
              className={filled ? "text-amber-400" : "text-slate-600"}
            >
              *
            </span>
          ))}
        </div>

        {/* Checklist progress (if exists) */}
        {node.extra_data?.checklist && node.extra_data.checklist.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Checklist</span>
              <span>
                {node.extra_data.checklist.filter((i) => i.completed).length}/
                {node.extra_data.checklist.length}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                style={{
                  width: `${
                    (node.extra_data.checklist.filter((i) => i.completed).length /
                      node.extra_data.checklist.length) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Due date */}
        {node.due_date && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-4">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Due: {new Date(node.due_date).toLocaleDateString()}</span>
          </div>
        )}

        {/* Action button */}
        {node.status !== "locked" && (
          <button
            onClick={onInteract}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              node.status === "completed"
                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                : "bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-lg hover:shadow-primary-500/25"
            }`}
            data-testid="node-interact-button"
          >
            {node.status === "completed" ? "View Details" : "Work on This"}
          </button>
        )}

        {node.status === "locked" && (
          <div className="w-full py-3 rounded-xl bg-slate-700/30 text-slate-500 text-center text-sm">
            Complete previous nodes to unlock
          </div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Swipe hint indicators
 */
function SwipeHints({
  showLeft,
  showRight,
}: {
  showLeft: boolean;
  showRight: boolean;
}) {
  const [showHints, setShowHints] = useState(true);

  // Hide hints after first interaction
  useEffect(() => {
    const timer = setTimeout(() => setShowHints(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!showHints) return null;

  return (
    <div className="absolute inset-x-0 bottom-20 flex justify-between px-4 pointer-events-none">
      <AnimatePresence>
        {showLeft && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-1 text-white/40 text-xs"
          >
            <motion.div animate={{ x: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
              <ChevronLeftIcon className="w-4 h-4" />
            </motion.div>
            <span>Previous</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRight && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-1 text-white/40 text-xs"
          >
            <span>Next</span>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
              <ChevronRightIcon className="w-4 h-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Icon components
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
