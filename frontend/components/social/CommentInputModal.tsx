"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CommentInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
  nodeTitle: string;
  isLoading?: boolean;
}

// SVG noise texture for grain effect
const NoiseFilter = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none">
    <filter id="noise">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.8"
        numOctaves="4"
        stitchTiles="stitch"
      />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

// Quill/scroll adventure icon for header
const QuillIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="text-amber-400"
  >
    <path
      d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path
      d="M16 8L2 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.5 15H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function CommentInputModal({
  isOpen,
  onClose,
  onSubmit,
  nodeTitle,
  isLoading = false,
}: CommentInputModalProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const MAX_CHARS = 500;
  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isLoading;

  // Character count color based on usage
  const getCharCountColor = () => {
    if (isOverLimit) return "text-red-400";
    if (charCount > MAX_CHARS * 0.9) return "text-amber-400";
    if (charCount > MAX_CHARS * 0.7) return "text-amber-500/70";
    return "text-slate-500";
  };

  // Reset content when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent("");
      // Focus textarea after animation
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await onSubmit(content.trim());
      setContent("");
      onClose();
    } catch (err) {
      // Error handling is done by parent component
      console.error("Failed to submit comment:", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.85) 0%, rgba(0, 0, 0, 0.9) 100%)",
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Backdrop grain texture */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <NoiseFilter />
          </div>

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 50%, rgba(30, 41, 59, 0.95) 100%)",
              boxShadow:
                "0 0 60px rgba(245, 158, 11, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Modal grain texture overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <NoiseFilter />
            </div>

            {/* Parchment-like warm undertone */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.02]"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(245, 158, 11, 0.3) 0%, transparent 60%)",
              }}
            />

            {/* Glass-morphism border */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 50%)",
              }}
            />

            {/* Header with amber gradient glow */}
            <div className="relative px-6 py-4">
              {/* Header bottom border with amber glow */}
              <div
                className="absolute bottom-0 left-4 right-4 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.4) 30%, rgba(217, 119, 6, 0.6) 50%, rgba(245, 158, 11, 0.4) 70%, transparent 100%)",
                  boxShadow: "0 0 12px rgba(245, 158, 11, 0.3)",
                }}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ rotate: -10, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <QuillIcon />
                  </motion.div>
                  <h3
                    className="text-lg font-semibold"
                    style={{
                      background:
                        "linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Chronicle Entry
                  </h3>
                </div>
                <motion.button
                  onClick={onClose}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg transition-all duration-200 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </motion.button>
              </div>
              <p className="mt-2 text-sm text-slate-400 truncate flex items-center gap-2">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "#14b8a6" }}
                />
                <span>
                  Marking:{" "}
                  <span className="text-teal-300/90 font-medium">
                    {nodeTitle}
                  </span>
                </span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="relative px-6 py-4">
                {/* Textarea container with glow effect */}
                <motion.div
                  className="relative rounded-xl overflow-hidden"
                  animate={{
                    boxShadow: isFocused
                      ? "0 0 20px rgba(245, 158, 11, 0.15), 0 0 40px rgba(245, 158, 11, 0.05)"
                      : "none",
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Animated border glow */}
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    animate={{
                      opacity: isFocused ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      background:
                        "linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%)",
                    }}
                  />

                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Inscribe your observations upon this waypoint..."
                    disabled={isLoading}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl text-slate-100 placeholder-slate-500 resize-none focus:outline-none disabled:opacity-50 transition-all duration-300"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
                      border: isFocused
                        ? "1px solid rgba(245, 158, 11, 0.3)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  />
                </motion.div>

                {/* Character count with smooth transitions */}
                <motion.div
                  className="mt-3 flex justify-end"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.span
                    className={`text-xs font-medium transition-colors duration-300 ${getCharCountColor()}`}
                    animate={{
                      scale: isOverLimit ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {charCount}/{MAX_CHARS}
                  </motion.span>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="relative px-6 py-4">
                {/* Top border with subtle gradient */}
                <div
                  className="absolute top-0 left-4 right-4 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)",
                  }}
                />

                <div className="flex items-center justify-end gap-3">
                  {/* Cancel button - subtle slate styling */}
                  <motion.button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-400 transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: "rgba(51, 65, 85, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(51, 65, 85, 0.5)";
                      e.currentTarget.style.color = "#e2e8f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(51, 65, 85, 0.3)";
                      e.currentTarget.style.color = "#94a3b8";
                    }}
                  >
                    Cancel
                  </motion.button>

                  {/* Submit button - amber gradient with shimmer */}
                  <motion.button
                    type="submit"
                    disabled={!canSubmit}
                    whileHover={{ scale: canSubmit ? 1.02 : 1 }}
                    whileTap={{ scale: canSubmit ? 0.98 : 1 }}
                    className="relative px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 overflow-hidden flex items-center gap-2"
                    style={{
                      background: canSubmit
                        ? "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)"
                        : "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
                      boxShadow: canSubmit
                        ? "0 4px 15px rgba(245, 158, 11, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)"
                        : "none",
                    }}
                  >
                    {/* Shimmer effect on hover */}
                    {canSubmit && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ x: "-100%", opacity: 0 }}
                        whileHover={{
                          x: "100%",
                          opacity: [0, 0.3, 0],
                          transition: { duration: 0.6, ease: "easeInOut" },
                        }}
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)",
                          width: "100%",
                        }}
                      />
                    )}

                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span>Inscribing...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 2L11 13" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                        </svg>
                        <span>Submit</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
