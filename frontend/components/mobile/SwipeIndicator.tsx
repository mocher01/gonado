"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SwipeIndicator - Visual Swipe Direction Hints (Issue #69)
 * =========================================================
 *
 * Shows swipe direction hints on first visit to help users
 * understand the navigation gestures. Fades after interaction.
 */

interface SwipeIndicatorProps {
  direction: "vertical" | "horizontal" | "both";
  visible?: boolean;
  onDismiss?: () => void;
  storageKey?: string;
}

export function SwipeIndicator({
  direction,
  visible: externalVisible,
  onDismiss,
  storageKey = "swipe-hint-dismissed",
}: SwipeIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Check if hint was previously dismissed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) {
        setVisible(true);
      }
    }
  }, [storageKey]);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Listen for any touch/pointer event to dismiss
  useEffect(() => {
    if (visible) {
      const handleInteraction = () => {
        if (!hasInteracted) {
          setHasInteracted(true);
          handleDismiss();
        }
      };

      window.addEventListener("touchstart", handleInteraction, { once: true });
      window.addEventListener("pointerdown", handleInteraction, { once: true });

      return () => {
        window.removeEventListener("touchstart", handleInteraction);
        window.removeEventListener("pointerdown", handleInteraction);
      };
    }
  }, [visible, hasInteracted]);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
    onDismiss?.();
  };

  // Use external visibility if provided
  const isVisible = externalVisible !== undefined ? externalVisible : visible;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleDismiss}
          data-testid="swipe-indicator"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="text-center p-8 rounded-3xl bg-slate-900/90 border border-white/10 max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Direction animations */}
            <div className="mb-6">
              {direction === "vertical" && <VerticalSwipeAnimation />}
              {direction === "horizontal" && <HorizontalSwipeAnimation />}
              {direction === "both" && <BothSwipeAnimation />}
            </div>

            {/* Instructions */}
            <h3 className="text-lg font-semibold text-white mb-2">
              {direction === "vertical" && "Swipe Up & Down"}
              {direction === "horizontal" && "Swipe Left & Right"}
              {direction === "both" && "Swipe to Navigate"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {direction === "vertical" &&
                "Swipe up to see the next goal, swipe down for previous"}
              {direction === "horizontal" &&
                "Swipe left for next node, right for previous"}
              {direction === "both" &&
                "Swipe vertically for goals, horizontally for nodes"}
            </p>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="px-6 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              data-testid="swipe-indicator-dismiss"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Vertical swipe animation
 */
function VerticalSwipeAnimation() {
  return (
    <div className="relative w-24 h-32 mx-auto">
      {/* Phone outline */}
      <div className="w-full h-full rounded-xl border-2 border-white/30 bg-white/5 relative overflow-hidden">
        {/* Finger icon */}
        <motion.div
          animate={{ y: [20, -20, 20] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <FingerIcon className="w-8 h-8 text-primary-400" />
        </motion.div>

        {/* Trail effect */}
        <motion.div
          animate={{ y: [30, -30, 30], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute left-1/2 -translate-x-1/2 w-1 h-12 bg-gradient-to-b from-transparent via-primary-400 to-transparent rounded-full"
        />
      </div>

      {/* Up arrow */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute -top-3 left-1/2 -translate-x-1/2"
      >
        <ChevronUpIcon className="w-5 h-5 text-white/60" />
      </motion.div>

      {/* Down arrow */}
      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2"
      >
        <ChevronDownIcon className="w-5 h-5 text-white/60" />
      </motion.div>
    </div>
  );
}

/**
 * Horizontal swipe animation
 */
function HorizontalSwipeAnimation() {
  return (
    <div className="relative w-32 h-24 mx-auto">
      {/* Phone outline */}
      <div className="w-full h-full rounded-xl border-2 border-white/30 bg-white/5 relative overflow-hidden">
        {/* Finger icon */}
        <motion.div
          animate={{ x: [-20, 20, -20] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <FingerIcon className="w-8 h-8 text-primary-400" />
        </motion.div>

        {/* Trail effect */}
        <motion.div
          animate={{ x: [-30, 30, -30], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute top-1/2 -translate-y-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent rounded-full"
        />
      </div>

      {/* Left arrow */}
      <motion.div
        animate={{ x: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute top-1/2 -translate-y-1/2 -left-3"
      >
        <ChevronLeftIcon className="w-5 h-5 text-white/60" />
      </motion.div>

      {/* Right arrow */}
      <motion.div
        animate={{ x: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute top-1/2 -translate-y-1/2 -right-3"
      >
        <ChevronRightIcon className="w-5 h-5 text-white/60" />
      </motion.div>
    </div>
  );
}

/**
 * Combined swipe animation for both directions
 */
function BothSwipeAnimation() {
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Phone outline */}
      <div className="w-full h-full rounded-xl border-2 border-white/30 bg-white/5 relative overflow-hidden">
        {/* Finger icon with combined motion */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <FingerIcon className="w-8 h-8 text-primary-400" />
        </motion.div>

        {/* Crosshair motion trails */}
        <motion.div
          animate={{ y: [-15, 15, -15], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-transparent via-primary-400 to-transparent rounded-full"
        />
        <motion.div
          animate={{ x: [-15, 15, -15], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          className="absolute top-1/2 -translate-y-1/2 w-8 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent rounded-full"
        />
      </div>

      {/* Arrows in all directions */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute -top-3 left-1/2 -translate-x-1/2"
      >
        <ChevronUpIcon className="w-4 h-4 text-white/60" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2"
      >
        <ChevronDownIcon className="w-4 h-4 text-white/60" />
      </motion.div>
      <motion.div
        animate={{ x: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute top-1/2 -translate-y-1/2 -left-3"
      >
        <ChevronLeftIcon className="w-4 h-4 text-white/60" />
      </motion.div>
      <motion.div
        animate={{ x: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="absolute top-1/2 -translate-y-1/2 -right-3"
      >
        <ChevronRightIcon className="w-4 h-4 text-white/60" />
      </motion.div>
    </div>
  );
}

/**
 * Compact inline swipe hint
 */
export function InlineSwipeHint({
  direction,
  className = "",
}: {
  direction: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const config = {
    up: {
      icon: <ChevronUpIcon className="w-4 h-4" />,
      text: "Swipe up",
      animate: { y: [0, -3, 0] },
    },
    down: {
      icon: <ChevronDownIcon className="w-4 h-4" />,
      text: "Swipe down",
      animate: { y: [0, 3, 0] },
    },
    left: {
      icon: <ChevronLeftIcon className="w-4 h-4" />,
      text: "Swipe left",
      animate: { x: [0, -3, 0] },
    },
    right: {
      icon: <ChevronRightIcon className="w-4 h-4" />,
      text: "Swipe right",
      animate: { x: [0, 3, 0] },
    },
  };

  const { icon, text, animate } = config[direction];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-1 text-white/40 text-xs ${className}`}
      data-testid={`swipe-hint-${direction}`}
    >
      <motion.span
        animate={animate}
        transition={{ repeat: Infinity, duration: 1 }}
      >
        {icon}
      </motion.span>
      <span>{text}</span>
    </motion.div>
  );
}

// Icon components
function FingerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C10.9 2 10 2.9 10 4V11.5C10 11.78 9.78 12 9.5 12H8C7.45 12 7 12.45 7 13V15.5C7 15.78 6.78 16 6.5 16H5C4.45 16 4 16.45 4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V13C20 11.9 19.1 11 18 11H14V4C14 2.9 13.1 2 12 2Z" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

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
