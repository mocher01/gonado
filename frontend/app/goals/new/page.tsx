"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const EXAMPLE_GOALS = [
  "Run a marathon in 3 months",
  "Learn to play guitar in 6 months",
  "Launch my startup MVP in 8 weeks",
  "Lose 20 pounds by summer",
  "Write a novel in 30 days",
  "Learn Spanish to conversational level",
  "Build a mobile app from scratch",
  "Get promoted to senior engineer",
];

type QueueStatus = "idle" | "submitting" | "pending" | "processing" | "completed" | "failed";

export default function NewGoalPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth(true);

  const [goalText, setGoalText] = useState("");
  const [status, setStatus] = useState<QueueStatus>("idle");
  const [queueId, setQueueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<number>(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_GOALS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll for queue status
  const pollStatus = useCallback(async (id: string) => {
    try {
      const result = await api.getQueueStatus(id);

      if (result.status === "completed" && result.goal_id) {
        setStatus("completed");
        // Small delay for UX, then redirect
        setTimeout(() => {
          router.push(`/goals/${result.goal_id}`);
        }, 1000);
      } else if (result.status === "failed") {
        setStatus("failed");
        setError(result.error_message || "Failed to generate plan. Please try again.");
      } else if (result.status === "processing") {
        setStatus("processing");
        // Continue polling
        setTimeout(() => pollStatus(id), 2000);
      } else {
        // Still pending
        setStatus("pending");
        setTimeout(() => pollStatus(id), 3000);
      }
    } catch (err) {
      console.error("Polling error:", err);
      // Keep polling even on error
      setTimeout(() => pollStatus(id), 5000);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!goalText.trim() || goalText.length < 5) {
      setError("Please enter a goal (at least 5 characters)");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      const result = await api.submitGoalToQueue(goalText);
      setQueueId(result.queue_id);
      setPosition(result.position);
      setStatus("pending");

      // Start polling
      pollStatus(result.queue_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit goal");
      setStatus("idle");
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setError(null);
    setQueueId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show generating state
  if (status !== "idle" && status !== "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          {/* Animated orb */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-4 border-2 border-dashed border-purple-400 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-8 border-2 border-dotted border-pink-400 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">
                {status === "completed" ? "✨" : "🎯"}
              </span>
            </div>
          </div>

          {/* Status message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {status === "submitting" && (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Submitting your goal...
                  </h2>
                  <p className="text-gray-400">Please wait</p>
                </>
              )}
              {status === "pending" && (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    In Queue
                  </h2>
                  <p className="text-gray-400 mb-4">
                    Position: #{position}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Our AI expert is crafting your personalized quest map...
                  </p>
                </>
              )}
              {status === "processing" && (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Creating Your Quest Map
                  </h2>
                  <p className="text-gray-400 mb-4">
                    AI is analyzing your goal and building expert milestones...
                  </p>
                  <div className="flex justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -10, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="w-2 h-2 bg-purple-500 rounded-full"
                      />
                    ))}
                  </div>
                </>
              )}
              {status === "completed" && (
                <>
                  <h2 className="text-2xl font-bold text-green-400 mb-2">
                    Quest Map Ready!
                  </h2>
                  <p className="text-gray-400">
                    Redirecting to your journey...
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Goal text reminder */}
          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-gray-400 text-sm">Your goal:</p>
            <p className="text-white font-medium">&quot;{goalText}&quot;</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main input form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-8 left-8"
      >
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <span>&larr;</span>
          <span>Back to Dashboard</span>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="text-6xl mb-6"
        >
          🎯
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          What do you want to achieve?
        </h1>
        <p className="text-gray-400 mb-8 text-lg">
          Describe your goal in one sentence. Our AI will create a personalized quest map with expert milestones.
        </p>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder={EXAMPLE_GOALS[placeholderIndex]}
              className="w-full px-6 py-4 text-lg bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              autoFocus
            />
            <AnimatePresence>
              {goalText.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={() => setGoalText("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400"
              >
                {error}
                {status === "failed" && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="ml-4 underline hover:no-underline"
                  >
                    Try again
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={!goalText.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25"
          >
            Create My Quest Map
          </motion.button>
        </form>

        {/* Example goals */}
        <div className="mt-12">
          <p className="text-gray-500 text-sm mb-4">Try one of these:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_GOALS.slice(0, 4).map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setGoalText(example)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
