"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * CreateCapsuleModal - Time Capsule Creation Modal (Issue #72)
 * ============================================================
 *
 * Modal for creating/editing time capsules.
 * Features:
 * - Message textarea
 * - Unlock type: node completion or specific date
 * - DatePicker for date unlock (HTML5 datetime-local)
 * - Framer motion animations
 */

interface CreateCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string, unlockType: "node_complete" | "date", unlockDate?: string) => Promise<void>;
  isEditing?: boolean;
  initialContent?: string;
  initialUnlockType?: "node_complete" | "date";
  initialUnlockDate?: string | null;
  isLoading?: boolean;
}

export function CreateCapsuleModal({
  isOpen,
  onClose,
  onSubmit,
  isEditing = false,
  initialContent = "",
  initialUnlockType = "node_complete",
  initialUnlockDate = null,
  isLoading = false,
}: CreateCapsuleModalProps) {
  const [content, setContent] = useState(initialContent);
  const [unlockType, setUnlockType] = useState<"node_complete" | "date">(initialUnlockType);
  const [unlockDate, setUnlockDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const maxLength = 1000;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setUnlockType(initialUnlockType);
      setUnlockDate(initialUnlockDate ? new Date(initialUnlockDate).toISOString().slice(0, 16) : "");
      setError(null);
    }
  }, [isOpen, initialContent, initialUnlockType, initialUnlockDate]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError("Please write a message");
      return;
    }

    if (unlockType === "date" && !unlockDate) {
      setError("Please select an unlock date");
      return;
    }

    if (unlockType === "date" && new Date(unlockDate) <= new Date()) {
      setError("Unlock date must be in the future");
      return;
    }

    setError(null);
    try {
      await onSubmit(content.trim(), unlockType, unlockType === "date" ? unlockDate : undefined);
      handleClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create capsule";
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setContent(initialContent);
      setUnlockType(initialUnlockType);
      setUnlockDate("");
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
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -8px rgba(139, 92, 246, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="create-capsule-modal"
          >
            {/* Header glow */}
            <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

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
                  {String.fromCodePoint(0x1F48C)}
                </motion.div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white text-center mb-2">
                {isEditing ? "Edit Time Capsule" : "Create Time Capsule"}
              </h3>

              <p className="text-sm text-slate-400 text-center mb-6">
                Leave a message that unlocks at a future milestone
              </p>

              {/* Message input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Your Message
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
                  placeholder="Write an encouraging message for the future..."
                  rows={5}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(71, 85, 105, 0.4)",
                  }}
                  data-testid="capsule-message"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${content.length > maxLength - 100 ? "text-purple-400" : "text-slate-500"}`}>
                    {content.length}/{maxLength}
                  </span>
                </div>
              </div>

              {/* Unlock type selection */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                  Unlock Condition
                </label>
                <div className="space-y-2">
                  {/* Node completion option */}
                  <motion.label
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: unlockType === "node_complete" ? "rgba(139, 92, 246, 0.15)" : "rgba(15, 23, 42, 0.6)",
                      border: unlockType === "node_complete" ? "1px solid rgba(139, 92, 246, 0.4)" : "1px solid rgba(71, 85, 105, 0.4)",
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <input
                      type="radio"
                      name="unlockType"
                      value="node_complete"
                      checked={unlockType === "node_complete"}
                      onChange={(e) => setUnlockType(e.target.value as "node_complete")}
                      disabled={isLoading || isEditing}
                      className="w-4 h-4 accent-purple-500"
                      data-testid="unlock-on-complete"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">When node is completed</div>
                      <div className="text-xs text-slate-400">Unlocks when they finish this milestone</div>
                    </div>
                    <span className="text-xl">{String.fromCodePoint(0x2705)}</span>
                  </motion.label>

                  {/* Date option */}
                  <motion.label
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: unlockType === "date" ? "rgba(139, 92, 246, 0.15)" : "rgba(15, 23, 42, 0.6)",
                      border: unlockType === "date" ? "1px solid rgba(139, 92, 246, 0.4)" : "1px solid rgba(71, 85, 105, 0.4)",
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <input
                      type="radio"
                      name="unlockType"
                      value="date"
                      checked={unlockType === "date"}
                      onChange={(e) => setUnlockType(e.target.value as "date")}
                      disabled={isLoading || isEditing}
                      className="w-4 h-4 accent-purple-500"
                      data-testid="unlock-on-date"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">On a specific date</div>
                      <div className="text-xs text-slate-400">Unlocks at a future date and time</div>
                    </div>
                    <span className="text-xl">{String.fromCodePoint(0x1F4C5)}</span>
                  </motion.label>
                </div>
              </div>

              {/* Date picker (shown when date unlock selected) */}
              <AnimatePresence>
                {unlockType === "date" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                      Unlock Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={unlockDate}
                      onChange={(e) => setUnlockDate(e.target.value)}
                      disabled={isLoading || isEditing}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      style={{
                        background: "rgba(15, 23, 42, 0.6)",
                        border: "1px solid rgba(71, 85, 105, 0.4)",
                        colorScheme: "dark",
                      }}
                      data-testid="unlock-date-picker"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Info box */}
              <div
                className="mb-5 p-3 rounded-lg text-center"
                style={{
                  background: "rgba(139, 92, 246, 0.1)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                }}
              >
                <p className="text-sm text-purple-300">
                  {String.fromCodePoint(0x1F381)} The owner can see the capsule count but not the content until unlocked
                </p>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-lg text-sm text-center"
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                  }}
                >
                  {error}
                </motion.div>
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
                  disabled={isLoading || !content.trim()}
                  className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                  style={{
                    background: !content.trim()
                      ? "rgba(71, 85, 105, 0.5)"
                      : "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                    boxShadow: content.trim() ? "0 4px 15px -4px rgba(139, 92, 246, 0.4)" : "none",
                    color: !content.trim() ? "#64748b" : "#fffbeb",
                    opacity: isLoading ? 0.7 : 1,
                    cursor: !content.trim() ? "not-allowed" : "pointer",
                  }}
                  whileHover={content.trim() && !isLoading ? { scale: 1.02 } : {}}
                  whileTap={content.trim() && !isLoading ? { scale: 0.98 } : {}}
                  data-testid="send-capsule-btn"
                >
                  {isLoading ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      {String.fromCodePoint(0x1F48C)}
                    </motion.span>
                  ) : (
                    <>
                      <span>{String.fromCodePoint(0x1F48C)}</span>
                      <span>{isEditing ? "Update Capsule" : "Create Capsule"}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
