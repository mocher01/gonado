"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { Goal } from "@/types";

export default function DiscoverPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const response = await api.getGoals();
      setGoals(response.goals || []);
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string | null) => {
    const icons: Record<string, string> = {
      health: "💪",
      career: "💼",
      education: "📚",
      finance: "💰",
      relationships: "❤️",
      creativity: "🎨",
      personal: "🌱",
      other: "✨",
    };
    return icons[category || "other"] || "🎯";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Gonado
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/discover" className="text-white font-medium">
              Discover
            </Link>
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-8 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Discover Amazing Goals
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get inspired by what others are achieving. Follow their journeys, cheer them on, and start your own quest.
          </p>
        </motion.div>
      </div>

      {/* Goals Grid */}
      <div className="max-w-6xl mx-auto px-8 pb-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full"
            />
          </div>
        ) : goals.length === 0 ? (
          <Card variant="glass" className="text-center py-16">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No public goals yet
            </h3>
            <p className="text-gray-400 mb-6">
              Be the first to share your journey with the world!
            </p>
            <Link
              href="/register"
              className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium"
            >
              Create Your First Goal
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/goals/${goal.id}`}>
                  <Card hover variant="glass" className="h-full group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-2xl">
                        {getCategoryIcon(goal.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              goal.status === "active"
                                ? "bg-green-500/20 text-green-400"
                                : goal.status === "completed"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {goal.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                        {goal.target_date && (
                          <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                            <span>🎯</span>
                            <span>
                              {new Date(goal.target_date).toLocaleDateString()}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
