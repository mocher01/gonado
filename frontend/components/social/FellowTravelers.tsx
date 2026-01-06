"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FellowTravelers - Followers as Journey Companions
 * ==================================================
 *
 * Issue #66: Fellow Travelers / Progress Visualization
 *
 * Displays animated avatars of followers ("fellow travelers") on the quest map:
 * - Avatars animate subtly (breathing effect)
 * - Click avatar shows user profile summary tooltip
 * - Max display limit of 10 most recent
 * - "and X more" indicator for large groups
 */

export interface Traveler {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
}

interface FellowTravelersProps {
  travelers: Traveler[];
  totalCount?: number;
  maxDisplay?: number;
  onFollow?: () => void;
  onViewAll?: () => void;
  isFollowing?: boolean;
  showJoinButton?: boolean;
}

/**
 * Breathing animation keyframes for avatars
 */
const breathingAnimation = {
  scale: [1, 1.05, 1],
  boxShadow: [
    "0 0 0 0 rgba(16, 185, 129, 0)",
    "0 0 8px 2px rgba(16, 185, 129, 0.3)",
    "0 0 0 0 rgba(16, 185, 129, 0)",
  ],
};

/**
 * Individual traveler avatar with breathing animation and click tooltip
 */
function TravelerAvatar({
  traveler,
  index,
  maxDisplay,
  onSelect,
  isSelected,
}: {
  traveler: Traveler;
  index: number;
  maxDisplay: number;
  onSelect: (traveler: Traveler | null) => void;
  isSelected: boolean;
}) {
  return (
    <motion.div
      key={traveler.id}
      initial={{ opacity: 0, scale: 0.5, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
      style={{ zIndex: maxDisplay - index }}
      data-testid="traveler-avatar"
    >
      <motion.button
        onClick={() => onSelect(isSelected ? null : traveler)}
        animate={breathingAnimation}
        transition={{
          repeat: Infinity,
          duration: 3 + index * 0.2, // Stagger breathing for natural look
          ease: "easeInOut",
        }}
        className={`w-8 h-8 rounded-full border-2 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 cursor-pointer transition-all ${
          isSelected
            ? "border-emerald-400 ring-2 ring-emerald-400/50"
            : "border-slate-900 hover:border-emerald-500/50"
        }`}
        title={traveler.displayName || traveler.username}
        aria-label={`View profile of ${traveler.displayName || traveler.username}`}
      >
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
      </motion.button>
    </motion.div>
  );
}

/**
 * User profile summary tooltip that appears on avatar click
 */
function ProfileTooltip({
  traveler,
  onClose,
}: {
  traveler: Traveler;
  onClose: () => void;
}) {
  const followedDate = new Date(traveler.followedAt);
  const timeAgo = getTimeAgo(followedDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      className="absolute top-full left-0 mt-2 p-4 rounded-xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/20 shadow-xl z-50 min-w-56"
      data-testid="traveler-profile-tooltip"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0">
          {traveler.avatarUrl ? (
            <img
              src={traveler.avatarUrl}
              alt={traveler.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
              {traveler.username[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold truncate">
            {traveler.displayName || traveler.username}
          </h4>
          <p className="text-sm text-slate-400 truncate">@{traveler.username}</p>
          <p className="text-xs text-emerald-400 mt-1">
            Joined journey {timeAgo}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Helper function to format time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

export function FellowTravelers({
  travelers,
  totalCount,
  maxDisplay = 10,
  onFollow,
  onViewAll,
  isFollowing = false,
  showJoinButton = true,
}: FellowTravelersProps) {
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);
  const displayedTravelers = travelers.slice(0, maxDisplay);
  const actualTotal = totalCount ?? travelers.length;
  const remainingCount = Math.max(0, actualTotal - displayedTravelers.length);

  return (
    <div className="relative" data-testid="fellow-travelers">
      <div className="flex items-center flex-wrap gap-2">
        {/* Avatar stack with breathing animation */}
        <div className="flex -space-x-2">
          {displayedTravelers.map((traveler, index) => (
            <TravelerAvatar
              key={traveler.id}
              traveler={traveler}
              index={index}
              maxDisplay={maxDisplay}
              onSelect={setSelectedTraveler}
              isSelected={selectedTraveler?.id === traveler.id}
            />
          ))}

          {/* +N more badge */}
          {remainingCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={onViewAll}
              className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors cursor-pointer"
              title={`and ${remainingCount} more travelers`}
              data-testid="travelers-more-badge"
            >
              <span className="text-xs font-medium text-slate-300">
                +{remainingCount}
              </span>
            </motion.button>
          )}
        </div>

        {/* Label */}
        <div className="ml-1">
          <span className="text-sm text-slate-300" data-testid="travelers-count">
            {actualTotal === 0
              ? "No travelers yet"
              : actualTotal === 1
              ? "1 fellow traveler"
              : `${actualTotal} fellow travelers`}
          </span>
        </div>

        {/* Join button (only shown if showJoinButton is true) */}
        {showJoinButton && onFollow && !isFollowing && (
          <motion.button
            onClick={onFollow}
            className="ml-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="follow-button"
          >
            Follow
          </motion.button>
        )}

        {showJoinButton && isFollowing && (
          <span className="ml-2 px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 text-xs font-medium flex items-center gap-1">
            <span>Traveling with</span>
          </span>
        )}
      </div>

      {/* Profile tooltip on avatar click */}
      <AnimatePresence>
        {selectedTraveler && (
          <ProfileTooltip
            traveler={selectedTraveler}
            onClose={() => setSelectedTraveler(null)}
          />
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
      data-testid="fellow-travelers-compact"
    >
      {/* Mini avatar stack with breathing */}
      <div className="flex -space-x-1.5">
        {displayAvatars.map((avatar, index) => (
          <motion.div
            key={index}
            animate={breathingAnimation}
            transition={{
              repeat: Infinity,
              duration: 3 + index * 0.3,
              ease: "easeInOut",
            }}
            className="w-5 h-5 rounded-full border border-slate-900 overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600"
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Count */}
      <span className="text-sm text-slate-300">
        {count} {count === 1 ? "traveler" : "travelers"}
      </span>
    </motion.button>
  );
}

/**
 * Animated travelers display for the quest map area
 * Shows breathing avatars with profile tooltips on click
 */
export function TravelersOnPath({
  travelers,
  progress,
  totalCount,
}: {
  travelers: Traveler[];
  progress: number; // 0-100
  totalCount?: number;
}) {
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);
  const displayCount = Math.min(travelers.length, 4);
  const displayTravelers = travelers.slice(0, displayCount);
  const actualTotal = totalCount ?? travelers.length;
  const moreCount = actualTotal - displayCount;

  return (
    <div
      className="absolute flex -space-x-1"
      style={{
        left: `${Math.min(progress, 95)}%`,
        top: "50%",
        transform: "translateY(-50%)",
      }}
      data-testid="travelers-on-path"
    >
      {displayTravelers.map((traveler, index) => (
        <motion.button
          key={traveler.id}
          onClick={() => setSelectedTraveler(selectedTraveler?.id === traveler.id ? null : traveler)}
          animate={{
            scale: [1, 1.08, 1],
            y: [0, -2, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5 + index * 0.2,
            ease: "easeInOut",
          }}
          className={`w-6 h-6 rounded-full border overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 cursor-pointer ${
            selectedTraveler?.id === traveler.id
              ? "border-emerald-400 ring-2 ring-emerald-400/50"
              : "border-slate-700 hover:border-emerald-500/50"
          }`}
          title={traveler.displayName || traveler.username}
        >
          {traveler.avatarUrl ? (
            <img
              src={traveler.avatarUrl}
              alt={traveler.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
              {traveler.username[0].toUpperCase()}
            </div>
          )}
        </motion.button>
      ))}

      {/* +N more badge */}
      {moreCount > 0 && (
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "easeInOut",
          }}
          className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] text-slate-300"
          title={`and ${moreCount} more travelers`}
          data-testid="path-travelers-more"
        >
          +{moreCount}
        </motion.div>
      )}

      {/* Profile tooltip */}
      <AnimatePresence>
        {selectedTraveler && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 p-3 rounded-lg bg-slate-900/95 backdrop-blur-md border border-emerald-500/20 shadow-xl z-50 min-w-44 whitespace-nowrap"
            data-testid="path-traveler-tooltip"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600">
                {selectedTraveler.avatarUrl ? (
                  <img
                    src={selectedTraveler.avatarUrl}
                    alt={selectedTraveler.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                    {selectedTraveler.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  {selectedTraveler.displayName || selectedTraveler.username}
                </p>
                <p className="text-emerald-400 text-xs">Fellow traveler</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
