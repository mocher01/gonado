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
  FellowTravelers,
  QuestChronicle,
  SacredBoost,
  ProphecyBoard,
} from "@/components/social";
import type { ElementType } from "@/components/social";
import type { Goal, Node, User, ChecklistItem } from "@/types";

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

// Goal-level comment section component
function GoalComments({
  comments,
  onAddComment,
  disabled,
}: {
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => void;
  disabled?: boolean;
}) {
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
    <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>📍</span>
          <span>Trail Markers</span>
          <span className="text-sm font-normal text-slate-400">({comments.length})</span>
        </h3>
      </div>

      <div className="p-5">
        {/* Comment list */}
        <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Be the first to leave a trail marker!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {comment.displayName || comment.username}
                      </span>
                      <span className="text-xs text-slate-500">{getTimeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-300 mt-0.5">{comment.content}</p>
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="mt-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      Reply
                    </button>

                    {/* Reply form */}
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
                          disabled={!replyContent.trim()}
                          className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg disabled:opacity-50"
                        >
                          Send
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent("");
                          }}
                          className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
                        >
                          Cancel
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
                            <img
                              src={reply.avatarUrl}
                              alt={reply.username}
                              className="w-full h-full rounded-full object-cover"
                            />
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
        <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-white/5">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={disabled ? "Log in to leave a trail marker..." : "Leave a trail marker..."}
            disabled={disabled}
            className="flex-1 px-4 py-2.5 text-sm bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || disabled}
            className="px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-colors"
          >
            📍
          </button>
        </form>
      </div>
    </div>
  );
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth(false); // Don't require auth for public goals
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalOwner, setGoalOwner] = useState<User | null>(null);
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
    fire: 0,
    water: 0,
    nature: 0,
    lightning: 0,
    magic: 0,
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
  const [showSocialPanel, setShowSocialPanel] = useState(false);

  const goalId = params.id as string;
  const isOwner = user && goal && user.id === goal.user_id;

  useEffect(() => {
    if (goalId) {
      loadGoal();
    }
  }, [goalId]);

  const loadGoal = async () => {
    try {
      const [goalData, nodesData] = await Promise.all([
        api.getGoal(goalId),
        api.getGoalNodes(goalId).catch(() => []),
      ]);
      setGoal(goalData);
      setNodes(nodesData);

      // Load social data for public goals
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
      ] = await Promise.all([
        api.getGoalFollowers(goalId).catch(() => ({ followers: [], total: 0 })),
        api.getReactions("goal", goalId).catch(() => ({ reactions: [], user_reaction: null })),
        api.getComments("goal", goalId).catch(() => []),
        api.getGoalActivity(goalId).catch(() => []),
        api.getProphecyBoard(goalId).catch(() => ({ prophecies: [], closest_prophet: null })),
        api.getGoalBoosts(goalId).catch(() => ({ total_boosts: 0, boosters: [] })),
      ]);

      // Transform followers
      setFollowers(
        (followersData.followers || []).map((f: any) => ({
          id: f.id,
          username: f.username,
          displayName: f.display_name,
          avatarUrl: f.avatar_url,
          followedAt: f.created_at,
        }))
      );

      // Transform reactions to counts object
      const reactionCounts: ReactionCounts = {
        fire: reactionsData.counts?.fire || 0,
        water: reactionsData.counts?.water || 0,
        nature: reactionsData.counts?.nature || 0,
        lightning: reactionsData.counts?.lightning || 0,
        magic: reactionsData.counts?.magic || 0,
      };
      setReactions(reactionCounts);
      setUserReaction((reactionsData.user_reaction as ElementType) || null);

      // Transform comments - user info is nested in user object
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

      // Transform activities
      setActivities(
        (activityData || []).map((a: any) => ({
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

      // Transform prophecies
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

      // Transform boosts
      setBoostData({
        totalBoosts: boostsData.total_boosts || 0,
        boosters: (boostsData.boosters || []).map((b: any) => ({
          id: b.id,
          username: b.username,
          displayName: b.display_name,
          avatarUrl: b.avatar_url,
          createdAt: b.created_at,
        })),
        alreadyBoosted: boostsData.already_boosted || false,
        boostsRemaining: 3,
      });

      // Check if user follows this goal
      if (user) {
        try {
          const followStatus = await api.checkFollowStatus("goal", goalId);
          setIsFollowing(followStatus.is_following);

          // Get boost status
          const boostStatus = await api.getBoostStatus();
          setBoostData((prev) => ({
            ...prev,
            boostsRemaining: boostStatus.remaining || 3,
          }));

          // Find user's prophecy
          const userProphecyData = propheciesData.prophecies?.find(
            (p: any) => p.user_id === user.id
          );
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
        } catch {
          // User not logged in or error - ignore
        }
      }
    } catch (err) {
      console.error("Failed to load social data:", err);
    }
  }, [goalId, user]);

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
      // Optimistic update
      setNodes(prev => prev.map(node => {
        if (node.id !== nodeId) return node;
        const checklist = node.extra_data?.checklist || [];
        return {
          ...node,
          extra_data: {
            ...node.extra_data,
            checklist: checklist.map(item =>
              item.id === itemId ? { ...item, completed } : item
            ),
          },
        };
      }));

      // API call
      await api.updateChecklistItem(nodeId, itemId, completed);
    } catch (err) {
      // Revert on error
      const nodesData = await api.getGoalNodes(goalId);
      setNodes(nodesData);
      setError(err instanceof Error ? err.message : "Failed to update checklist");
    }
  };

  const handleNodePositionChange = async (nodeId: string, x: number, y: number) => {
    try {
      // Optimistic update
      setNodes(prev => prev.map(node =>
        node.id === nodeId ? { ...node, position_x: x, position_y: y } : node
      ));

      // Persist to backend
      await api.updateNode(nodeId, { position_x: x, position_y: y });
    } catch (err) {
      console.error("Failed to save position:", err);
      // Don't revert - position is cosmetic and will be recalculated on reload anyway
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
      // Optimistic update
      setNodes(prev => prev.map(node =>
        node.id === nodeId
          ? {
              ...node,
              title: data.title,
              description: data.description,
              extra_data: { ...node.extra_data, checklist: data.checklist },
            }
          : node
      ));

      // Persist to backend
      await api.updateNode(nodeId, {
        title: data.title,
        description: data.description,
        extra_data: { checklist: data.checklist },
      });
    } catch (err) {
      // Revert on error
      const nodesData = await api.getGoalNodes(goalId);
      setNodes(nodesData);
      setError(err instanceof Error ? err.message : "Failed to save changes");
      throw err;
    }
  };

  // Social action handlers
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
          {
            id: user.id,
            username: user.username,
            displayName: user.display_name || null,
            avatarUrl: user.avatar_url || null,
            followedAt: new Date().toISOString(),
          },
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
        // Remove reaction
        await api.removeReaction("goal", goalId);
        setReactions((prev) => ({
          ...prev,
          [reactionType]: Math.max(0, prev[reactionType] - 1),
        }));
        setUserReaction(null);
      } else {
        // Add/change reaction
        await api.addReaction("goal", goalId, reactionType);
        setReactions((prev) => {
          const updated = { ...prev };
          // Remove old reaction if any
          if (userReaction) {
            updated[userReaction] = Math.max(0, updated[userReaction] - 1);
          }
          // Add new reaction
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
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          )
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
          {
            id: user.id,
            username: user.username,
            displayName: user.display_name || null,
            avatarUrl: user.avatar_url || null,
            createdAt: new Date().toISOString(),
          },
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

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/goals/${goalId}`
    : "";

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
    if (urls[platform]) {
      window.open(urls[platform], "_blank", "width=600,height=400");
    }
    setShowShareMenu(false);
  };

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

  const completedNodes = nodes.filter((n) => n.status === "completed").length;
  const progress = nodes.length > 0 ? (completedNodes / nodes.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 to-transparent" />
        <div className="max-w-6xl mx-auto px-8 pt-8 pb-12 relative">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href={user ? "/dashboard" : "/discover"}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <span>&larr;</span>
              <span>{user ? "Dashboard" : "Discover"}</span>
            </Link>

            {/* Share Button */}
            {goal.visibility === "public" && (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2"
                >
                  <span>📤</span>
                  <span>Share</span>
                </Button>

                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-full mt-2 bg-slate-800 border border-white/10 rounded-xl p-2 min-w-[200px] z-50"
                    >
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>{copied ? "✓" : "🔗"}</span>
                        <span className="text-white">{copied ? "Copied!" : "Copy Link"}</span>
                      </button>
                      <button
                        onClick={() => handleShare("twitter")}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>🐦</span>
                        <span className="text-white">Twitter</span>
                      </button>
                      <button
                        onClick={() => handleShare("facebook")}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>📘</span>
                        <span className="text-white">Facebook</span>
                      </button>
                      <button
                        onClick={() => handleShare("linkedin")}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>💼</span>
                        <span className="text-white">LinkedIn</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Goal Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  goal.status === "active"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : goal.status === "completed"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : goal.status === "planning"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                }`}
              >
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </span>
              {goal.category && (
                <span className="px-3 py-1 rounded-full text-sm bg-white/10 text-gray-300 border border-white/10">
                  {goal.category}
                </span>
              )}
              {goal.visibility === "public" && (
                <span className="px-3 py-1 rounded-full text-sm bg-primary-500/20 text-primary-400 border border-primary-500/30">
                  🌍 Public
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {goal.title}
            </h1>

            {goal.description && (
              <p className="text-xl text-gray-400 mb-6">{goal.description}</p>
            )}

            {goal.target_date && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <span>🎯</span>
                <span className="text-gray-300">
                  Target: {new Date(goal.target_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 pb-16">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Generating State */}
        {generating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card variant="glass" className="text-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-6 text-5xl"
              >
                ✨
              </motion.div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Creating your personalized quest...
              </h3>
              <p className="text-gray-400">
                Designing milestones and mapping your journey
              </p>
            </Card>
          </motion.div>
        )}

        {/* No Plan Yet */}
        {!generating && nodes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card variant="glass" className="text-center py-16">
              <div className="text-7xl mb-6">🗺️</div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Your Quest Awaits
              </h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Generate a personalized roadmap with AI-powered milestones to guide your journey
              </p>
              {isOwner && (
                <Button size="lg" onClick={handleGeneratePlan}>
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    <span>Generate Quest Map</span>
                  </span>
                </Button>
              )}
            </Card>
          </motion.div>
        )}

        {/* Quest Map - Full Screen */}
        {nodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-10"
          >
            <BPMNQuestMap
              nodes={nodes}
              worldTheme={goal.world_theme || "mountain"}
              goalTitle={goal.title}
              onCompleteNode={isOwner ? handleCompleteNode : undefined}
              onChecklistToggle={isOwner ? handleChecklistToggle : undefined}
              onNodePositionChange={isOwner ? handleNodePositionChange : undefined}
              onNodeEdit={isOwner ? handleNodeEdit : undefined}
            />
            {/* Back button overlay */}
            <div className="absolute top-4 left-4 z-30">
              <Link
                href={user ? "/dashboard" : "/discover"}
                className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
              >
                <span>←</span>
                <span>{user ? "Dashboard" : "Discover"}</span>
              </Link>
            </div>
            {/* Share button overlay */}
            {goal.visibility === "public" && (
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
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>{copied ? "✓" : "🔗"}</span>
                        <span className="text-white">{copied ? "Copied!" : "Copy Link"}</span>
                      </button>
                      <button
                        onClick={() => handleShare("twitter")}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>🐦</span>
                        <span className="text-white">Twitter</span>
                      </button>
                      <button
                        onClick={() => handleShare("facebook")}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>📘</span>
                        <span className="text-white">Facebook</span>
                      </button>
                      <button
                        onClick={() => handleShare("linkedin")}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span>💼</span>
                        <span className="text-white">LinkedIn</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Social Panel Toggle Button (for quest map view) */}
        {nodes.length > 0 && goal.visibility === "public" && (
          <motion.button
            onClick={() => setShowSocialPanel(!showSocialPanel)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full text-white font-medium shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg">💬</span>
            <span>Community</span>
            {(Object.values(reactions).reduce((sum, count) => sum + count, 0) + comments.length + followers.length) > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {Object.values(reactions).reduce((sum, count) => sum + count, 0) + comments.length + followers.length}
              </span>
            )}
          </motion.button>
        )}

        {/* Social Panel Overlay */}
        <AnimatePresence>
          {showSocialPanel && goal.visibility === "public" && (
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 bg-slate-900/95 backdrop-blur-lg border-l border-white/10 overflow-y-auto"
            >
              {/* Panel header */}
              <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>💬</span>
                  <span>Community Support</span>
                </h2>
                <button
                  onClick={() => setShowSocialPanel(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Fellow Travelers (Followers) */}
                <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 p-5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>🚶</span>
                    <span>Fellow Travelers</span>
                  </h3>
                  <FellowTravelers
                    travelers={followers}
                    isFollowing={isFollowing}
                    onFollow={!isOwner ? handleFollow : undefined}
                  />
                </div>

                {/* Elemental Reactions */}
                <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 p-5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>✨</span>
                    <span>Elemental Reactions</span>
                  </h3>
                  <ElementalReactions
                    targetType="goal"
                    targetId={goalId}
                    reactions={reactions}
                    userReaction={userReaction}
                    onReact={handleReaction}
                    disabled={!user || !!isOwner}
                  />
                </div>

                {/* Sacred Boost */}
                {!isOwner && (
                  <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 p-5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span>⚡</span>
                      <span>Sacred Boost</span>
                    </h3>
                    <SacredBoost
                      goalId={goalId}
                      boostsRemaining={boostData.boostsRemaining}
                      alreadyBoosted={boostData.alreadyBoosted}
                      totalBoostsReceived={boostData.totalBoosts}
                      boosters={boostData.boosters}
                      onBoost={handleBoost}
                      disabled={!user}
                    />
                  </div>
                )}

                {/* Trail Markers (Comments) */}
                <GoalComments
                  comments={comments}
                  onAddComment={handleAddComment}
                  disabled={!user}
                />

                {/* Prophecy Board */}
                <ProphecyBoard
                  goalId={goalId}
                  prophecies={prophecies}
                  actualCompletion={goal.status === "completed" ? goal.updated_at : null}
                  userProphecy={userProphecy}
                  onMakeProphecy={handleMakeProphecy}
                  isOwner={!!isOwner}
                />

                {/* Quest Chronicle (Activity Feed) */}
                {activities.length > 0 && (
                  <QuestChronicle
                    activities={activities}
                    goalTitle={goal.title}
                    goalCreatedAt={goal.created_at}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backdrop for social panel */}
        <AnimatePresence>
          {showSocialPanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSocialPanel(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Supporters Section (for non-quest-map view) */}
        {nodes.length === 0 && goal.visibility === "public" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 space-y-6"
          >
            {/* Fellow Travelers */}
            <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 p-5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>🚶</span>
                <span>Fellow Travelers</span>
              </h3>
              <FellowTravelers
                travelers={followers}
                isFollowing={isFollowing}
                onFollow={!isOwner ? handleFollow : undefined}
              />
            </div>

            {/* Reactions & Comments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Elemental Reactions */}
              <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 p-5">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>✨</span>
                  <span>Elemental Reactions</span>
                </h3>
                <ElementalReactions
                  targetType="goal"
                  targetId={goalId}
                  reactions={reactions}
                  userReaction={userReaction}
                  onReact={handleReaction}
                  disabled={!user || !!isOwner}
                />
              </div>

              {/* Sacred Boost */}
              {!isOwner && (
                <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 p-5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span>⚡</span>
                    <span>Sacred Boost</span>
                  </h3>
                  <SacredBoost
                    goalId={goalId}
                    boostsRemaining={boostData.boostsRemaining}
                    alreadyBoosted={boostData.alreadyBoosted}
                    totalBoostsReceived={boostData.totalBoosts}
                    boosters={boostData.boosters}
                    onBoost={handleBoost}
                    disabled={!user}
                  />
                </div>
              )}
            </div>

            {/* Trail Markers */}
            <GoalComments
              comments={comments}
              onAddComment={handleAddComment}
              disabled={!user}
            />

            {/* Prophecy Board */}
            <ProphecyBoard
              goalId={goalId}
              prophecies={prophecies}
              actualCompletion={goal.status === "completed" ? goal.updated_at : null}
              userProphecy={userProphecy}
              onMakeProphecy={handleMakeProphecy}
              isOwner={!!isOwner}
            />

            {/* Quest Chronicle */}
            {activities.length > 0 && (
              <QuestChronicle
                activities={activities}
                goalTitle={goal.title}
                goalCreatedAt={goal.created_at}
              />
            )}
          </motion.div>
        )}
      </div>

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
    </div>
  );
}
