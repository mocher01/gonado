"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface NodeCommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeTitle: string;
  isAuthenticated: boolean;
  onAddComment?: () => void;
  refreshTrigger?: number;
}

export function NodeCommentsPanel({
  isOpen,
  onClose,
  nodeId,
  nodeTitle,
  isAuthenticated,
  onAddComment,
  refreshTrigger = 0,
}: NodeCommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  useEffect(() => {
    if (isOpen && nodeId) {
      loadComments(0);
    }
  }, [isOpen, nodeId]);

  useEffect(() => {
    if (isOpen && nodeId && refreshTrigger > 0) {
      loadComments(0);
    }
  }, [refreshTrigger]);

  const loadComments = async (newOffset: number) => {
    setLoading(true);
    try {
      const response = await api.getComments("node", nodeId);
      if (response.comments) {
        if (newOffset === 0) {
          setComments(response.comments);
        } else {
          setComments(prev => [...prev, ...response.comments]);
        }
        setTotal(response.total || response.comments.length);
        setHasMore(response.has_more || false);
        setOffset(newOffset);
      } else if (Array.isArray(response)) {
        setComments(response);
        setTotal(response.length);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadComments(offset + limit);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Generate avatar gradient based on username
  const getAvatarGradient = (username: string) => {
    const gradients = [
      "from-amber-400 to-orange-500",
      "from-teal-400 to-cyan-500",
      "from-rose-400 to-pink-500",
      "from-emerald-400 to-green-500",
      "from-sky-400 to-blue-500",
    ];
    const index = username.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with grain texture */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{
              background: "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.85) 0%, rgba(2, 6, 23, 0.95) 100%)",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* Subtle animated grain */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </motion.div>

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(165deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 50%, rgba(8, 12, 28, 1) 100%)",
              boxShadow: "-20px 0 60px -10px rgba(0, 0, 0, 0.5), -4px 0 20px -2px rgba(251, 191, 36, 0.08)",
            }}
          >
            {/* Decorative top border glow */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            {/* Left edge glow */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent" />

            {/* Header */}
            <div className="flex-shrink-0 relative px-6 py-5">
              {/* Header background with subtle pattern */}
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  background: "linear-gradient(180deg, rgba(251, 191, 36, 0.05) 0%, transparent 100%)",
                }}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Decorative compass icon */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-400/70" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5" fill="currentColor" opacity="0.3" />
                        <polygon points="12,6 13,10 17,12 13,14 12,18 11,14 7,12 11,10" fill="currentColor" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-amber-400/60">
                      Trail Chronicles
                    </span>
                  </div>

                  <h2
                    className="text-xl font-bold text-transparent bg-clip-text truncate"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #f59e0b 100%)",
                    }}
                  >
                    {nodeTitle}
                  </h2>
                </div>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Stats bar */}
              <div className="relative flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-300">
                    {total} <span className="text-slate-500">{total === 1 ? "marker" : "markers"}</span>
                  </span>
                </div>

                {isAuthenticated && onAddComment && (
                  <motion.button
                    onClick={onAddComment}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="ml-auto flex items-center gap-2 text-xs px-4 py-2 rounded-full font-medium transition-all"
                    style={{
                      background: "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)",
                      border: "1px solid rgba(20, 184, 166, 0.3)",
                      color: "#5eead4",
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Leave a mark
                  </motion.button>
                )}
              </div>
            </div>

            {/* Decorative divider */}
            <div className="relative h-px mx-6">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/50 to-transparent" />
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-700 border border-slate-600" />
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {loading && comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400"
                  />
                  <p className="mt-4 text-sm text-slate-500">Gathering trail markers...</p>
                </div>
              ) : comments.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  {/* Empty state illustration */}
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/30" />
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    {/* Decorative sparkles */}
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400/40"
                    />
                  </div>

                  <h3 className="text-lg font-semibold text-slate-300 mb-2">Uncharted Territory</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    No traveler has left their mark here yet. Be the first explorer to share your wisdom.
                  </p>

                  {isAuthenticated && onAddComment && (
                    <motion.button
                      onClick={onAddComment}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-6 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                        color: "#fcd34d",
                      }}
                    >
                      Plant the first flag
                    </motion.button>
                  )}

                  {!isAuthenticated && (
                    <p className="mt-6 text-xs text-slate-600">
                      Sign in to leave your mark on this trail
                    </p>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment, index) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative"
                    >
                      {/* Comment card */}
                      <div
                        className="relative p-4 rounded-2xl transition-all duration-300"
                        style={{
                          background: "linear-gradient(135deg, rgba(51, 65, 85, 0.4) 0%, rgba(30, 41, 59, 0.4) 100%)",
                          border: "1px solid rgba(71, 85, 105, 0.3)",
                        }}
                      >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{
                            background: "linear-gradient(135deg, rgba(251, 191, 36, 0.03) 0%, transparent 50%)",
                          }}
                        />

                        <div className="relative flex items-start gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(comment.user.username)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg`}>
                            {comment.user.avatar_url ? (
                              <img
                                src={comment.user.avatar_url}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              comment.user.username[0].toUpperCase()
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-200">
                                {comment.user.display_name || comment.user.username}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {getTimeAgo(comment.created_at)}
                              </span>
                              {comment.is_edited && (
                                <span className="text-xs text-slate-600 italic">(edited)</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                              {comment.content}
                            </p>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-4 pl-4 border-l-2 border-amber-500/20 space-y-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex items-start gap-2">
                                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(reply.user.username)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                      {reply.user.avatar_url ? (
                                        <img
                                          src={reply.user.avatar_url}
                                          alt=""
                                          className="w-full h-full rounded-full object-cover"
                                        />
                                      ) : (
                                        reply.user.username[0].toUpperCase()
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-slate-300">
                                          {reply.user.display_name || reply.user.username}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {getTimeAgo(reply.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                        {reply.content}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Load more */}
                  {hasMore && (
                    <motion.button
                      onClick={loadMore}
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-3 text-sm font-medium text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full"
                          />
                          Loading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Explore more markers
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              )}
            </div>

            {/* Footer for non-authenticated */}
            {!isAuthenticated && (
              <div className="flex-shrink-0 p-5 border-t border-slate-700/30">
                <motion.a
                  href={`/login?returnUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="block w-full py-4 text-center rounded-2xl font-semibold text-white transition-all relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    boxShadow: "0 4px 20px -4px rgba(245, 158, 11, 0.4)",
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Join the expedition
                  </span>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                      animation: "shimmer 2s infinite",
                    }}
                  />
                </motion.a>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
