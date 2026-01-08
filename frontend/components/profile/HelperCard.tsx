"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import type { UserProfile } from "@/types";

interface HelperCardProps {
  profile: UserProfile;
}

export function HelperCard({ profile }: HelperCardProps) {
  const stats = profile.stats;

  // Get top 3 helper badges
  const helperBadges = profile.badges
    .filter((b) => b.category === "helper" || b.category === "social")
    .slice(0, 3);

  return (
    <Card variant="glass">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">💝</span>
        Helper Stats
      </h3>

      {stats && (
        <>
          {/* Supporter Score */}
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30">
            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
              {stats.supporter_score}
            </div>
            <div className="text-sm text-gray-300">Supporter Score</div>
          </div>

          {/* Engagement Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">💬</span>
                <div className="text-xl font-bold text-white">
                  {stats.comments_given}
                </div>
              </div>
              <div className="text-sm text-gray-400">Comments Given</div>
            </div>

            <div className="p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚡</span>
                <div className="text-xl font-bold text-white">
                  {stats.reactions_given}
                </div>
              </div>
              <div className="text-sm text-gray-400">Reactions Given</div>
            </div>
          </div>

          {/* Goals Following */}
          <div className="mb-6 p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="text-2xl font-bold text-white">
                  {stats.following_count}
                </div>
                <div className="text-sm text-gray-400">Goals Following</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Helper Badges */}
      {helperBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-3">
            Helper Badges
          </h4>
          <div className="flex gap-2">
            {helperBadges.map((badge) => (
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

      {!stats && (
        <div className="text-center py-8 text-gray-400">
          No helper stats yet
        </div>
      )}
    </Card>
  );
}
