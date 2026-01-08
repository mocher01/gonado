"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import type { UserBadge } from "@/types";

interface BadgeGridProps {
  badges: UserBadge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <Card variant="glass">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏅</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No badges yet
          </h3>
          <p className="text-gray-400">
            Complete goals and help others to earn badges!
          </p>
        </div>
      </Card>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-yellow-400 to-orange-500";
      case "epic":
        return "from-purple-400 to-pink-500";
      case "rare":
        return "from-blue-400 to-cyan-500";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "border-yellow-500/50 bg-yellow-500/10";
      case "epic":
        return "border-purple-500/50 bg-purple-500/10";
      case "rare":
        return "border-blue-500/50 bg-blue-500/10";
      default:
        return "border-gray-500/50 bg-gray-500/10";
    }
  };

  return (
    <Card variant="glass">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">🏅</span>
        All Badges ({badges.length})
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {badges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -4 }}
            className="group relative"
          >
            <div
              className={`p-4 rounded-lg border-2 ${getRarityBorder(
                badge.rarity
              )} transition-all duration-200`}
            >
              {/* Badge Icon */}
              <div className="text-4xl mb-2 text-center">
                {badge.icon_url || "🏅"}
              </div>

              {/* Badge Name */}
              <div className="text-sm font-semibold text-white text-center mb-1 line-clamp-2">
                {badge.name}
              </div>

              {/* Rarity Indicator */}
              <div className="text-center">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-bold rounded bg-gradient-to-r ${getRarityColor(
                    badge.rarity
                  )} text-white`}
                >
                  {badge.rarity}
                </span>
              </div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
                  <div className="text-sm font-semibold text-white mb-1">
                    {badge.name}
                  </div>
                  {badge.description && (
                    <div className="text-xs text-gray-400 mb-2">
                      {badge.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Earned {new Date(badge.earned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
