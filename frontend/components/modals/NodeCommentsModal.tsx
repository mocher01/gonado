"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface CommentUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  user: CommentUser;
  content: string;
  created_at: string;
  replies: Comment[];
}

interface NodeCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeTitle: string;
  // Reactions support (can react while viewing comments)
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  onReaction?: (reactionType: string) => void;
  // Callback when data changes (comment added)
  onDataChanged?: () => void;
}

export function NodeCommentsModal({
  isOpen,
  onClose,
  nodeId,
  nodeTitle,
  reactionCounts,
  userReactions = [],
  onReaction,
  onDataChanged,
}: NodeCommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && nodeId) {
      loadComments();
    }
  }, [isOpen, nodeId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await api.getComments("node", nodeId);
      setComments(response.comments || []);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await api.addComment("node", nodeId, newComment.trim());
      setNewComment("");
      loadComments(); // Refresh comments
      onDataChanged?.(); // Notify parent to refresh counts
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-y-[10vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  Comments
                </h2>
                <p className="text-sm text-slate-400 truncate max-w-[250px]">on &quot;{nodeTitle}&quot;</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Reactions bar (optional - can react while viewing comments) */}
            {onReaction && (
              <div className="px-4 py-3 border-b border-white/10 bg-slate-800/50">
                <p className="text-xs text-slate-500 mb-2">React to this step:</p>
                <div className="flex items-center justify-center gap-2">
                  {[
                    { type: 'encourage', emoji: '👊', color: 'emerald' },
                    { type: 'celebrate', emoji: '🎉', color: 'amber' },
                    { type: 'light-path', emoji: '🔦', color: 'blue' },
                    { type: 'send-strength', emoji: '💪', color: 'red' },
                    { type: 'mark-struggle', emoji: '🚩', color: 'purple' },
                  ].map(r => {
                    const isActive = userReactions.includes(r.type);
                    const count = reactionCounts?.[r.type.replace(/-/g, '_')] || 0;
                    return (
                      <button
                        key={r.type}
                        onClick={() => onReaction(r.type)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-all ${
                          isActive
                            ? `bg-${r.color}-500/20 border border-${r.color}-500/50`
                            : "bg-white/5 hover:bg-white/10 border border-transparent"
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="text-xs">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="text-center text-slate-400 py-8">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <span className="text-4xl mb-2 block">💬</span>
                  <p>No comments yet</p>
                  <p className="text-sm">Be the first to encourage!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs">
                        👤
                      </div>
                      <span className="font-medium text-cyan-400">
                        {comment.user?.display_name || `@${comment.user?.username || 'unknown'}`}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 pl-8">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add comment input */}
            <div className="p-4 border-t border-white/10 bg-slate-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
                  placeholder="Write your comment..."
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newComment.trim()}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isSubmitting ? "..." : "Send"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
