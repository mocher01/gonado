"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * QuestChronicle - Story-Style Activity Feed
 * ==========================================
 *
 * Instead of a typical activity feed, we present the journey
 * as a story/chronicle with chapters and narrative elements.
 */

type ActivityType =
  | "goal_created"
  | "node_completed"
  | "goal_completed"
  | "comment_added"
  | "reaction_added"
  | "started_following"
  | "badge_earned"
  | "milestone_reached"
  | "resource_dropped"
  | "sacred_boost"
  | "prophecy_made"
  | "time_capsule_opened";

interface Activity {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  activityType: ActivityType;
  targetType?: string;
  targetId?: string;
  extraData: Record<string, any>;
  createdAt: string;
}

interface QuestChronicleProps {
  activities: Activity[];
  goalTitle: string;
  goalCreatedAt: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ACTIVITY_NARRATIVES: Record<ActivityType, (data: any, username: string) => string> = {
  goal_created: (data, username) => `The journey began. ${username} set forth on a new quest.`,
  node_completed: (data, username) => `${username} conquered "${data.nodeTitle || "a challenge"}". Another step forward!`,
  goal_completed: (data, username) => `🏆 Victory! ${username} completed the entire quest!`,
  comment_added: (data, username) => `${username} left a trail marker: "${truncate(data.content, 50)}"`,
  reaction_added: (data, username) => `${username} cheered with ${getElementEmoji(data.reactionType)}`,
  started_following: (data, username) => `${username} joined as a fellow traveler`,
  badge_earned: (data, username) => `${username} earned the "${data.badgeName}" badge!`,
  milestone_reached: (data, username) => `🎯 Milestone reached: ${data.milestoneTitle}`,
  resource_dropped: (data, username) => `${username} dropped helpful resources`,
  sacred_boost: (data, username) => `⚡ ${username} gave a Sacred Boost!`,
  prophecy_made: (data, username) => `🔮 ${username} made a prophecy: completion by ${data.predictedDate}`,
  time_capsule_opened: (data, username) => `⏳ A time capsule was opened, revealing a message from the past`,
};

function getElementEmoji(type: string): string {
  const emojis: Record<string, string> = {
    fire: "🔥",
    water: "💧",
    nature: "🌿",
    lightning: "⚡",
    magic: "✨",
  };
  return emojis[type] || "✨";
}

function truncate(text: string, length: number): string {
  if (!text) return "";
  return text.length > length ? text.slice(0, length) + "..." : text;
}

export function QuestChronicle({
  activities,
  goalTitle,
  goalCreatedAt,
  onLoadMore,
  hasMore,
}: QuestChronicleProps) {
  const [expanded, setExpanded] = useState(false);

  // Group activities by day
  const groupedActivities = groupByDay(activities);
  const dayGroups = Object.entries(groupedActivities);
  const displayGroups = expanded ? dayGroups : dayGroups.slice(0, 3);

  const startDate = new Date(goalCreatedAt);
  const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="rounded-2xl bg-slate-800/30 backdrop-blur-sm border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📜</span>
          <div>
            <h3 className="text-lg font-bold text-white">Quest Chronicle</h3>
            <p className="text-sm text-slate-400">
              The Journey of &quot;{goalTitle}&quot; • Day {daysSinceStart + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Chronicle content */}
      <div className="p-5">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-3 block">📖</span>
            <p className="text-slate-400">The chronicle awaits its first entry...</p>
            <p className="text-slate-500 text-sm mt-1">Complete a step to begin your story</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayGroups.map(([dateKey, dayActivities]) => (
              <ChronicleChapter key={dateKey} date={dateKey} activities={dayActivities} />
            ))}
          </div>
        )}

        {/* Show more / less */}
        {dayGroups.length > 3 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              {expanded ? "Show less ↑" : `Read full chronicle (${dayGroups.length - 3} more chapters) ↓`}
            </button>
          </div>
        )}

        {/* Load more */}
        {hasMore && expanded && onLoadMore && (
          <div className="mt-4 text-center">
            <button
              onClick={onLoadMore}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
            >
              Load older entries...
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChronicleChapter({
  date,
  activities,
}: {
  date: string;
  activities: Activity[];
}) {
  const dateObj = new Date(date);
  const isToday = new Date().toDateString() === dateObj.toDateString();
  const dayName = isToday
    ? "Today"
    : dateObj.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div>
      {/* Chapter heading */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
          📅
        </div>
        <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
          {dayName}
        </h4>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
      </div>

      {/* Chapter entries */}
      <div className="space-y-2 ml-4 pl-4 border-l border-slate-700">
        {activities.map((activity, index) => (
          <ChronicleEntry key={activity.id} activity={activity} index={index} />
        ))}
      </div>
    </div>
  );
}

function ChronicleEntry({ activity, index }: { activity: Activity; index: number }) {
  const narrative = ACTIVITY_NARRATIVES[activity.activityType]?.(
    activity.extraData,
    activity.displayName || activity.username
  ) || `${activity.displayName || activity.username} did something`;

  const time = new Date(activity.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isSpecial = ["goal_completed", "milestone_reached", "badge_earned", "sacred_boost"].includes(
    activity.activityType
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative py-2 ${isSpecial ? "bg-amber-500/5 -ml-4 -mr-1 px-4 rounded-lg" : ""}`}
    >
      {/* Timeline dot */}
      <div
        className={`absolute left-[-21px] top-3 w-2 h-2 rounded-full ${
          isSpecial ? "bg-amber-400" : "bg-slate-600"
        }`}
      />

      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-700 flex-shrink-0">
          {activity.avatarUrl ? (
            <img
              src={activity.avatarUrl}
              alt={activity.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
              {activity.username[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${isSpecial ? "text-amber-200" : "text-slate-300"}`}>
            {narrative}
          </p>
          <span className="text-xs text-slate-500">{time}</span>
        </div>
      </div>
    </motion.div>
  );
}

function groupByDay(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};

  activities.forEach((activity) => {
    const date = new Date(activity.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
  });

  // Sort by date descending
  return Object.fromEntries(
    Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    )
  );
}

/**
 * Compact chronicle widget for dashboard
 */
export function QuestChronicleCompact({
  activities,
  goalTitle,
  onViewFull,
}: {
  activities: Activity[];
  goalTitle: string;
  onViewFull?: () => void;
}) {
  const recentActivities = activities.slice(0, 3);

  return (
    <div className="rounded-xl bg-slate-800/30 border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>📜</span>
          Recent Activity
        </h4>
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            View all →
          </button>
        )}
      </div>

      {recentActivities.length === 0 ? (
        <p className="text-sm text-slate-500">No activity yet</p>
      ) : (
        <div className="space-y-2">
          {recentActivities.map((activity) => {
            const narrative = ACTIVITY_NARRATIVES[activity.activityType]?.(
              activity.extraData,
              activity.displayName || activity.username
            );
            return (
              <p key={activity.id} className="text-xs text-slate-400 truncate">
                {narrative}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
