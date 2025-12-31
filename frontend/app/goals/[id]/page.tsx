"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BPMNQuestMap } from "@/components/quest-map";
import type { Goal, Node, User } from "@/types";

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goal");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Supporters Section (for public goals) */}
        {goal.visibility === "public" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Card variant="glass">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span>💬</span>
                <span>Community Support</span>
              </h3>
              <div className="text-center py-8 text-gray-400">
                <p>Be the first to cheer on this goal!</p>
                <p className="text-sm mt-2">Reactions and comments coming soon...</p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
