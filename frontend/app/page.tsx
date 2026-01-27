"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Goal } from "@/types";

// Seeded random to avoid hydration mismatch (server/client produce same values)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await api.getGoals({ sort: "newest" });
        setGoals(response.goals.slice(0, 6));
        setError(false);
      } catch (err) {
        console.error("Failed to fetch goals:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Gonado
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/discover" className="text-gray-400 hover:text-white transition-colors">
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

      <div className="flex flex-col items-center p-8 pt-24 py-24 md:py-32">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl"
      >
        <motion.h1
          className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent mb-6"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Gonado
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-gray-300 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Transform your goals into epic journeys.
          <br />
          <span className="text-primary-400">AI-powered planning</span> meets{" "}
          <span className="text-accent-400">community support</span>.
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🗺️</div>
            <h3 className="text-lg font-semibold mb-2">Quest Map</h3>
            <p className="text-gray-400 text-sm">
              Your goals become visual journeys through stunning landscapes
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI Planning</h3>
            <p className="text-gray-400 text-sm">
              Get personalized roadmaps crafted by AI to optimize your path
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🔥</div>
            <h3 className="text-lg font-semibold mb-2">Community</h3>
            <p className="text-gray-400 text-sm">
              Get help, share progress, and celebrate wins with supporters
            </p>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Link
            href="/register"
            className="px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full font-semibold text-lg hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300 hover:scale-105"
          >
            Start Your Journey
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white/10 backdrop-blur-sm rounded-full font-semibold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
          >
            Sign In
          </Link>
        </motion.div>
      </motion.div>
      </div>

      {/* Inline Discovery Section */}
      <section className="w-full bg-slate-900/50 py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-4">
              See What Others Are Achieving
            </h2>
            <p className="text-gray-400">Join a community of goal achievers on their epic journeys</p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 animate-pulse"
                >
                  <div className="h-6 bg-white/10 rounded mb-3"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-white/10 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center">
              <p className="text-gray-400 mb-6">Unable to load goals at the moment</p>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full font-semibold hover:shadow-lg hover:shadow-primary-500/25 transition-all"
              >
                <span>View All Goals</span>
                <span>&rarr;</span>
              </Link>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
              >
                {goals.map((goal, index) => (
                  <Link
                    key={goal.id}
                    href={`/goals/${goal.id}`}
                    className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-2 mb-2">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-gray-400 text-sm line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {goal.category && (
                        <span className="inline-block px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-xs font-medium">
                          {goal.category}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        goal.status === "active"
                          ? "bg-green-500/20 text-green-400"
                          : goal.status === "completed"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {goal.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="text-center"
              >
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm rounded-full font-semibold text-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  <span>View All Goals</span>
                  <span>&rarr;</span>
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* Floating elements animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary-500/30 rounded-full"
            style={{
              left: `${seededRandom(i) * 100}%`,
              top: `${seededRandom(i + 100) * 100}%`,
            }}
            animate={{
              y: [0, seededRandom(i + 200) * -200],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + seededRandom(i + 300) * 2,
              repeat: Infinity,
              repeatType: "reverse",
              delay: seededRandom(i + 400) * 2,
            }}
          />
        ))}
      </div>
    </main>
  );
}
