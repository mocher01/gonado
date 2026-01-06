"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * TrailMarkers - Comments on the Quest Map (Issue #65)
 * ====================================================
 *
 * Visual trail markers that appear on nodes showing comment activity.
 * Features:
 * - Hover to preview recent comments
 * - Click to open full comment thread
 * - Visual indicators for comment count and recency
 * - Owner responses shown distinctly
 * - Inline quick comment input
 */

interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  isOwnerResponse?: boolean;
  replies?: Comment[];
}

interface TrailMarkersProps {
  nodeId: string;
  comments: Comment[];
  commentsCount: number;
  hasMore?: boolean;
  isAuthenticated?: boolean;
  ownerId?: string;
  onAddComment: (content: string, parentId?: string) => void;
  onViewAll: () => void;
  position?: "left" | "right" | "bottom";
}

export function TrailMarkers({
  nodeId,
  comments,
  commentsCount,
  hasMore = false,
  isAuthenticated = false,
  ownerId,
  onAddComment,
  onViewAll,
  position = "bottom",
}: TrailMarkersProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if there are recent comments (within last 24 hours)
  const hasRecentComments = comments.some(comment => {
    const commentDate = new Date(comment.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  });

  // Handle hover with delay
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
    left: "right-full mr-3 top-0",
    right: "left-full ml-3 top-0",
    bottom: "top-full mt-3 left-1/2 -translate-x-1/2",
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={`trail-marker-${nodeId}`}
    >
      {/* Trail marker icon */}
      <motion.button
        onClick={() => {
          setIsExpanded(!isExpanded);
          setIsHovered(false);
        }}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
          commentsCount > 0
            ? hasRecentComments
              ? "bg-amber-500/25 text-amber-300 border border-amber-400/40"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
            : "bg-slate-700/50 text-slate-400 border border-white/5 hover:border-white/15"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="trail-marker-button"
      >
        {/* Marker icon with pulse for recent activity */}
        <span className="relative text-sm">
          {hasRecentComments && (
            <motion.span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
          <span role="img" aria-label="trail marker">*</span>
        </span>
        <span className="text-xs font-semibold">
          {commentsCount > 0 ? commentsCount : "+"}
        </span>
      </motion.button>

      {/* Hover preview - Quick peek at recent comments */}
      <AnimatePresence>
        {isHovered && !isExpanded && comments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-72 rounded-xl bg-slate-900/98 backdrop-blur-md border border-white/15 shadow-xl overflow-hidden ${positionStyles[position]}`}
            data-testid="comment-preview"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              setIsHovered(true);
            }}
            onMouseLeave={handleMouseLeave}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <span role="img" aria-label="trail markers">*</span>
                  Trail Markers
                </span>
                <span className="text-[10px] text-slate-500">{commentsCount} total</span>
              </div>
            </div>

            {/* Preview comments */}
            <div className="p-2.5 space-y-2 max-h-48 overflow-y-auto">
              {comments.slice(0, 2).map((comment) => (
                <CommentPreviewItem
                  key={comment.id}
                  comment={comment}
                  isOwnerResponse={comment.userId === ownerId}
                />
              ))}
              {comments.length > 2 && (
                <p className="text-[10px] text-slate-500 text-center py-1">
                  +{commentsCount - 2} more markers...
                </p>
              )}
            </div>

            {/* Click to expand hint */}
            <div className="px-3 py-2 border-t border-white/5 bg-slate-800/50">
              <button
                onClick={() => {
                  setIsExpanded(true);
                  setIsHovered(false);
                }}
                className="w-full text-[10px] text-amber-400 hover:text-amber-300 font-medium"
              >
                Click to view all & add comment...
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded comments panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute z-50 w-80 max-h-[28rem] overflow-hidden rounded-xl bg-slate-900/98 backdrop-blur-md border border-white/15 shadow-2xl ${positionStyles[position]}`}
            data-testid="trail-marker-panel"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span role="img" aria-label="trail markers">*</span>
                Trail Markers
                <span className="text-slate-400 font-normal">({commentsCount})</span>
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                data-testid="close-trail-marker-panel"
              >
                x
              </button>
            </div>

            {/* Comments list */}
            <div className="max-h-64 overflow-y-auto p-3 space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <span className="text-2xl" role="img" aria-label="empty trail">*</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">Uncharted territory</p>
                  <p className="text-xs text-slate-500">
                    Be the first to leave a trail marker!
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    isOwnerResponse={comment.userId === ownerId}
                    onReply={() => setReplyingTo(comment.id)}
                    isReplying={replyingTo === comment.id}
                    replyContent={replyContent}
                    onReplyContentChange={setReplyContent}
                    onSubmitReply={() => handleReply(comment.id)}
                    onCancelReply={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                    isAuthenticated={isAuthenticated}
                  />
                ))
              )}

              {hasMore && (
                <button
                  onClick={onViewAll}
                  className="w-full py-2 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  data-testid="view-all-comments"
                >
                  View all {commentsCount} markers...
                </button>
              )}
            </div>

            {/* Add comment form */}
            {isAuthenticated ? (
              <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-slate-800/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Leave a trail marker..."
                    className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    data-testid="trail-marker-input"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-colors"
                    data-testid="trail-marker-submit"
                  >
                    <span role="img" aria-label="post marker">*</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 border-t border-white/5 bg-slate-800/30 text-center">
                <p className="text-xs text-slate-500">
                  Sign in to leave a trail marker
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact preview item for hover state
 */
function CommentPreviewItem({
  comment,
  isOwnerResponse,
}: {
  comment: Comment;
  isOwnerResponse?: boolean;
}) {
  return (
    <div className="flex gap-2 items-start">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
          isOwnerResponse
            ? "bg-gradient-to-br from-amber-400 to-orange-500 ring-1 ring-amber-300/50"
            : "bg-gradient-to-br from-slate-500 to-slate-600"
        }`}
      >
        {comment.avatarUrl ? (
          <img
            src={comment.avatarUrl}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          comment.username[0].toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium truncate ${isOwnerResponse ? "text-amber-300" : "text-white"}`}>
            {comment.displayName || comment.username}
            {isOwnerResponse && <span className="ml-1 text-amber-400/70">(Owner)</span>}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight mt-0.5">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  isOwnerResponse?: boolean;
  onReply: () => void;
  isReplying: boolean;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  isAuthenticated: boolean;
  depth?: number;
}

function CommentItem({
  comment,
  isOwnerResponse,
  onReply,
  isReplying,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  onCancelReply,
  isAuthenticated,
  depth = 0,
}: CommentItemProps) {
  const timeAgo = getTimeAgo(comment.createdAt);
  const isRecent = isWithin24Hours(comment.createdAt);

  return (
    <div className={`${depth > 0 ? "ml-4 pl-3 border-l border-white/10" : ""}`}>
      <div className="flex gap-2">
        {/* Avatar with owner badge */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              isOwnerResponse
                ? "bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-300/30"
                : "bg-gradient-to-br from-slate-500 to-slate-600"
            }`}
          >
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
          {isRecent && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium truncate ${isOwnerResponse ? "text-amber-300" : "text-white"}`}>
              {comment.displayName || comment.username}
            </span>
            {isOwnerResponse && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Owner
              </span>
            )}
            <span className={`text-xs ${isRecent ? "text-emerald-400" : "text-slate-500"}`}>
              {timeAgo}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm text-slate-300 mt-1 leading-snug whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Reply button */}
          {depth === 0 && isAuthenticated && (
            <button
              onClick={onReply}
              className="mt-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors"
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
                className="flex-1 px-2 py-1.5 text-xs bg-slate-800 border border-white/10 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                autoFocus
              />
              <button
                onClick={onSubmitReply}
                disabled={!replyContent.trim()}
                className="px-2 py-1.5 text-xs bg-amber-500 text-white rounded disabled:opacity-50 hover:bg-amber-600 transition-colors"
              >
                Send
              </button>
              <button
                onClick={onCancelReply}
                className="px-2 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
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
              isOwnerResponse={reply.userId === comment.userId}
              onReply={() => {}}
              isReplying={false}
              replyContent=""
              onReplyContentChange={() => {}}
              onSubmitReply={() => {}}
              onCancelReply={() => {}}
              isAuthenticated={false}
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

function isWithin24Hours(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

/**
 * Compact trail marker badge for node cards
 */
export function TrailMarkerBadge({
  count,
  hasRecent,
  onClick,
}: {
  count: number;
  hasRecent?: boolean;
  onClick?: () => void;
}) {
  if (count === 0) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
        data-testid="trail-marker-badge-empty"
      >
        <span role="img" aria-label="trail marker">*</span>
        <span>Trail marker</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
        hasRecent
          ? "bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
          : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
      }`}
      data-testid="trail-marker-badge"
    >
      {hasRecent && (
        <motion.span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
      <span className="text-sm" role="img" aria-label="trail marker">*</span>
      <span className="text-xs font-medium">{count}</span>
    </button>
  );
}

/**
 * Inline quick comment input for fast commenting
 */
export function QuickCommentInput({
  nodeId,
  onSubmit,
  isAuthenticated,
  placeholder = "Quick comment...",
}: {
  nodeId: string;
  onSubmit: (content: string) => void;
  isAuthenticated: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex gap-2"
      initial={false}
      animate={{ width: isFocused ? "100%" : "auto" }}
      data-testid={`quick-comment-${nodeId}`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => !value && setIsFocused(false)}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] px-3 py-1.5 text-xs bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
        data-testid="quick-comment-input"
      />
      <AnimatePresence>
        {value.trim() && (
          <motion.button
            type="submit"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
            data-testid="quick-comment-submit"
          >
            <span role="img" aria-label="send">*</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
