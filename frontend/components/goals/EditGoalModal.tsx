"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Goal } from "@/types";

type VisibilityType = "public" | "private" | "shared" | "friends";

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string | null; visibility: VisibilityType }) => Promise<void>;
  goal: Goal | null;
  isLoading?: boolean;
}

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;

const visibilityOptions: { value: VisibilityType; label: string; description: string; icon: string }[] = [
  { value: "public", label: "Public", description: "Anyone can view this goal", icon: "\u{1F30D}" },
  { value: "private", label: "Private", description: "Only you can view this goal", icon: "\u{1F512}" },
  { value: "shared", label: "Shared", description: "Only people you share with can view", icon: "\u{1F465}" },
  { value: "friends", label: "Friends", description: "Only your friends can view", icon: "\u{1F91D}" },
];

export function EditGoalModal({ isOpen, onClose, onSave, goal, isLoading = false }: EditGoalModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<VisibilityType>("public");
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (goal) {
      setTitle(goal.title || "");
      setDescription(goal.description || "");
      setVisibility(goal.visibility || "public");
      setError(null);
      setTitleError(null);
    }
  }, [goal]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setTitleError(null);
    }
  }, [isOpen]);

  const validateTitle = (value: string): boolean => {
    if (!value.trim()) {
      setTitleError("Title is required");
      return false;
    }
    if (value.length > TITLE_MAX_LENGTH) {
      setTitleError("Title must be " + TITLE_MAX_LENGTH + " characters or less");
      return false;
    }
    setTitleError(null);
    return true;
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (titleError) validateTitle(value);
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!validateTitle(title)) return;
    setError(null);
    try {
      await onSave({ title: title.trim(), description: description.trim() || null, visibility });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  if (!goal) return null;

  const hasChanges = title.trim() !== (goal.title || "") || (description.trim() || null) !== (goal.description || null) || visibility !== goal.visibility;

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
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{
              background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)",
              border: "1px solid rgba(20, 184, 166, 0.3)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px -8px rgba(20, 184, 166, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{String.fromCodePoint(0x2699)}</span>
                <h2 className="text-xl font-bold text-white">Edit Goal</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => validateTitle(title)}
                  disabled={isLoading}
                  maxLength={TITLE_MAX_LENGTH}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 transition-all focus:outline-none"
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: titleError ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(71, 85, 105, 0.4)",
                  }}
                  placeholder="Your goal title..."
                />
                <div className="flex justify-between mt-1.5">
                  {titleError ? <span className="text-xs text-red-400">{titleError}</span> : <span />}
                  <span className={`text-xs ${title.length > TITLE_MAX_LENGTH - 20 ? "text-amber-400" : "text-slate-500"}`}>
                    {title.length}/{TITLE_MAX_LENGTH}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                  disabled={isLoading}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 resize-none transition-all focus:outline-none"
                  style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(71, 85, 105, 0.4)" }}
                  placeholder="Describe your goal..."
                />
                <div className="flex justify-end mt-1.5">
                  <span className={`text-xs ${description.length > DESCRIPTION_MAX_LENGTH - 100 ? "text-amber-400" : "text-slate-500"}`}>
                    {description.length}/{DESCRIPTION_MAX_LENGTH}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Visibility</label>
                <div className="space-y-2">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => !isLoading && setVisibility(option.value)}
                      disabled={isLoading}
                      className="w-full p-3 rounded-xl flex items-center gap-3 transition-all text-left"
                      style={{
                        background: visibility === option.value ? "rgba(20, 184, 166, 0.15)" : "rgba(15, 23, 42, 0.4)",
                        border: visibility === option.value ? "1px solid rgba(20, 184, 166, 0.4)" : "1px solid rgba(71, 85, 105, 0.3)",
                      }}
                    >
                      <span className="text-xl">{option.icon}</span>
                      <div className="flex-1">
                        <div className={`font-medium ${visibility === option.value ? "text-teal-300" : "text-slate-200"}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-400">{option.description}</div>
                      </div>
                      {visibility === option.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div
                  className="p-3 rounded-xl text-sm text-center"
                  style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171" }}
                >
                  {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={isLoading || !hasChanges || !!titleError || !title.trim()}
                className="px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                style={{
                  background: (isLoading || !hasChanges || !!titleError || !title.trim())
                    ? "rgba(71, 85, 105, 0.5)"
                    : "linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)",
                  color: (isLoading || !hasChanges || !!titleError || !title.trim()) ? "#94a3b8" : "#f0fdfa",
                  boxShadow: (isLoading || !hasChanges || !!titleError || !title.trim())
                    ? "none"
                    : "0 4px 15px -4px rgba(20, 184, 166, 0.4)",
                }}
                whileHover={!isLoading && hasChanges && !titleError && title.trim() ? { scale: 1.02 } : {}}
                whileTap={!isLoading && hasChanges && !titleError && title.trim() ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
