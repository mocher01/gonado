"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BPMNQuestMap } from "@/components/quest-map";
import { NodeEditModal } from "@/components/quest-map/NodeEditModal";
import {
  ElementalReactions,
  ElementalReactionsInline,
  FellowTravelers,
  QuestChronicle,
  SacredBoost,
  ProphecyBoard,
  NodeInteractionPopup,
} from "@/components/social";
import type { ElementType } from "@/components/social";
import type { Goal, Node, ChecklistItem } from "@/types";

// Social data types
interface Follower {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
}

interface ReactionCounts {
  fire: number;
  water: number;
  nature: number;
  lightning: number;
  magic: number;
}

interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  parentId: string | null;
  replies?: Comment[];
}

type ActivityType =
  | "goal_created"
  | "node_completed"
  | "goal_completed"
  | "comment_added"
  | "reaction_added"
  | "started_following"
  | "badge_earned"
  | "milestone_reached"
  | "resource_dropped"
  | "sacred_boost"
  | "prophecy_made"
  | "time_capsule_opened";

interface Activity {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  activityType: ActivityType;
  targetType?: string;
  targetId?: string;
  extraData: Record<string, unknown>;
  createdAt: string;
}

interface Prophecy {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  predictedDate: string;
  accuracyDays?: number | null;
  createdAt: string;
}

interface Booster {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// ============================================
// COMMUNITY PULSE - Always visible social indicators
// ============================================

function CommunityPulse({
  followers,
  reactions,
  recentActivity,
  totalBoosts,
}: {
  followers: Follower[];
  reactions: ReactionCounts;
  recentActivity: Activity[];
  totalBoosts: number;
}) {
  const totalReactions = Object.values(reactions).reduce((sum, c) => sum + c, 0);

  // Find dominant element
  const elements: { type: ElementType; emoji: string; color: string }[] = [
    { type: "fire", emoji: "🔥", color: "#f97316" },
    { type: "water", emoji: "💧", color: "#06b6d4" },
    { type: "nature", emoji: "🌿", color: "#22c55e" },
    { type: "lightning", emoji: "⚡", color: "#eab308" },
    { type: "magic", emoji: "✨", color: "#a855f7" },
  ];

  const dominantElement = elements.reduce((prev, curr) =>
    reactions[curr.type] > reactions[prev.type] ? curr : prev
  );
  const hasDominant = reactions[dominantElement.type] > 0;

  // Get recent cheer messages (last 3 activities)
  const recentCheers = recentActivity
    .filter(a => ["comment_added", "reaction_added", "sacred_boost", "started_following"].includes(a.activityType))
    .slice(0, 3);

  // No community activity yet
  if (followers.length === 0 && totalReactions === 0 && totalBoosts === 0) {
    return null;
  }

  return (
    <div className="absolute top-20 left-4 z-30 flex flex-col gap-3 max-w-xs">
      {/* Travelers on this journey */}
      {followers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {followers.slice(0, 4).map((f, i) => (
                <div
                  key={f.id}
                  className="w-8 h-8 rounded-full border-2 border-slate-900 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                  style={{ zIndex: 4 - i }}
                >
                  {f.avatarUrl ? (
                    <img src={f.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    f.username[0].toUpperCase()
                  )}
                </div>
              ))}
              {followers.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                  +{followers.length - 4}
                </div>
              )}
            </div>
            <div>
              <div className="text-white text-sm font-medium">
                {followers.length} {followers.length === 1 ? "Traveler" : "Travelers"}
              </div>
              <div className="text-slate-400 text-xs">following this quest</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Elemental Energy */}
      {totalReactions > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-2xl"
            >
              {dominantElement.emoji}
            </motion.div>
            <div>
              <div className="flex items-center gap-1">
                {elements.map(el => (
                  reactions[el.type] > 0 && (
                    <span key={el.type} className="text-sm">
                      {el.emoji}<span className="text-xs text-slate-400 ml-0.5">{reactions[el.type]}</span>
                    </span>
                  )
                ))}
              </div>
              <div className="text-xs" style={{ color: dominantElement.color }}>
                {hasDominant ? `${dominantElement.emoji} energy is strong!` : "Mixed energy"}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sacred Boosts */}
      {totalBoosts > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-amber-500/30"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-2xl"
            >
              ⚡
            </motion.div>
            <div>
              <div className="text-amber-400 text-sm font-medium">
                {totalBoosts} Sacred {totalBoosts === 1 ? "Boost" : "Boosts"}
              </div>
              <div className="text-slate-400 text-xs">XP power-ups received</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Activity Ticker */}
      {recentCheers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10"
        >
          <div className="text-xs text-slate-500 mb-2">Recent Activity</div>
          <div className="space-y-1.5">
            {recentCheers.map(activity => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs"
              >
                <span className="text-slate-400">
                  {activity.activityType === "comment_added" && "💬"}
                  {activity.activityType === "reaction_added" && "✨"}
                  {activity.activityType === "sacred_boost" && "⚡"}
                  {activity.activityType === "started_following" && "🚶"}
                </span>
                <span className="text-white font-medium truncate max-w-[100px]">
                  {activity.displayName || activity.username}
                </span>
                <span className="text-slate-500">
                  {activity.activityType === "comment_added" && "commented"}
                  {activity.activityType === "reaction_added" && "reacted"}
                  {activity.activityType === "sacred_boost" && "boosted"}
                  {activity.activityType === "started_following" && "joined"}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// VISITOR COMPONENTS - For supporting others
// ============================================

function VisitorSupportBar({
  isFollowing,
  onFollow,
  reactions,
  userReaction,
  onReact,
  totalBoosts,
  followersCount,
  commentsCount,
  onOpenPanel,
  disabled,
}: {
  isFollowing: boolean;
  onFollow: () => void;
  reactions: ReactionCounts;
  userReaction: ElementType | null;
  onReact: (type: ElementType) => void;
  totalBoosts: number;
  followersCount: number;
  commentsCount: number;
  onOpenPanel: () => void;
  disabled?: boolean;
}) {
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent"
    >
      <div className="max-w-4xl mx-auto px-4 pb-6 pt-12">
        {/* Main support bar */}
        <div className="bg-slate-800/90 backdrop-blur-lg rounded-2xl border border-white/10 p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            {/* Follow button */}
            <motion.button
              onClick={onFollow}
              disabled={disabled}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                isFollowing
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
            >
              <span>{isFollowing ? "✓" : "🚶"}</span>
              <span>{isFollowing ? "Following" : "Join Journey"}</span>
            </motion.button>

            {/* Quick reactions */}
            <div className="flex-1 flex items-center justify-center">
              <ElementalReactionsInline
                reactions={reactions}
                userReaction={userReaction}
                onReact={onReact}
                disabled={disabled}
              />
            </div>

            {/* Community stats & expand */}
            <motion.button
              onClick={onOpenPanel}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">🚶 {followersCount}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">💬 {commentsCount}</span>
                {totalBoosts > 0 && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-400">⚡ {totalBoosts}</span>
                  </>
                )}
              </div>
              <span className="text-white">→</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VisitorSupportPanel({
  isOpen,
  onClose,
  goalId,
  goalTitle,
  goalCreatedAt,
  goalCompleted,
  goalCompletedAt,
  followers,
  isFollowing,
  onFollow,
  reactions,
  userReaction,
  onReact,
  boostData,
  onBoost,
  comments,
  onAddComment,
  prophecies,
  userProphecy,
  onMakeProphecy,
  activities,
  disabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
  goalCreatedAt: string;
  goalCompleted: boolean;
  goalCompletedAt: string | null;
  followers: Follower[];
  isFollowing: boolean;
  onFollow: () => void;
  reactions: ReactionCounts;
  userReaction: ElementType | null;
  onReact: (type: ElementType) => void;
  boostData: {
    totalBoosts: number;
    boosters: Booster[];
    alreadyBoosted: boolean;
    boostsRemaining: number;
  };
  onBoost: () => void;
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  prophecies: Prophecy[];
  userProphecy: Prophecy | null;
  onMakeProphecy: (date: Date) => void;
  activities: Activity[];
  disabled?: boolean;
}) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmitComment = (e: React.FormEvent) => {
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 bg-slate-900 border-l border-white/10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Support This Quest</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-purple-300">
                  <span>🚶</span>
                  <span>{followers.length} travelers</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span>⚡</span>
                  <span>{boostData.totalBoosts} boosts</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-300">
                  <span>🔮</span>
                  <span>{prophecies.length} predictions</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Join Journey */}
              <div className="rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white mb-1">Join This Journey</h3>
                    <p className="text-sm text-slate-400">Follow along and get updates</p>
                  </div>
                  <motion.button
                    onClick={onFollow}
                    disabled={disabled}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                      isFollowing
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                    } ${disabled ? "opacity-50" : ""}`}
                    whileHover={!disabled ? { scale: 1.02 } : {}}
                    whileTap={!disabled ? { scale: 0.98 } : {}}
                  >
                    {isFollowing ? "✓ Following" : "🚶 Join"}
                  </motion.button>
                </div>

                {/* Travelers avatars */}
                {followers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <FellowTravelers
                      travelers={followers}
                      isFollowing={isFollowing}
                      showJoinButton={false}
                    />
                  </div>
                )}
              </div>

              {/* Sacred Boost */}
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 p-5">
                <SacredBoost
                  goalId={goalId}
                  boostsRemaining={boostData.boostsRemaining}
                  alreadyBoosted={boostData.alreadyBoosted}
                  totalBoostsReceived={boostData.totalBoosts}
                  boosters={boostData.boosters}
                  onBoost={onBoost}
                  disabled={disabled}
                />
              </div>

              {/* Elemental Reactions */}
              <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>✨</span>
                  <span>Send Energy</span>
                </h3>
                <ElementalReactions
                  targetType="goal"
                  targetId={goalId}
                  reactions={reactions}
                  userReaction={userReaction}
                  onReact={onReact}
                  disabled={disabled}
                />
              </div>

              {/* Trail Markers (Comments) */}
              <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>📍</span>
                  <span>Trail Markers</span>
                  <span className="text-sm font-normal text-slate-400">({comments.length})</span>
                </h3>

                {/* Comment list */}
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Be the first to leave encouragement!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="space-y-2">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {comment.avatarUrl ? (
                              <img src={comment.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              comment.username[0].toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {comment.displayName || comment.username}
                              </span>
                              <span className="text-xs text-slate-500">{getTimeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-300 mt-0.5">{comment.content}</p>
                            {!disabled && (
                              <button
                                onClick={() => setReplyingTo(comment.id)}
                                className="mt-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
                              >
                                Reply
                              </button>
                            )}

                            {replyingTo === comment.id && (
                              <div className="mt-2 flex gap-2">
                                <input
                                  type="text"
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="Reply..."
                                  className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleReply(comment.id)}
                                  className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg"
                                >
                                  Send
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-11 pl-3 border-l border-white/10 space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                  {reply.avatarUrl ? (
                                    <img src={reply.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    reply.username[0].toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-white truncate">
                                      {reply.displayName || reply.username}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{getTimeAgo(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-xs text-slate-300">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add comment form */}
                <form onSubmit={handleSubmitComment} className="flex gap-2 pt-3 border-t border-white/5">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={disabled ? "Log in to leave a message..." : "Leave encouragement..."}
                    disabled={disabled}
                    className="flex-1 px-4 py-2.5 text-sm bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || disabled}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50"
                  >
                    📍
                  </button>
                </form>
              </div>

              {/* Prophecy Board */}
              <ProphecyBoard
                goalId={goalId}
                prophecies={prophecies}
                actualCompletion={goalCompleted ? goalCompletedAt : null}
                userProphecy={userProphecy}
                onMakeProphecy={onMakeProphecy}
                isOwner={false}
              />

              {/* Activity Feed */}
              {activities.length > 0 && (
                <QuestChronicle
                  activities={activities}
                  goalTitle={goalTitle}
                  goalCreatedAt={goalCreatedAt}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// OWNER COMPONENTS - For managing own goal
// ============================================

function OwnerStatsBar({
  reactions,
  followersCount,
  commentsCount,
  totalBoosts,
  onViewStats,
}: {
  reactions: ReactionCounts;
  followersCount: number;
  commentsCount: number;
  totalBoosts: number;
  onViewStats: () => void;
}) {
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  const hasActivity = totalReactions > 0 || followersCount > 0 || commentsCount > 0 || totalBoosts > 0;

  if (!hasActivity) return null;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-4 right-20 z-30"
    >
      <motion.button
        onClick={onViewStats}
        className="flex items-center gap-3 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
        whileHover={{ scale: 1.02 }}
      >
        <span className="text-sm font-medium">Community Support</span>
        <div className="flex items-center gap-2 text-xs">
          {followersCount > 0 && <span>🚶 {followersCount}</span>}
          {totalReactions > 0 && <span>✨ {totalReactions}</span>}
          {commentsCount > 0 && <span>💬 {commentsCount}</span>}
          {totalBoosts > 0 && <span className="text-amber-400">⚡ {totalBoosts}</span>}
        </div>
      </motion.button>
    </motion.div>
  );
}

function OwnerStatsPanel({
  isOpen,
  onClose,
  goalTitle,
  followers,
  reactions,
  boostData,
  comments,
  prophecies,
  activities,
}: {
  isOpen: boolean;
  onClose: () => void;
  goalTitle: string;
  followers: Follower[];
  reactions: ReactionCounts;
  boostData: {
    totalBoosts: number;
    boosters: Booster[];
  };
  comments: Comment[];
  prophecies: Prophecy[];
  activities: Activity[];
}) {
  const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);
  const dominantReaction = Object.entries(reactions).reduce((a, b) => (b[1] > a[1] ? b : a), ["none", 0]);

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

  const reactionEmojis: Record<string, string> = {
    fire: "🔥",
    water: "💧",
    nature: "🌿",
    lightning: "⚡",
    magic: "✨",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 bg-slate-900 border-l border-white/10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Community Support</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-400">See who's supporting your journey</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-purple-500/10 rounded-xl p-4 text-center border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">{followers.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Travelers</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-white/5">
                  <div className="text-2xl font-bold text-white">{totalReactions}</div>
                  <div className="text-xs text-slate-400 mt-1">Reactions</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-white/5">
                  <div className="text-2xl font-bold text-white">{comments.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Comments</div>
                </div>
                <div className="bg-amber-500/10 rounded-xl p-4 text-center border border-amber-500/20">
                  <div className="text-2xl font-bold text-amber-400">{boostData.totalBoosts}</div>
                  <div className="text-xs text-slate-400 mt-1">Boosts</div>
                </div>
              </div>

              {/* Reaction breakdown */}
              {totalReactions > 0 && (
                <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-5">
                  <h3 className="font-semibold text-white mb-4">Energy Received</h3>
                  <div className="space-y-2">
                    {Object.entries(reactions)
                      .filter(([_, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-xl">{reactionEmojis[type]}</span>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                              style={{ width: `${(count / totalReactions) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-400 w-8 text-right">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Boosters */}
              {boostData.boosters.length > 0 && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>⚡</span>
                    <span>Sacred Boosters</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {boostData.boosters.map((booster) => (
                      <div
                        key={booster.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white text-[10px] font-bold">
                          {booster.avatarUrl ? (
                            <img src={booster.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            booster.username[0].toUpperCase()
                          )}
                        </div>
                        <span className="text-sm text-amber-300">{booster.displayName || booster.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Travelers */}
              {followers.length > 0 && (
                <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>🚶</span>
                    <span>Fellow Travelers</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {followers.map((follower) => (
                      <div
                        key={follower.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                          {follower.avatarUrl ? (
                            <img src={follower.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            follower.username[0].toUpperCase()
                          )}
                        </div>
                        <span className="text-sm text-purple-300">{follower.displayName || follower.username}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments received */}
              {comments.length > 0 && (
                <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>💬</span>
                    <span>Messages of Support</span>
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-slate-900/50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.avatarUrl ? (
                            <img src={comment.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            comment.username[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {comment.displayName || comment.username}
                            </span>
                            <span className="text-xs text-slate-500">{getTimeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-sm text-slate-300 mt-0.5">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prophecies */}
              {prophecies.length > 0 && (
                <div className="rounded-2xl bg-purple-500/10 border border-purple-500/20 p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>🔮</span>
                    <span>Prophecies</span>
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">{prophecies.length} predictions for when you'll complete this quest</p>
                  <div className="space-y-2">
                    {prophecies.slice(0, 5).map((prophecy) => (
                      <div key={prophecy.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{prophecy.displayName || prophecy.username}</span>
                        <span className="text-purple-400">
                          {new Date(prophecy.predictedDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Social state
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [reactions, setReactions] = useState<ReactionCounts>({
    fire: 0, water: 0, nature: 0, lightning: 0, magic: 0,
  });
  const [userReaction, setUserReaction] = useState<ElementType | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [prophecies, setProphecies] = useState<Prophecy[]>([]);
  const [userProphecy, setUserProphecy] = useState<Prophecy | null>(null);
  const [boostData, setBoostData] = useState({
    totalBoosts: 0,
    boosters: [] as Booster[],
    alreadyBoosted: false,
    boostsRemaining: 3,
  });

  // Panel state
  const [showVisitorPanel, setShowVisitorPanel] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);

  // Node interaction popup state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodePopupPosition, setNodePopupPosition] = useState({ x: 0, y: 0 });
  const [showNodePopup, setShowNodePopup] = useState(false);
  const [nodeSocialData, setNodeSocialData] = useState<Record<string, any>>({});
  const [selectedNodeSummary, setSelectedNodeSummary] = useState<any>(null);
  const [selectedNodeUserReaction, setSelectedNodeUserReaction] = useState<string | null>(null);

  const goalId = params.id as string;
  const isOwner = user && goal && user.id === goal.user_id;
  const isPublic = goal?.visibility === "public";

  useEffect(() => {
    if (goalId) loadGoal();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      const [goalData, nodesData] = await Promise.all([
        api.getGoal(goalId),
        api.getGoalNodes(goalId).catch(() => []),
      ]);
      setGoal(goalData);
      setNodes(nodesData);

      if (goalData.visibility === "public") {
        loadSocialData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goal");
    } finally {
      setLoading(false);
    }
  };

  const loadSocialData = useCallback(async () => {
    try {
      const [
        followersData,
        reactionsData,
        commentsData,
        activityData,
        propheciesData,
        boostsData,
        nodesSocialData,
      ] = await Promise.all([
        api.getGoalFollowers(goalId).catch(() => ({ followers: [], total: 0 })),
        api.getReactions("goal", goalId).catch(() => ({ counts: {}, user_reaction: null })),
        api.getComments("goal", goalId).catch(() => []),
        api.getGoalActivity(goalId).catch(() => ({ activities: [] })),
        api.getProphecyBoard(goalId).catch(() => ({ prophecies: [] })),
        api.getGoalBoosts(goalId).catch(() => ({ boosts: [], total: 0 })),
        api.getGoalNodesSocialSummary(goalId).catch(() => ({ nodes: {} })),
      ]);

      // Set node social data for the quest map
      setNodeSocialData(nodesSocialData.nodes || {});

      setFollowers(
        (followersData.followers || []).map((f: any) => ({
          id: f.id,
          username: f.username,
          displayName: f.display_name,
          avatarUrl: f.avatar_url,
          followedAt: f.created_at,
        }))
      );

      setReactions({
        fire: reactionsData.counts?.fire || 0,
        water: reactionsData.counts?.water || 0,
        nature: reactionsData.counts?.nature || 0,
        lightning: reactionsData.counts?.lightning || 0,
        magic: reactionsData.counts?.magic || 0,
      });
      setUserReaction((reactionsData.user_reaction as ElementType) || null);

      setComments(
        (commentsData || []).map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          username: c.user?.username || "unknown",
          displayName: c.user?.display_name || null,
          avatarUrl: c.user?.avatar_url || null,
          content: c.content,
          createdAt: c.created_at,
          parentId: c.parent_id,
          replies: c.replies?.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            username: r.user?.username || "unknown",
            displayName: r.user?.display_name || null,
            avatarUrl: r.user?.avatar_url || null,
            content: r.content,
            createdAt: r.created_at,
            parentId: r.parent_id,
          })),
        }))
      );

      setActivities(
        (activityData.activities || []).map((a: any) => ({
          id: a.id,
          userId: a.user_id,
          username: a.username,
          displayName: a.display_name,
          avatarUrl: a.avatar_url,
          activityType: a.activity_type as ActivityType,
          targetType: a.target_type,
          targetId: a.target_id,
          extraData: a.extra_data || {},
          createdAt: a.created_at,
        }))
      );

      setProphecies(
        (propheciesData.prophecies || []).map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          predictedDate: p.predicted_date,
          accuracyDays: p.accuracy_days,
          createdAt: p.created_at,
        }))
      );

      setBoostData({
        totalBoosts: boostsData.total || 0,
        boosters: (boostsData.boosts || []).map((b: any) => ({
          id: b.id,
          username: b.username,
          displayName: b.display_name,
          avatarUrl: b.avatar_url,
          createdAt: b.created_at,
        })),
        alreadyBoosted: boostsData.already_boosted || false,
        boostsRemaining: 3,
      });

      if (user) {
        try {
          const followStatus = await api.checkFollowStatus("goal", goalId);
          setIsFollowing(followStatus.is_following);

          const boostStatus = await api.getBoostStatus();
          setBoostData((prev) => ({ ...prev, boostsRemaining: boostStatus.boosts_remaining || 3 }));

          const userProphecyData = propheciesData.prophecies?.find((p: any) => p.user_id === user.id);
          if (userProphecyData) {
            setUserProphecy({
              id: userProphecyData.id,
              userId: userProphecyData.user_id,
              username: userProphecyData.username,
              displayName: userProphecyData.display_name,
              avatarUrl: userProphecyData.avatar_url,
              predictedDate: userProphecyData.predicted_date,
              accuracyDays: userProphecyData.accuracy_days,
              createdAt: userProphecyData.created_at,
            });
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("Failed to load social data:", err);
    }
  }, [goalId, user]);

  // Goal management handlers
  const handleGeneratePlan = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.generatePlan(goalId);
      const [nodesData, goalData] = await Promise.all([
        api.getGoalNodes(goalId),
        api.getGoal(goalId),
      ]);
      setNodes(nodesData);
      setGoal(goalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteNode = async (nodeId: string) => {
    try {
      await api.completeNode(nodeId);
      const nodesData = await api.getGoalNodes(goalId);
      setNodes(nodesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete node");
    }
  };

  const handleChecklistToggle = async (nodeId: string, itemId: string, completed: boolean) => {
    try {
      setNodes(prev => prev.map(node => {
        if (node.id !== nodeId) return node;
        const checklist = node.extra_data?.checklist || [];
        return {
          ...node,
          extra_data: {
            ...node.extra_data,
            checklist: checklist.map(item => item.id === itemId ? { ...item, completed } : item),
          },
        };
      }));
      await api.updateChecklistItem(nodeId, itemId, completed);
    } catch (err) {
      const nodesData = await api.getGoalNodes(goalId);
      setNodes(nodesData);
      setError(err instanceof Error ? err.message : "Failed to update checklist");
    }
  };

  const handleNodePositionChange = async (nodeId: string, x: number, y: number) => {
    try {
      setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, position_x: x, position_y: y } : node));
      await api.updateNode(nodeId, { position_x: x, position_y: y });
    } catch (err) {
      console.error("Failed to save position:", err);
    }
  };

  const handleNodeEdit = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNode(node);
      setIsEditModalOpen(true);
    }
  };

  const handleNodeSave = async (nodeId: string, data: { title: string; description: string; checklist: ChecklistItem[] }) => {
    try {
      setNodes(prev => prev.map(node =>
        node.id === nodeId
          ? { ...node, title: data.title, description: data.description, extra_data: { ...node.extra_data, checklist: data.checklist } }
          : node
      ));
      await api.updateNode(nodeId, { title: data.title, description: data.description, extra_data: { checklist: data.checklist } });
    } catch (err) {
      const nodesData = await api.getGoalNodes(goalId);
      setNodes(nodesData);
      setError(err instanceof Error ? err.message : "Failed to save changes");
      throw err;
    }
  };

  // Social handlers
  const handleFollow = async () => {
    if (!user) return;
    try {
      if (isFollowing) {
        await api.unfollowTarget("goal", goalId);
        setIsFollowing(false);
        setFollowers((prev) => prev.filter((f) => f.id !== user.id));
      } else {
        await api.followTarget("goal", goalId);
        setIsFollowing(true);
        setFollowers((prev) => [
          ...prev,
          { id: user.id, username: user.username, displayName: user.display_name || null, avatarUrl: user.avatar_url || null, followedAt: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  const handleReaction = async (reactionType: ElementType) => {
    if (!user) return;
    try {
      if (userReaction === reactionType) {
        await api.removeReaction("goal", goalId);
        setReactions((prev) => ({ ...prev, [reactionType]: Math.max(0, prev[reactionType] - 1) }));
        setUserReaction(null);
      } else {
        await api.addReaction("goal", goalId, reactionType);
        setReactions((prev) => {
          const updated = { ...prev };
          if (userReaction) updated[userReaction] = Math.max(0, updated[userReaction] - 1);
          updated[reactionType] = updated[reactionType] + 1;
          return updated;
        });
        setUserReaction(reactionType);
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!user) return;
    try {
      const result = await api.addComment("goal", goalId, content, parentId);
      const newComment: Comment = {
        id: result.id,
        userId: user.id,
        username: user.username,
        displayName: user.display_name || null,
        avatarUrl: user.avatar_url || null,
        content,
        createdAt: new Date().toISOString(),
        parentId: parentId || null,
      };

      if (parentId) {
        setComments((prev) =>
          prev.map((c) => c.id === parentId ? { ...c, replies: [...(c.replies || []), newComment] } : c)
        );
      } else {
        setComments((prev) => [newComment, ...prev]);
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleBoost = async () => {
    if (!user) return;
    try {
      await api.giveSacredBoost(goalId);
      setBoostData((prev) => ({
        ...prev,
        totalBoosts: prev.totalBoosts + 1,
        alreadyBoosted: true,
        boostsRemaining: prev.boostsRemaining - 1,
        boosters: [
          ...prev.boosters,
          { id: user.id, username: user.username, displayName: user.display_name || null, avatarUrl: user.avatar_url || null, createdAt: new Date().toISOString() },
        ],
      }));
    } catch (err) {
      console.error("Failed to give boost:", err);
    }
  };

  const handleMakeProphecy = async (date: Date) => {
    if (!user) return;
    try {
      const result = await api.makeProphecy(goalId, date.toISOString().split("T")[0]);
      const newProphecy: Prophecy = {
        id: result.id,
        userId: user.id,
        username: user.username,
        displayName: user.display_name || null,
        avatarUrl: user.avatar_url || null,
        predictedDate: date.toISOString(),
        createdAt: new Date().toISOString(),
      };
      setProphecies((prev) => [...prev, newProphecy]);
      setUserProphecy(newProphecy);
    } catch (err) {
      console.error("Failed to make prophecy:", err);
    }
  };

  // Node interaction handlers
  const handleNodeClick = async (node: Node, position: { x: number; y: number }) => {
    setSelectedNode(node);
    setNodePopupPosition(position);
    setShowNodePopup(true);
    setSelectedNodeSummary(null);
    setSelectedNodeUserReaction(null);

    // Fetch detailed summary for this node
    try {
      const summary = await api.getNodeSocialSummary(node.id);
      setSelectedNodeSummary({
        reactions: summary.reaction_counts || { fire: 0, water: 0, nature: 0, lightning: 0, magic: 0 },
        reactions_total: summary.total_reactions || 0,
        comments_count: summary.comment_count || 0,
        resources_count: 0, // TODO: Add resources count to API
        top_comments: (summary.recent_reactors || []).map((r: any) => ({
          id: r.id,
          username: r.username,
          content: "",
          reply_count: 0,
        })),
      });
      setSelectedNodeUserReaction(summary.user_reaction || null);
    } catch (err) {
      console.error("Failed to load node social summary:", err);
      // Set empty summary on error
      setSelectedNodeSummary({
        reactions: { fire: 0, water: 0, nature: 0, lightning: 0, magic: 0 },
        reactions_total: 0,
        comments_count: 0,
        resources_count: 0,
        top_comments: [],
      });
    }
  };

  const handleNodeReaction = async (reactionType: string) => {
    if (!user || !selectedNode) return;
    try {
      if (selectedNodeUserReaction === reactionType) {
        // Remove reaction
        await api.removeReaction("node", selectedNode.id);
        setSelectedNodeUserReaction(null);
        setSelectedNodeSummary((prev: any) => {
          if (!prev) return prev;
          const newReactions = { ...prev.reactions };
          newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1);
          return {
            ...prev,
            reactions: newReactions,
            reactions_total: Math.max(0, prev.reactions_total - 1),
          };
        });
      } else {
        // Add/change reaction
        await api.addReaction("node", selectedNode.id, reactionType);
        setSelectedNodeSummary((prev: any) => {
          if (!prev) return prev;
          const newReactions = { ...prev.reactions };
          // Decrement previous reaction if exists
          if (selectedNodeUserReaction) {
            newReactions[selectedNodeUserReaction] = Math.max(0, newReactions[selectedNodeUserReaction] - 1);
          }
          // Increment new reaction
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
          return {
            ...prev,
            reactions: newReactions,
            reactions_total: selectedNodeUserReaction ? prev.reactions_total : prev.reactions_total + 1,
          };
        });
        setSelectedNodeUserReaction(reactionType);
      }

      // Update nodeSocialData for the quest map
      setNodeSocialData((prev) => ({
        ...prev,
        [selectedNode.id]: {
          ...prev[selectedNode.id],
          reaction_counts: selectedNodeSummary?.reactions,
          total_reactions: selectedNodeSummary?.reactions_total,
        },
      }));
    } catch (err) {
      console.error("Failed to toggle node reaction:", err);
    }
  };

  const handleNodeViewAllComments = () => {
    // TODO: Open full comments panel/modal for the node
    console.log("View all comments for node:", selectedNode?.id);
  };

  const handleNodeAddComment = async () => {
    // TODO: Open comment input modal
    if (!user || !selectedNode) return;
    const content = prompt("Enter your comment:");
    if (content?.trim()) {
      try {
        await api.addComment("node", selectedNode.id, content.trim());
        setSelectedNodeSummary((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            comments_count: prev.comments_count + 1,
          };
        });
      } catch (err) {
        console.error("Failed to add node comment:", err);
      }
    }
  };

  const handleNodeDropResource = async () => {
    // TODO: Open resource drop modal
    console.log("Drop resource for node:", selectedNode?.id);
  };

  const handleNodeBoost = async () => {
    // TODO: Implement node-level boost
    console.log("Boost node:", selectedNode?.id);
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/goals/${goalId}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = (platform: string) => {
    const text = `Check out my goal: ${goal?.title}`;
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank", "width=600,height=400");
    setShowShareMenu(false);
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Error state
  if (error && !goal) {
    return (
      <div className="min-h-screen p-8 max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card variant="glass" className="text-center py-12">
          <div className="text-6xl mb-4">😕</div>
          <h3 className="text-xl font-semibold text-white mb-2">Goal not found</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  if (!goal) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Quest Map - Full Screen */}
      {nodes.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-10">
          <BPMNQuestMap
            nodes={nodes}
            worldTheme={goal.world_theme || "mountain"}
            goalTitle={goal.title}
            onCompleteNode={isOwner ? handleCompleteNode : undefined}
            onChecklistToggle={isOwner ? handleChecklistToggle : undefined}
            onNodePositionChange={isOwner ? handleNodePositionChange : undefined}
            onNodeEdit={isOwner ? handleNodeEdit : undefined}
            onNodeSocialClick={isPublic ? handleNodeClick : undefined}
            nodeSocialData={nodeSocialData}
          />

          {/* Top bar overlays */}
          <div className="absolute top-4 left-4 z-30">
            <Link
              href={user ? "/dashboard" : "/discover"}
              className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
            >
              <span>←</span>
              <span>{user ? "Dashboard" : "Discover"}</span>
            </Link>
          </div>

          {/* Share button (public goals only) */}
          {isPublic && (
            <div className="absolute top-4 right-4 z-30">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <span>📤</span>
                <span>Share</span>
              </button>
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-xl p-2 min-w-[200px]"
                  >
                    <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                      <span>{copied ? "✓" : "🔗"}</span>
                      <span className="text-white">{copied ? "Copied!" : "Copy Link"}</span>
                    </button>
                    <button onClick={() => handleShare("twitter")} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                      <span>🐦</span>
                      <span className="text-white">Twitter</span>
                    </button>
                    <button onClick={() => handleShare("facebook")} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                      <span>📘</span>
                      <span className="text-white">Facebook</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* COMMUNITY PULSE - Visible social indicators for public goals */}
          {isPublic && (
            <CommunityPulse
              followers={followers}
              reactions={reactions}
              recentActivity={activities}
              totalBoosts={boostData.totalBoosts}
            />
          )}

          {/* OWNER VIEW: Stats bar at top */}
          {isOwner && isPublic && (
            <OwnerStatsBar
              reactions={reactions}
              followersCount={followers.length}
              commentsCount={comments.length}
              totalBoosts={boostData.totalBoosts}
              onViewStats={() => setShowOwnerPanel(true)}
            />
          )}

          {/* VISITOR VIEW: Support bar at bottom */}
          {!isOwner && isPublic && (
            <VisitorSupportBar
              isFollowing={isFollowing}
              onFollow={handleFollow}
              reactions={reactions}
              userReaction={userReaction}
              onReact={handleReaction}
              totalBoosts={boostData.totalBoosts}
              followersCount={followers.length}
              commentsCount={comments.length}
              onOpenPanel={() => setShowVisitorPanel(true)}
              disabled={!user}
            />
          )}
        </motion.div>
      ) : (
        /* No Plan Yet */
        <div className="max-w-6xl mx-auto px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <Link href={user ? "/dashboard" : "/discover"} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <span>←</span>
              <span>{user ? "Dashboard" : "Discover"}</span>
            </Link>
          </div>

          {generating ? (
            <Card variant="glass" className="text-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-16 h-16 mx-auto mb-6 text-5xl">
                ✨
              </motion.div>
              <h3 className="text-2xl font-semibold text-white mb-2">Creating your personalized quest...</h3>
              <p className="text-gray-400">Designing milestones and mapping your journey</p>
            </Card>
          ) : (
            <Card variant="glass" className="text-center py-16">
              <div className="text-7xl mb-6">🗺️</div>
              <h3 className="text-2xl font-semibold text-white mb-3">Your Quest Awaits</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Generate a personalized roadmap with AI-powered milestones to guide your journey</p>
              {isOwner && (
                <Button size="lg" onClick={handleGeneratePlan}>
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    <span>Generate Quest Map</span>
                  </span>
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      {/* VISITOR PANEL */}
      <VisitorSupportPanel
        isOpen={showVisitorPanel}
        onClose={() => setShowVisitorPanel(false)}
        goalId={goalId}
        goalTitle={goal.title}
        goalCreatedAt={goal.created_at}
        goalCompleted={goal.status === "completed"}
        goalCompletedAt={goal.updated_at}
        followers={followers}
        isFollowing={isFollowing}
        onFollow={handleFollow}
        reactions={reactions}
        userReaction={userReaction}
        onReact={handleReaction}
        boostData={boostData}
        onBoost={handleBoost}
        comments={comments}
        onAddComment={handleAddComment}
        prophecies={prophecies}
        userProphecy={userProphecy}
        onMakeProphecy={handleMakeProphecy}
        activities={activities}
        disabled={!user}
      />

      {/* OWNER PANEL */}
      <OwnerStatsPanel
        isOpen={showOwnerPanel}
        onClose={() => setShowOwnerPanel(false)}
        goalTitle={goal.title}
        followers={followers}
        reactions={reactions}
        boostData={boostData}
        comments={comments}
        prophecies={prophecies}
        activities={activities}
      />

      {/* Node Edit Modal */}
      <NodeEditModal
        node={editingNode}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingNode(null);
        }}
        onSave={handleNodeSave}
      />

      {/* Node Interaction Popup */}
      {selectedNode && (
        <NodeInteractionPopup
          node={{
            id: selectedNode.id,
            title: selectedNode.title,
            status: selectedNode.status,
            description: selectedNode.description ?? undefined,
          }}
          isOpen={showNodePopup}
          onClose={() => {
            setShowNodePopup(false);
            setSelectedNode(null);
          }}
          position={nodePopupPosition}
          isOwner={!!isOwner}
          isAuthenticated={!!user}
          socialSummary={selectedNodeSummary}
          userReaction={selectedNodeUserReaction}
          onReact={handleNodeReaction}
          onViewAllComments={handleNodeViewAllComments}
          onAddComment={handleNodeAddComment}
          onDropResource={handleNodeDropResource}
          onBoost={handleNodeBoost}
        />
      )}
    </div>
  );
}
