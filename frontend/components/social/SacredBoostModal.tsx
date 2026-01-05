"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SacredBoostModal - Modal for giving a Sacred Boost with optional message
 * =========================================================================
 *
 * A sacred boost is a rare and meaningful way to support someone's goal.
 * Users can optionally add an encouraging message with their boost.
 * Rate limited to 3 boosts per goal per day.
 */

interface SacredBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message?: string) => Promise<void>;
  goalTitle: string;
  boostsRemainingForGoal: number;
  maxPerDay: number;
  isLoading?: boolean;
}

export function SacredBoostModal({
  isOpen,
  onClose,
  onSubmit,
  goalTitle,
  boostsRemainingForGoal,
  maxPerDay,
  isLoading = false,
}: SacredBoostModalProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const maxLength = 500;
  const canBoost = boostsRemainingForGoal > 0;

  const handleSubmit = async () => {
    if (!canBoost || isLoading) return;

    setError(null);
    try {
      await onSubmit(message.trim() || undefined);
      setMessage("");
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send boost";
      // Check for rate limit error
      if (errorMessage.includes("already given") || errorMessage.includes("429")) {
        setError("You've reached the daily limit for this goal. Try again tomorrow!");
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setMessage("");
      setError(null);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -8px rgba(251, 191, 36, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header glow */}
            <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            <div className="p-6">
              {/* Icon with animation */}
              <div className="text-center mb-4">
                <motion.div
                  className="inline-block text-5xl"
                  animate={{
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  {String.fromCodePoint(0x26A1)}
                </motion.div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white text-center mb-2">
                Give Sacred Boost
              </h3>

              {/* Goal title */}
              <p className="text-sm text-slate-400 text-center mb-4 line-clamp-2">
                To: <span className="text-amber-400">{goalTitle}</span>
              </p>

              {/* Remaining boosts indicator */}
              <div className="flex justify-center mb-5">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    background: canBoost
                      ? "rgba(251, 191, 36, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                    border: canBoost
                      ? "1px solid rgba(251, 191, 36, 0.3)"
                      : "1px solid rgba(239, 68, 68, 0.3)",
                    color: canBoost ? "#fbbf24" : "#f87171",
                  }}
                >
                  <span>{String.fromCodePoint(0x26A1)}</span>
                  <span>
                    {boostsRemainingForGoal}/{maxPerDay} boosts remaining today
                  </span>
                </div>
              </div>

              {canBoost ? (
                <>
                  {/* Message input */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                      Add a message (optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                      placeholder="Send some encouragement..."
                      rows={3}
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 resize-none transition-colors focus:outline-none"
                      style={{
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(71, 85, 105, 0.4)",
                      }}
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-xs ${message.length > maxLength - 50 ? "text-amber-400" : "text-slate-500"}`}>
                        {message.length}/{maxLength}
                      </span>
                    </div>
                  </div>

                  {/* XP info */}
                  <div
                    className="mb-5 p-3 rounded-lg text-center"
                    style={{
                      background: "rgba(251, 191, 36, 0.1)",
                      border: "1px solid rgba(251, 191, 36, 0.2)",
                    }}
                  >
                    <p className="text-sm text-amber-300">
                      This will award <strong>+50 XP</strong> to the goal owner
                    </p>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div
                      className="mb-4 p-3 rounded-lg text-sm text-center"
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      disabled={isLoading}
                      className="flex-1 py-3 rounded-xl font-medium transition-colors"
                      style={{
                        background: "rgba(51, 65, 85, 0.5)",
                        color: "#cbd5e1",
                      }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        boxShadow: "0 4px 15px -4px rgba(245, 158, 11, 0.4)",
                        color: "#fffbeb",
                        opacity: isLoading ? 0.7 : 1,
                      }}
                      whileHover={!isLoading ? { scale: 1.02 } : {}}
                      whileTap={!isLoading ? { scale: 0.98 } : {}}
                    >
                      {isLoading ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          {String.fromCodePoint(0x26A1)}
                        </motion.span>
                      ) : (
                        <>
                          <span>{String.fromCodePoint(0x26A1)}</span>
                          <span>Send Boost</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  {/* Rate limit message */}
                  <div
                    className="mb-5 p-4 rounded-xl text-center"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <p className="text-slate-300 mb-2">
                      You've sent all your Sacred Boosts to this goal today.
                    </p>
                    <p className="text-sm text-slate-400">
                      Your boosts reset at midnight. Come back tomorrow to send more encouragement!
                    </p>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl font-medium transition-colors"
                    style={{
                      background: "rgba(51, 65, 85, 0.5)",
                      color: "#cbd5e1",
                    }}
                  >
                    Got it
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
