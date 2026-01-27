"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { MobileFeed, SwipeIndicator } from "@/components/mobile";
import { FilterBar, SearchBar } from "@/components/discover";
import type { Goal } from "@/types";

/**
 * DiscoverPage - Browse Public Goals with Filters & Search
 * =========================================================
 *
 * Shows public goals with responsive layouts:
 * - Mobile: TikTok-style vertical swipe feed
 * - Desktop: Traditional grid layout with filters
 * - Search, category filter, sort, and needs help toggle
 */

// Custom hook for viewport detection
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

function DiscoverPageContent() {
  const { user, isAuthenticated, logout } = useAuth(false); // Don't require auth
  const router = useRouter();
  const searchParams = useSearchParams();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // Filter state from URL params
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [sort, setSort] = useState<'newest' | 'trending' | 'almost_done'>(
    (searchParams.get("sort") as 'newest' | 'trending' | 'almost_done') || "newest"
  );
  const [needsHelp, setNeedsHelp] = useState(searchParams.get("needs_help") === "true");

  // Load goals when filters change
  useEffect(() => {
    loadGoals();
  }, [search, category, sort, needsHelp]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (sort !== "newest") params.set("sort", sort);
    if (needsHelp) params.set("needs_help", "true");

    const queryString = params.toString();
    const newUrl = queryString ? `/discover?${queryString}` : "/discover";
    router.replace(newUrl, { scroll: false });
  }, [search, category, sort, needsHelp, router]);

  // Show swipe hint on mobile after goals load
  useEffect(() => {
    if (isMobile && goals.length > 1 && !loading) {
      const hintShown = localStorage.getItem("discover-swipe-hint-shown");
      if (!hintShown) {
        setShowSwipeHint(true);
      }
    }
  }, [isMobile, goals.length, loading]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const response = await api.getGoals({
        search: search || undefined,
        category: category || undefined,
        sort: sort !== "newest" ? sort : undefined,
        needs_help: needsHelp || undefined,
      });
      setGoals(response.goals || []);
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadGoals();
  }, [search, category, sort, needsHelp]);

  const handleClearFilters = () => {
    setSearch("");
    setCategory("");
    setSort("newest");
    setNeedsHelp(false);
  };

  const handleDismissSwipeHint = () => {
    setShowSwipeHint(false);
    localStorage.setItem("discover-swipe-hint-shown", "true");
  };

  const getCategoryIcon = (category: string | null) => {
    const icons: Record<string, string> = {
      health: "💪",
      career: "🚀",
      education: "📚",
      finance: "💰",
      relationships: "👥",
      creativity: "🎨",
      personal: "🌟",
      other: "📌",
    };
    return icons[category || "other"] || "📌";
  };

  // Mobile View - TikTok-style swipe feed
  if (isMobile) {
    return (
      <>
        {/* Swipe indicator hint */}
        {showSwipeHint && (
          <SwipeIndicator
            direction="vertical"
            visible={showSwipeHint}
            onDismiss={handleDismissSwipeHint}
            storageKey="discover-swipe-hint-shown"
          />
        )}

        {/* Mobile header overlay */}
        <div className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-b from-slate-900/90 to-transparent">
          <header className="px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent"
            >
              Gonado
            </Link>
            <nav className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium"
                  >
                    Join
                  </Link>
                </>
              )}
            </nav>
          </header>
        </div>

        {/* Mobile feed */}
        <MobileFeed
          goals={goals}
          onRefresh={handleRefresh}
          isLoading={loading}
        />
      </>
    );
  }

  // Desktop View - Traditional grid
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
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  My Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
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

      {/* Search and Filters */}
      <div className="max-w-6xl mx-auto px-8">
        <SearchBar
          value={search}
          onChange={setSearch}
          isSearching={loading}
        />

        <FilterBar
          category={category}
          sort={sort}
          needsHelp={needsHelp}
          onCategoryChange={setCategory}
          onSortChange={setSort}
          onNeedsHelpChange={setNeedsHelp}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Results count */}
      <div className="max-w-6xl mx-auto px-8 py-4">
        <p className="text-gray-400">
          {loading ? 'Searching...' : `${goals.length} goal${goals.length !== 1 ? 's' : ''} found`}
        </p>
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
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No goals match your search
            </h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your filters or be the first to share a journey in this category!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleClearFilters}
                className="px-6 py-3 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
              >
                Clear Filters
              </button>
              <Link
                href="/register"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium"
              >
                Start Your Journey
              </Link>
            </div>
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
                          {goal.visibility === "public" && (
                            <span
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400"
                              title="Public - visible to everyone"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          )}
                          {goal.visibility === "private" && (
                            <span
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400"
                              title="Private - only you can see"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                        {/* Progress bar */}
                        {typeof goal.progress === 'number' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-400">Progress</span>
                              <span className={`font-medium ${
                                goal.progress >= 75 ? 'text-green-400' :
                                goal.progress >= 50 ? 'text-yellow-400' :
                                'text-gray-400'
                              }`}>{goal.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  goal.progress >= 75 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                                  goal.progress >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                                  'bg-gradient-to-r from-primary-500 to-accent-500'
                                }`}
                                style={{ width: `${goal.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {goal.target_date && (
                          <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                            <span>📅</span>
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

// Wrapper component with Suspense boundary
export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}
