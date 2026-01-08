"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ProfileHeader,
  AchieverCard,
  HelperCard,
  BadgeGrid,
} from "@/components/profile";
import type { UserProfile, Goal } from "@/types";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user profile
      const profileData = await api.getUserProfile(username);
      setProfile(profileData);

      // Fetch user's public goals
      try {
        const goalsData = await api.getUserGoals(username);
        // Filter to only show public goals unless it's own profile
        const visibleGoals = isOwnProfile
          ? goalsData.goals
          : goalsData.goals.filter((g) => g.visibility === "public");
        setGoals(visibleGoals);
      } catch (err) {
        console.error("Failed to load goals:", err);
        setGoals([]);
      }

      // Check if following (if logged in and not own profile)
      if (currentUser && !isOwnProfile) {
        try {
          const followStatus = await api.checkFollowStatus(
            "user",
            profileData.id
          );
          setIsFollowing(followStatus.is_following);
        } catch (err) {
          console.error("Failed to check follow status:", err);
        }
      }
    } catch (err: any) {
      console.error("Failed to load profile:", err);
      setError(err.message || "User not found");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowClick = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!profile) return;

    try {
      if (isFollowing) {
        await api.unfollowTarget("user", profile.id);
        setIsFollowing(false);
      } else {
        await api.followTarget("user", profile.id);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  const handleEditClick = () => {
    router.push("/settings/profile");
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

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card variant="glass" className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            User Not Found
          </h1>
          <p className="text-gray-400 mb-6">
            {error || "This user doesn't exist or has been removed."}
          </p>
          <Button onClick={() => router.push("/discover")}>
            Discover Users
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          onEditClick={handleEditClick}
          onFollowClick={handleFollowClick}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <AchieverCard profile={profile} />
          <HelperCard profile={profile} />
        </div>

        {/* Public Goals */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4">
            {isOwnProfile ? "Your Goals" : "Public Goals"}
          </h2>

          {goals.length === 0 ? (
            <Card variant="glass" className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No {isOwnProfile ? "" : "public "}goals yet
              </h3>
              <p className="text-gray-400">
                {isOwnProfile
                  ? "Start your journey by creating your first goal!"
                  : "This user hasn't shared any public goals yet."}
              </p>
              {isOwnProfile && (
                <Button
                  className="mt-4"
                  onClick={() => router.push("/goals/new")}
                >
                  Create Your First Goal
                </Button>
              )}
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
                  <Card hover variant="glass" className="h-full">
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
                          Target:{" "}
                          {new Date(goal.target_date).toLocaleDateString()}
                        </div>
                      )}
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* All Badges */}
        {profile.badges.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <BadgeGrid badges={profile.badges} />
          </motion.section>
        )}
      </div>
    </div>
  );
}
