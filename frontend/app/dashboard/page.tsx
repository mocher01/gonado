"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { XPDisplay } from "@/components/gamification/XPDisplay";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import type { Goal } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadGoals();
    }
  }, [isAuthenticated, user]);

  const loadGoals = async () => {
    try {
      // Pass user_id to get all user's goals including private ones
      const response = await api.getGoals({ user_id: user?.id });
      setGoals(response.goals || []);
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setGoalsLoading(false);
    }
  };

  const handleDelete = async (goalId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this goal? This cannot be undone.")) {
      return;
    }
    setDeletingId(goalId);
    try {
      await api.deleteGoal(goalId);
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error("Failed to delete goal:", error);
      alert("Failed to delete goal");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user.display_name || user.username}!
          </h1>
          <p className="text-gray-400 mt-1">
            Ready to continue your journey?
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StreakCounter days={user.streak_days} />
          <Link
            href="/discover"
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>🌍</span>
            <span>Discover</span>
          </Link>
          <Button variant="ghost" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </motion.header>

      {/* Stats Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card variant="glass" className="max-w-md">
          <XPDisplay xp={user.xp} level={user.level} />
        </Card>
      </motion.section>

      {/* Quick Stats Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <Card variant="default">
          <div className="text-4xl mb-2">🎯</div>
          <div className="text-2xl font-bold text-white">{activeGoals.length}</div>
          <div className="text-gray-400">Active Goals</div>
        </Card>
        <Card variant="default">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-2xl font-bold text-white">{completedGoals.length}</div>
          <div className="text-gray-400">Completed Goals</div>
        </Card>
        <Card variant="default">
          <div className="text-4xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-white">{user.xp.toLocaleString()}</div>
          <div className="text-gray-400">Total XP</div>
        </Card>
      </motion.section>

      {/* Goals Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your Goals</h2>
          <Button onClick={() => router.push("/goals/new")}>
            Create New Goal
          </Button>
        </div>

        {goalsLoading ? (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"
            />
          </div>
        ) : goals.length === 0 ? (
          <Card variant="glass" className="text-center py-12">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No goals yet
            </h3>
            <p className="text-gray-400 mb-6">
              Start your journey by creating your first goal, or discover what others are working on!
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={() => router.push("/goals/new")}>
                Create Your First Goal
              </Button>
              <Button variant="secondary" onClick={() => router.push("/discover")}>
                🌍 Discover Quests
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card hover variant="glass" className="h-full relative group">
                  <Link href={`/goals/${goal.id}`} className="block">
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          goal.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : goal.status === "completed"
                            ? "bg-blue-500/20 text-blue-400"
                            : goal.status === "planning"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {goal.status}
                      </span>
                      {goal.category && (
                        <span className="text-xs text-gray-500">
                          {goal.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                    {goal.target_date && (
                      <div className="mt-3 text-xs text-gray-500">
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                      </div>
                    )}
                  </Link>
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(goal.id, e)}
                    disabled={deletingId === goal.id}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300"
                    title="Delete goal"
                  >
                    {deletingId === goal.id ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full"
                      />
                    ) : (
                      <span>🗑️</span>
                    )}
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
