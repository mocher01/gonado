"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ResourceDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { url: string; title: string; description?: string }) => Promise<void>;
  nodeTitle: string;
  isLoading?: boolean;
}

// SVG noise texture for grain effect
const NoiseFilter = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none">
    <filter id="resource-noise">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.8"
        numOctaves="4"
        stitchTiles="stitch"
      />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#resource-noise)" />
  </svg>
);

// Gift/resource icon for header
const GiftIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className="text-emerald-400"
  >
    <rect
      x="3"
      y="8"
      width="18"
      height="13"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <path
      d="M12 8V21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M3 12H21"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M7.5 8C7.5 8 7.5 4 12 4C16.5 4 16.5 8 16.5 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 4L8 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12 4L16 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Link icon for URL input
const LinkIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-slate-500"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ResourceDropModal({
  isOpen,
  onClose,
  onSubmit,
  nodeTitle,
  isLoading = false,
}: ResourceDropModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFocused, setIsFocused] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const MAX_TITLE_CHARS = 200;
  const MAX_DESC_CHARS = 500;
  const titleCharCount = title.length;
  const descCharCount = description.length;
  const isTitleOverLimit = titleCharCount > MAX_TITLE_CHARS;
  const isDescOverLimit = descCharCount > MAX_DESC_CHARS;

  const urlValid = url.trim() === "" || isValidUrl(url);
  const canSubmit =
    title.trim().length > 0 &&
    !isTitleOverLimit &&
    !isDescOverLimit &&
    urlValid &&
    !isLoading;

  // Character count color based on usage
  const getCharCountColor = (count: number, max: number, isOver: boolean) => {
    if (isOver) return "text-red-400";
    if (count > max * 0.9) return "text-amber-400";
    if (count > max * 0.7) return "text-amber-500/70";
    return "text-slate-500";
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl("");
      setTitle("");
      setDescription("");
      setUrlError(null);
      // Focus URL input after animation
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Validate URL on blur
  const handleUrlBlur = () => {
    setIsFocused(null);
    if (url.trim() && !isValidUrl(url)) {
      setUrlError("Please enter a valid URL (e.g., https://example.com)");
    } else {
      setUrlError(null);
    }
  };

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

    // Final URL validation
    if (url.trim() && !isValidUrl(url)) {
      setUrlError("Please enter a valid URL");
      return;
    }

    try {
      await onSubmit({
        url: url.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setUrl("");
      setTitle("");
      setDescription("");
      onClose();
    } catch (err) {
      // Error handling is done by parent component
      console.error("Failed to drop resource:", err);
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
                "0 0 60px rgba(16, 185, 129, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Modal grain texture overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <NoiseFilter />
            </div>

            {/* Emerald undertone */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.02]"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(16, 185, 129, 0.3) 0%, transparent 60%)",
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

            {/* Header with emerald gradient glow */}
            <div className="relative px-6 py-4">
              {/* Header bottom border with emerald glow */}
              <div
                className="absolute bottom-0 left-4 right-4 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.4) 30%, rgba(5, 150, 105, 0.6) 50%, rgba(16, 185, 129, 0.4) 70%, transparent 100%)",
                  boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)",
                }}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ rotate: -10, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <GiftIcon />
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
                    Drop Resource
                  </h3>
                </div>
                <motion.button
                  onClick={onClose}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg transition-all duration-200 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
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
                  Helping with:{" "}
                  <span className="text-teal-300/90 font-medium">
                    {nodeTitle}
                  </span>
                </span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="relative px-6 py-4 space-y-4">
                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Resource URL <span className="text-slate-500">(optional)</span>
                  </label>
                  <motion.div
                    className="relative rounded-xl overflow-hidden"
                    animate={{
                      boxShadow:
                        isFocused === "url"
                          ? "0 0 20px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.05)"
                          : "none",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <LinkIcon />
                    </div>
                    <input
                      ref={urlInputRef}
                      type="text"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (urlError) setUrlError(null);
                      }}
                      onFocus={() => setIsFocused("url")}
                      onBlur={handleUrlBlur}
                      placeholder="https://example.com/resource"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 transition-all duration-300"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
                        border:
                          urlError
                            ? "1px solid rgba(239, 68, 68, 0.5)"
                            : isFocused === "url"
                            ? "1px solid rgba(16, 185, 129, 0.3)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    />
                  </motion.div>
                  {urlError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 text-xs text-red-400"
                    >
                      {urlError}
                    </motion.p>
                  )}
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <motion.div
                    className="relative rounded-xl overflow-hidden"
                    animate={{
                      boxShadow:
                        isFocused === "title"
                          ? "0 0 20px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.05)"
                          : "none",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onFocus={() => setIsFocused("title")}
                      onBlur={() => setIsFocused(null)}
                      placeholder="What are you sharing?"
                      disabled={isLoading}
                      className="w-full px-4 py-3 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50 transition-all duration-300"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
                        border:
                          isFocused === "title"
                            ? "1px solid rgba(16, 185, 129, 0.3)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    />
                  </motion.div>
                  <div className="mt-1.5 flex justify-end">
                    <span
                      className={`text-xs font-medium ${getCharCountColor(
                        titleCharCount,
                        MAX_TITLE_CHARS,
                        isTitleOverLimit
                      )}`}
                    >
                      {titleCharCount}/{MAX_TITLE_CHARS}
                    </span>
                  </div>
                </div>

                {/* Description Textarea */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description <span className="text-slate-500">(optional)</span>
                  </label>
                  <motion.div
                    className="relative rounded-xl overflow-hidden"
                    animate={{
                      boxShadow:
                        isFocused === "description"
                          ? "0 0 20px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.05)"
                          : "none",
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onFocus={() => setIsFocused("description")}
                      onBlur={() => setIsFocused(null)}
                      placeholder="Add helpful context about this resource..."
                      disabled={isLoading}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-slate-100 placeholder-slate-500 resize-none focus:outline-none disabled:opacity-50 transition-all duration-300"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
                        border:
                          isFocused === "description"
                            ? "1px solid rgba(16, 185, 129, 0.3)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    />
                  </motion.div>
                  <div className="mt-1.5 flex justify-end">
                    <span
                      className={`text-xs font-medium ${getCharCountColor(
                        descCharCount,
                        MAX_DESC_CHARS,
                        isDescOverLimit
                      )}`}
                    >
                      {descCharCount}/{MAX_DESC_CHARS}
                    </span>
                  </div>
                </div>
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
                  {/* Cancel button */}
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

                  {/* Submit button - emerald gradient with shimmer */}
                  <motion.button
                    type="submit"
                    disabled={!canSubmit}
                    whileHover={{ scale: canSubmit ? 1.02 : 1 }}
                    whileTap={{ scale: canSubmit ? 0.98 : 1 }}
                    className="relative px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 overflow-hidden flex items-center gap-2"
                    style={{
                      background: canSubmit
                        ? "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)"
                        : "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
                      boxShadow: canSubmit
                        ? "0 4px 15px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)"
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
                        <span>Dropping...</span>
                      </>
                    ) : (
                      <>
                        <span>Drop Resource</span>
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
