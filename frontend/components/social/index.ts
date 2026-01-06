// Core Social Components - Reactions
// Issue #64: New Coaching & Celebration Reaction System
export { CoachingReactions, CoachingReactionsInline, convertElementalToCoaching } from "./CoachingReactions";
export type { CoachingReactionType, CoachingReactionCounts } from "./CoachingReactions";

// Legacy Elemental Reactions (deprecated, kept for backwards compatibility)
export { ElementalReactions, ElementalReactionsInline } from "./ElementalReactions";
export type { ElementType } from "./ElementalReactions";

export { TrailMarkers, TrailMarkerBadge, QuickCommentInput } from "./TrailMarkers";

export { FellowTravelers, FellowTravelersCompact, TravelersOnPath } from "./FellowTravelers";
export type { Traveler } from "./FellowTravelers";

export { QuestChronicle, QuestChronicleCompact } from "./QuestChronicle";

// Innovative Social Features
export { SacredBoost, SacredBoostBadge } from "./SacredBoost";
export { SacredBoostModal } from "./SacredBoostModal";

export { ProphecyBoard } from "./ProphecyBoard";

// Node Interaction
export { NodeInteractionPopup } from "./NodeInteractionPopup";

// Comment Modal
export { CommentInputModal } from "./CommentInputModal";

// Resource Drop Modal
export { ResourceDropModal } from "./ResourceDropModal";

// Comments Panel (for viewing all comments)
export { NodeCommentsPanel } from "./NodeCommentsPanel";

// Mood Indicators (Issue #67)
export { MoodSelector, MoodBadge, MoodSupportAlert, MOOD_OPTIONS } from "./MoodSelector";
export type { MoodOption } from "./MoodSelector";
