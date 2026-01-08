"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { getXpForNextLevel } from "@/lib/utils";
import type { UserProfile } from "@/types";

interface AchieverCardProps {
  profile: UserProfile;
}

export function AchieverCard({ profile }: AchieverCardProps) {
  const nextLevelXp = getXpForNextLevel(profile.level);
  const prevLevelXp = profile.level > 1 ? getXpForNextLevel(profile.level - 1) : 0;
  const progress = ((profile.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100;

  const stats = profile.stats;
  const completionRate = stats && stats.goals_created > 0
    ? Math.round((stats.goals_completed / stats.goals_created) * 100)
    : 0;

  // Get top 3 achievement badges
  const achievementBadges = profile.badges
    .filter((b) => b.category === "achievement")
    .slice(0, 3);

  return (
    <Card variant="glass">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🏆</span>
        Achiever Stats
      </h3>

      {/* XP Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center">
              <span className="text-white font-bold">{profile.level}</span>
            </div>
            <span className="text-sm font-medium text-gray-300">
              Level {profile.level}
            </span>
          </div>
          <span className="text-sm text-gray-400">
            {profile.xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Streak */}
      <div className="mb-6 flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <motion.span
          className="text-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
        >
          🔥
        </motion.span>
        <div>
          <div className="text-2xl font-bold text-orange-400">
            {profile.streak_days}
          </div>
          <div className="text-sm text-gray-400">
            day{profile.streak_days !== 1 ? "s" : ""} streak
          </div>
        </div>
      </div>

      {/* Goals Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-white">
              {stats.goals_created}
            </div>
            <div className="text-sm text-gray-400">Goals Created</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-green-400">
              {stats.goals_completed}
            </div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
        </div>
      )}

      {/* Completion Rate */}
      {stats && stats.goals_created > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Completion Rate</span>
            <span className="text-sm font-medium text-white">
              {completionRate}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Key Achievement Badges */}
      {achievementBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-3">
            Key Achievements
          </h4>
          <div className="flex gap-2">
            {achievementBadges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.1 }}
                className={`p-3 rounded-lg border-2 ${
                  badge.rarity === "legendary"
                    ? "bg-yellow-500/20 border-yellow-500/50"
                    : badge.rarity === "epic"
                    ? "bg-purple-500/20 border-purple-500/50"
                    : badge.rarity === "rare"
                    ? "bg-blue-500/20 border-blue-500/50"
                    : "bg-gray-500/20 border-gray-500/50"
                }`}
                title={badge.description || badge.name}
              >
                <div className="text-2xl">
                  {badge.icon_url || "🏅"}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
