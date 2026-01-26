"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";

// Seeded random to avoid hydration mismatch (server/client produce same values)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

export default function Home() {
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

      <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-24">
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

        {/* Discover CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="text-gray-500 mb-4">See what others are achieving</p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
          >
            <span>Explore Public Goals</span>
            <span>&rarr;</span>
          </Link>
        </motion.div>
      </div>

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
