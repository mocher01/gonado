"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FellowTravelers - Followers as Journey Companions
 * ==================================================
 *
 * Instead of showing a follower count, we display avatars
 * of people "traveling with you" on the quest.
 */

interface Traveler {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
}

interface FellowTravelersProps {
  travelers: Traveler[];
  maxDisplay?: number;
  onFollow?: () => void;
  onViewAll?: () => void;
  isFollowing?: boolean;
  showJoinButton?: boolean;
}

export function FellowTravelers({
  travelers,
  maxDisplay = 5,
  onFollow,
  onViewAll,
  isFollowing = false,
  showJoinButton = true,
}: FellowTravelersProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const displayedTravelers = travelers.slice(0, maxDisplay);
  const remainingCount = Math.max(0, travelers.length - maxDisplay);

  return (
    <div className="relative">
      <div
        className="flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {displayedTravelers.map((traveler, index) => (
            <motion.div
              key={traveler.id}
              initial={{ opacity: 0, scale: 0.5, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
              style={{ zIndex: maxDisplay - index }}
            >
              <div className="w-8 h-8 rounded-full border-2 border-slate-900 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600">
                {traveler.avatarUrl ? (
                  <img
                    src={traveler.avatarUrl}
                    alt={traveler.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {traveler.username[0].toUpperCase()}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* +N more badge */}
          {remainingCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center"
            >
              <span className="text-xs font-medium text-slate-300">
                +{remainingCount}
              </span>
            </motion.div>
          )}
        </div>

        {/* Label */}
        <div className="ml-3">
          <span className="text-sm text-slate-300">
            {travelers.length === 0
              ? "No travelers yet"
              : travelers.length === 1
              ? "1 fellow traveler"
              : `${travelers.length} fellow travelers`}
          </span>
        </div>

        {/* Join button (only shown if showJoinButton is true) */}
        {showJoinButton && onFollow && !isFollowing && (
          <motion.button
            onClick={onFollow}
            className="ml-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🚶 Join Journey
          </motion.button>
        )}

        {showJoinButton && isFollowing && (
          <span className="ml-3 px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 text-xs font-medium flex items-center gap-1">
            <span>✓</span>
            <span>Traveling with</span>
          </span>
        )}
      </div>

      {/* Tooltip with traveler names */}
      <AnimatePresence>
        {showTooltip && travelers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full left-0 mt-2 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/10 shadow-xl z-50 min-w-48"
          >
            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Fellow Travelers
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {travelers.slice(0, 10).map((traveler) => (
                <div key={traveler.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600">
                    {traveler.avatarUrl ? (
                      <img
                        src={traveler.avatarUrl}
                        alt={traveler.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                        {traveler.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-white truncate">
                    {traveler.displayName || traveler.username}
                  </span>
                </div>
              ))}
            </div>
            {travelers.length > 10 && onViewAll && (
              <button
                onClick={onViewAll}
                className="mt-2 w-full text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all {travelers.length} travelers →
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact version for displaying on quest map start
 */
export function FellowTravelersCompact({
  count,
  avatars,
  onClick,
}: {
  count: number;
  avatars: string[];
  onClick?: () => void;
}) {
  const displayAvatars = avatars.slice(0, 3);

  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-all"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Mini avatar stack */}
      <div className="flex -space-x-1.5">
        {displayAvatars.map((avatar, index) => (
          <div
            key={index}
            className="w-5 h-5 rounded-full border border-slate-900 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600"
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        ))}
      </div>

      {/* Count */}
      <span className="text-sm text-slate-300">
        🧑‍🤝‍🧑 {count} {count === 1 ? "traveler" : "travelers"}
      </span>
    </motion.button>
  );
}

/**
 * Walking animation component for the map
 */
export function TravelersOnPath({
  travelers,
  progress,
}: {
  travelers: Traveler[];
  progress: number; // 0-100
}) {
  const displayCount = Math.min(travelers.length, 4);
  const displayTravelers = travelers.slice(0, displayCount);

  return (
    <div
      className="absolute flex -space-x-1"
      style={{
        left: `${Math.min(progress, 95)}%`,
        top: "50%",
        transform: "translateY(-50%)",
      }}
    >
      {displayTravelers.map((traveler, index) => (
        <motion.div
          key={traveler.id}
          animate={{
            y: [0, -2, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 0.8,
            delay: index * 0.1,
          }}
          className="w-4 h-4 rounded-full border border-slate-700 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600"
          title={traveler.displayName || traveler.username}
        >
          {traveler.avatarUrl ? (
            <img
              src={traveler.avatarUrl}
              alt={traveler.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">
              {traveler.username[0].toUpperCase()}
            </div>
          )}
        </motion.div>
      ))}
      {travelers.length > 4 && (
        <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-slate-300">
          +{travelers.length - 4}
        </div>
      )}
    </div>
  );
}
