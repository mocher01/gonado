"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TrailMarkers - Comments on the Quest Map
 * ========================================
 *
 * Instead of a sidebar comment section, comments appear as
 * "trail markers" positioned near nodes on the map.
 *
 * Visual: A small marker icon that expands to show comments.
 */

interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  replies?: Comment[];
}

interface TrailMarkersProps {
  nodeId: string;
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  position?: "left" | "right" | "bottom";
}

export function TrailMarkers({
  nodeId,
  comments,
  onAddComment,
  position = "bottom",
}: TrailMarkersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment("");
    }
  };

  const handleReply = (parentId: string) => {
    if (replyContent.trim()) {
      onAddComment(replyContent.trim(), parentId);
      setReplyContent("");
      setReplyingTo(null);
    }
  };

  const positionStyles = {
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  };

  return (
    <div className="relative">
      {/* Trail marker icon */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
          comments.length > 0
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            : "bg-slate-700/50 text-slate-400 border border-white/5 hover:border-white/10"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sm">📍</span>
        <span className="text-xs font-medium">{comments.length || "+"}</span>
      </motion.button>

      {/* Expanded comments panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute z-50 w-80 max-h-96 overflow-hidden rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-2xl ${positionStyles[position]}`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>📍</span>
                Trail Markers
                <span className="text-slate-400 font-normal">({comments.length})</span>
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400"
              >
                ×
              </button>
            </div>

            {/* Comments list */}
            <div className="max-h-64 overflow-y-auto p-3 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Be the first to leave a trail marker!
                </p>
              ) : (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={() => setReplyingTo(comment.id)}
                    isReplying={replyingTo === comment.id}
                    replyContent={replyContent}
                    onReplyContentChange={setReplyContent}
                    onSubmitReply={() => handleReply(comment.id)}
                    onCancelReply={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  />
                ))
              )}
            </div>

            {/* Add comment form */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a trail marker..."
                  className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-colors"
                >
                  📍
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onReply: () => void;
  isReplying: boolean;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  depth?: number;
}

function CommentItem({
  comment,
  onReply,
  isReplying,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  onCancelReply,
  depth = 0,
}: CommentItemProps) {
  const timeAgo = getTimeAgo(comment.createdAt);

  return (
    <div className={`${depth > 0 ? "ml-4 pl-3 border-l border-white/10" : ""}`}>
      <div className="flex gap-2">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.avatarUrl ? (
            <img
              src={comment.avatarUrl}
              alt={comment.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            comment.username[0].toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-white truncate">
              {comment.displayName || comment.username}
            </span>
            <span className="text-xs text-slate-500">{timeAgo}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-slate-300 mt-0.5 leading-snug">
            {comment.content}
          </p>

          {/* Reply button */}
          {depth === 0 && (
            <button
              onClick={onReply}
              className="mt-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
            >
              Reply
            </button>
          )}

          {/* Reply form */}
          {isReplying && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => onReplyContentChange(e.target.value)}
                placeholder="Reply..."
                className="flex-1 px-2 py-1 text-xs bg-slate-800 border border-white/10 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                autoFocus
              />
              <button
                onClick={onSubmitReply}
                disabled={!replyContent.trim()}
                className="px-2 py-1 text-xs bg-amber-500 text-white rounded disabled:opacity-50"
              >
                Send
              </button>
              <button
                onClick={onCancelReply}
                className="px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={() => {}}
              isReplying={false}
              replyContent=""
              onReplyContentChange={() => {}}
              onSubmitReply={() => {}}
              onCancelReply={() => {}}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Compact trail marker badge for node cards
 */
export function TrailMarkerBadge({
  count,
  onClick,
}: {
  count: number;
  onClick?: () => void;
}) {
  if (count === 0) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
      >
        <span>📍</span>
        <span>Trail marker</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
    >
      <span className="text-sm">📍</span>
      <span className="text-xs font-medium">{count}</span>
    </button>
  );
}
