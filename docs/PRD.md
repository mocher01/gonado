# Gonado - Product Requirements Document (PRD)

**Version:** 2.0
**Last Updated:** 2026-01-05
**Status:** Approved

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Types & Permissions](#2-user-types--permissions)
3. [Core Features](#3-core-features)
4. [Social Features](#4-social-features)
5. [UI/UX Specifications](#5-uiux-specifications)
6. [API Specifications](#6-api-specifications)
7. [Data Models](#7-data-models)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Sprint Planning](#9-sprint-planning)
10. [Glossary](#10-glossary)

---

## 1. Product Overview

### 1.1 Vision

Gonado is a goal achievement social marketplace where:
- **Achievers** create goals, track progress through visual quest maps
- **Supporters** help achievers through reactions, comments, resources, and services
- **Businesses** (normal accounts with business option) connect with achievers who need their services

Users can be both Achiever and Supporter simultaneously.

### 1.2 Core Value Proposition

| For | Value |
|-----|-------|
| **Goal Achievers** | Visual progress tracking, community support, service discovery at each stage, privacy controls |
| **Supporters** | Help others, build reputation, offer services |
| **Businesses** | Access qualified leads (achievers at specific stages needing services) |

### 1.3 Key Differentiators

| Priority | Differentiator | Description |
|----------|----------------|-------------|
| P0 | Quest Map Visualization | Interactive node-based goal tracking |
| P0 | Dual View (same backend) | Desktop: Quest Map / Mobile: TikTok-style swipe |
| P1 | AI-Assisted Planning | Generate goal steps from description |
| P1 | Social Sharing | Easy share to all social networks |
| P1 | Goal Categories | Fitness, Learning, Career, Creative, etc. for discovery & targeting |
| P1 | Real-time Updates | WebSocket for instant reactions, comments, notifications |
| P1 | Privacy Controls | Achievers control visibility to businesses per goal |
| P2 | Goal Presentation Screen | Placeholder for future video (static screen for now) |
| P2 | Offer/Demand Marketplace | Match achievers with relevant services/supporters |
| P2 | Business Access | Businesses discover achievers needing their services |

### 1.4 Architecture Principle

**Single Backend, Multiple Views**
- Same data structure serves both desktop and mobile
- Desktop: Full quest map visualization
- Mobile: TikTok-style vertical/horizontal swipe
- Frontend-only difference, no backend changes needed
- Real-time via WebSockets for both views

### 1.5 Account Types

| Type | Description |
|------|-------------|
| **Standard Account** | Can be achiever and/or supporter |
| **Business Option** | Standard account + business flag + verification process |

### 1.6 Goal Categories

| Category | Examples |
|----------|----------|
| Fitness | Lose weight, run marathon, build muscle |
| Learning | Learn language, get certification, read books |
| Career | Get promotion, change job, start business |
| Creative | Write book, learn instrument, create art |
| Financial | Save money, pay debt, invest |
| Personal | Quit habit, improve relationships, travel |

### 1.7 Discovery & Matching

| Feature | Description | Priority |
|---------|-------------|----------|
| Search | Find goals by keyword, category, tags | P1 |
| Trending | Popular goals based on activity | P1 |
| Recommendations | AI-suggested goals to support based on interests | P2 |
| Business Matching | Match achievers at specific stages with relevant services | P2 |

### 1.8 Privacy & Controls

| Setting | Description | Default |
|---------|-------------|---------|
| Goal Visibility | Public / Private | Private |
| Visible to Businesses | Allow businesses to see this goal | No |
| Receive Offers | Allow businesses to contact about services | No |

### 1.9 Notifications

| Event | Channel | Priority |
|-------|---------|----------|
| New reaction on goal/node | Push, In-app | P1 |
| New comment | Push, In-app | P1 |
| New follower | Push, In-app | P1 |
| Node completed by followed achiever | In-app | P2 |
| Business offer received | Push, In-app, Email | P2 |
| Boost received | Push, In-app | P1 |

### 1.10 Gamification

| Element | Trigger | Reward |
|---------|---------|--------|
| XP | Complete node | +10-50 XP based on difficulty |
| XP | Receive reaction | +2 XP |
| XP | Receive comment | +5 XP |
| XP | Give boost | +10 XP |
| Streak | Complete node daily | Multiplier bonus |
| Level | Accumulate XP | Unlock features, badges |
| Badges | Achievements | Profile display |

### 1.11 Content Moderation

| Type | Method | Priority |
|------|--------|----------|
| Comments | Report button + AI auto-detection | P1 |
| Goals | Report button + manual review | P2 |
| Future videos | AI moderation + manual review | P3 |

### 1.12 Monetization (Future)

| Model | Description | Target |
|-------|-------------|--------|
| Freemium | Basic features free, premium for advanced | Achievers |
| Subscription | Monthly fee for business features | Businesses |
| Per-lead | Pay per qualified lead contact | Businesses |
| Promoted Goals | Pay for visibility boost | Achievers |

### 1.13 Support Types

| Type | Description | Exchange |
|------|-------------|----------|
| Reaction | Quick emoji support | Free |
| Comment | Text encouragement/advice | Free |
| Follow | Track progress | Free |
| Sacred Boost | Premium support | Free (limited) |
| Resource Drop | Share helpful link/tip | Free |
| **Swap** | Mutual help exchange | Reciprocal |
| Donation | Money support | Paid (future) |

### 1.14 Swap Feature (High-Level)

When supporting an achiever, instead of just reacting/commenting/donating, a supporter can propose a mutual exchange:

**"I help you with [your goal/node] if you help me with [my goal/node]"**

**How it Works:**
1. Supporter views an achiever's goal
2. Supporter clicks "Propose Swap"
3. Supporter selects one of their own goals/nodes to share
4. Message: "I can help you with [their node]. Can you help me with [my node]?"
5. Achiever accepts or declines
6. If accepted → both become mutual supporters

---

## 2. User Types & Permissions

### 2.1 User Type Definitions

| User Type | Definition |
|-----------|------------|
| **Unauthenticated** | Visitor without account or not logged in |
| **Authenticated Visitor** | Logged in user viewing someone else's goal |
| **Authenticated Owner** | Logged in user viewing their own goal |
| **Business Account** | Standard account with business option enabled |

### 2.2 Permission Matrix - Goal Viewing

| Feature | Unauthenticated | Visitor | Owner |
|---------|-----------------|---------|-------|
| View public goal | ✅ | ✅ | ✅ |
| View private goal | ❌ | ❌ | ✅ |
| View quest map | ✅ | ✅ | ✅ |
| Drag nodes (session only) | ✅ | ✅ | ✅ |
| Save node positions | ❌ | ❌ | ✅ |

### 2.3 Permission Matrix - Social Interactions

| Feature | Unauthenticated | Visitor | Owner |
|---------|-----------------|---------|-------|
| View reactions | ✅ | ✅ | ✅ |
| Add reaction | ❌ | ✅ | ✅ |
| Remove own reaction | ❌ | ✅ | ✅ |
| View comments | ✅ | ✅ | ✅ |
| Add comment | ❌ | ✅ | ✅ |
| Delete own comment | ❌ | ✅ | ✅ |
| Delete any comment | ❌ | ❌ | ✅ |
| Follow goal | ❌ | ✅ | ❌ |
| Unfollow goal | ❌ | ✅ | ❌ |
| Give Sacred Boost | ❌ | ✅ | ❌ |
| Drop Resource | ❌ | ✅ | ✅ |
| View Resources | ✅ | ✅ | ✅ |
| Propose Swap | ❌ | ✅ | ❌ |
| Accept/Decline Swap | ❌ | ❌ | ✅ |

### 2.4 Permission Matrix - Goal Management

| Feature | Unauthenticated | Visitor | Owner |
|---------|-----------------|---------|-------|
| Create goal | ❌ | ✅ | ✅ |
| Edit goal | ❌ | ❌ | ✅ |
| Delete goal | ❌ | ❌ | ✅ |
| Change visibility | ❌ | ❌ | ✅ |
| Mark node complete | ❌ | ❌ | ✅ |
| Edit node | ❌ | ❌ | ✅ |

### 2.5 Permission Matrix - Business Features

| Feature | Standard | Business |
|---------|----------|----------|
| Browse public goals | ✅ | ✅ |
| Filter by category/stage | ✅ | ✅ |
| View achiever contact info | ❌ | ✅ (if allowed) |
| Send service offers | ❌ | ✅ (if allowed) |
| Access analytics dashboard | ❌ | ✅ |
| Promoted visibility | ❌ | ✅ (paid) |

### 2.6 Login Prompt Behavior

When unauthenticated user tries a protected action:

| Element | Value |
|---------|-------|
| Message | "Sign in to [action]" |
| Duration | 3 seconds |
| Style | Dark background (#1E293B), amber border |
| Action | Link to /login?returnUrl=[current page] |

---

## 3. Core Features

### 3.1 Goal Management

#### 3.1.1 Goal Creation

**User Flow:**
1. User clicks "Create Goal" / "New Quest"
2. Chat interface opens with Quest Guide AI
3. User describes goal in natural language
4. AI asks clarifying questions (2-4 exchanges)
5. AI generates structured goal with nodes
6. User reviews and confirms
7. Goal created → visible in dashboard

**Fields:**

| Field | Required | Max Length | Default |
|-------|----------|------------|---------|
| Title | Yes | 200 chars | - |
| Description | No | 2000 chars | - |
| Category | Yes | - | - |
| Visibility | Yes | - | Private |
| Visible to Businesses | No | - | No |
| World Theme | No | - | Auto-generated |

**Acceptance Criteria:**
- [ ] Chat conversation is intuitive
- [ ] AI generates 5-10 relevant nodes
- [ ] User can regenerate if unsatisfied
- [ ] Goal appears in dashboard immediately
- [ ] Default visibility is private

#### 3.1.2 Goal Viewing

**Components:**

| Component | Description |
|-----------|-------------|
| Header | Title, progress bar, owner info, category |
| Quest Map | Interactive node graph (React Flow) |
| Social Panel | Reactions, comments, followers (public only) |
| Owner Controls | Edit, delete, visibility (owner only) |

**Acceptance Criteria:**
- [ ] Quest map loads < 2 seconds
- [ ] Nodes show correct status (completed/active/locked)
- [ ] Progress bar reflects completion %
- [ ] Social data loads for public goals

#### 3.1.3 Goal Editing

**Editable Fields:**

| Field | Editable By |
|-------|-------------|
| Title | Owner |
| Description | Owner |
| Visibility | Owner |
| Category | Owner |
| Visible to Businesses | Owner |
| World Theme | Owner |

**Acceptance Criteria:**
- [ ] Only owner sees edit button
- [ ] Changes save immediately
- [ ] Validation errors shown inline

#### 3.1.4 Goal Deletion

**User Flow:**
1. Owner clicks "Delete Goal"
2. Confirmation modal: "Delete [Title]? This cannot be undone."
3. Owner confirms
4. Goal + all related data deleted
5. Redirect to dashboard

**Cascade Delete:**
- Nodes
- Comments
- Reactions
- Follows
- Sacred Boosts
- Resource Drops
- Swaps (mark as cancelled)

**Acceptance Criteria:**
- [ ] Confirmation required
- [ ] All related data deleted
- [ ] Redirect to dashboard
- [ ] Success toast shown

### 3.2 Node Management

#### 3.2.1 Node Display

**Visual States:**

| Status | Visual | Description |
|--------|--------|-------------|
| Completed | Green/gold, checkmark | Task finished |
| Active | Orange/amber, pulsing | Currently workable |
| Locked | Gray, dimmed | Prerequisites not met |

**Node Card Contents:**
- Title
- Status icon
- Difficulty indicator
- Social bar (reactions/comments count)
- Progress indicator (if has checklist)
- Struggle indicator (if applicable)

#### 3.2.2 Node Completion

**User Flow:**
1. Owner clicks active node
2. Node detail opens
3. Owner clicks "Mark as Complete"
4. Node → completed
5. Next node(s) → active
6. Progress bar updates
7. XP awarded

**Acceptance Criteria:**
- [ ] Only active nodes completable
- [ ] Only owner can complete
- [ ] Visual transition animation
- [ ] Progress bar updates real-time
- [ ] Dependent nodes unlock

**Side Effects:**
- Owner gains XP (+10-50 based on difficulty)
- Activity logged
- Followers notified (future)

#### 3.2.3 Node Editing

**Editable Fields:**

| Field | Max Length |
|-------|------------|
| Title | 200 chars |
| Description | 2000 chars |
| Checklist items | 20 items max |
| Difficulty | 1-5 |

**Acceptance Criteria:**
- [ ] Only owner sees edit
- [ ] Inline editing or modal
- [ ] Auto-save on blur
- [ ] Checklist drag-to-reorder

#### 3.2.4 Node Checklist

**Features:**
- Add item
- Edit item text
- Toggle completion
- Delete item
- Reorder (drag & drop)

**Acceptance Criteria:**
- [ ] State persists after refresh
- [ ] Toggle updates immediately
- [ ] Progress shown as "3/5"
- [ ] All view, only owner modifies

#### 3.2.5 Node Positioning

**Behavior:**

| User Type | Can Drag | Saved |
|-----------|----------|-------|
| Unauthenticated | Yes | No (session) |
| Visitor | Yes | No (session) |
| Owner | Yes | Yes (persists) |

**Owner Save:**
- Auto-save on drag end
- Debounce 500ms
- Single API call for all positions
- Becomes default for all viewers

**Acceptance Criteria:**
- [ ] All users can drag
- [ ] Non-owners reset on refresh
- [ ] Owner persists after refresh
- [ ] Smooth animation

### 3.3 Node Structure & Dependencies

#### 3.3.1 Node Relationships

| Type | Description | Example |
|------|-------------|---------|
| **Sequential** | Node B requires Node A complete | "Learn basics" → "Build project" |
| **Parallel** | Multiple nodes workable simultaneously | "Read book" ∥ "Watch course" |
| **Branching** | Choose one path or complete all | "Option A" OR "Option B" |

#### 3.3.2 Data Model Addition

| Field | Type | Description |
|-------|------|-------------|
| parent_ids | UUID[] | Nodes that must complete before this one |
| is_parallel | Boolean | Can be worked on with siblings |
| branch_group | String | Group ID for branching paths (optional) |

### 3.4 Desktop View (Quest Map)

**Features:**
- Full map visible at once
- Pan & zoom
- Drag nodes to reposition (owner saves)
- Click node to interact
- Edges show relationships

**Visual Indicators:**

| Indicator | Meaning |
|-----------|---------|
| Solid line | Sequential dependency |
| Dashed line | Parallel (can do together) |
| Branch icon | Choose one path |
| Glow/pulse | Currently active |

### 3.5 Mobile View (TikTok-Style)

#### 3.5.1 Navigation

| Gesture | Action |
|---------|--------|
| Swipe UP/DOWN | Switch between achievers (different goals) |
| Swipe LEFT/RIGHT | Switch between nodes of current achiever |
| Tap | Interact with current node (react, comment) |
| Long press | View node details |

#### 3.5.2 Node Order in Mobile

| Structure | Mobile Behavior |
|-----------|-----------------|
| Sequential | Swipe through in order: 1 → 2 → 3 |
| Parallel | Group shown together, swipe within group |
| Branching | Show branch selector, then chosen path |

#### 3.5.3 Interaction Overlay

When tapping to interact:
- Reactions appear as floating overlay
- Comments slide up from bottom (half-screen)
- Can interact while viewing node
- No page navigation needed

### 3.6 View Synchronization

| Aspect | Desktop | Mobile | Backend |
|--------|---------|--------|---------|
| Data | Same | Same | Single API |
| Node positions | X, Y coordinates | Ignored (uses sequence) | Stored |
| Node sequence | Derived from Y position | Primary navigation | Stored |
| Interactions | Same API | Same API | Same |

### 3.7 Node Difficulty Levels

#### 3.7.1 Difficulty Scale

| Level | Icon | Label | Description |
|-------|------|-------|-------------|
| 1 | 🟢 | Easy | Quick task, < 1 hour |
| 2 | 🟡 | Medium | Some effort, 1-4 hours |
| 3 | 🟠 | Challenging | Significant effort, 1-2 days |
| 4 | 🔴 | Hard | Major effort, 3-7 days |
| 5 | ⚫ | Epic | Very complex, 1+ weeks |

#### 3.7.2 Who Sets Difficulty

| Option | Description |
|--------|-------------|
| AI-generated | Based on goal description, auto-assign |
| Owner-adjusted | Owner can modify after generation |
| Hybrid | AI suggests, owner confirms/adjusts |

#### 3.7.3 Struggle Detection

| Signal | Trigger | Action |
|--------|---------|--------|
| **Stuck** | Node active > 2x expected time | Show "Might need help" indicator |
| **Slow** | No progress on checklist for X days | Notify followers |
| **Abandoned?** | No activity for 7+ days | Prompt achiever, alert supporters |

#### 3.7.4 Gamification Tie-In

| Achievement | XP Bonus |
|-------------|----------|
| Complete Easy node | +10 XP |
| Complete Medium node | +25 XP |
| Complete Challenging node | +50 XP |
| Complete Hard node | +100 XP |
| Complete Epic node | +200 XP |
| Help someone on Hard+ node | +50 XP |

---

## 4. Social Features

### 4.1 Reactions

#### 4.1.1 Overview

| Aspect | Detail |
|--------|--------|
| Purpose | Quick support response |
| Limit | One reaction per user per target |
| Targets | Goals, Nodes |

#### 4.1.2 Reaction Types

**6 Core Reactions (always visible):**

| Emoji | Name | Category | Message |
|-------|------|----------|---------|
| 💪 | Strength | Coaching | "You got this!" |
| 🔥 | Push | Coaching | "Don't give up!" |
| 🙌 | Celebrate | Recognition | "Amazing!" |
| 💡 | Insight | Feedback | "Smart approach" |
| 🤝 | Connect | Action | "Let's help each other" → Opens Swap |
| 🔔 | Follow | Action | "Keep me posted" → Follows goal |

**Extended Reactions (via "more" button):**

| Emoji | Name | Category |
|-------|------|----------|
| 🫂 | Here | Coaching |
| 👊 | Fight | Coaching |
| 🎉 | Party | Recognition |
| ⭐ | Star | Recognition |
| 🏆 | Trophy | Recognition |
| 🎯 | Target | Feedback |
| 📦 | Gift | Action → Resource Drop |

#### 4.1.3 User Flows

**Add Reaction:**
1. User clicks reaction area
2. 6 emoji options shown
3. User clicks emoji
4. Reaction saved immediately
5. Count updates real-time
6. Emoji highlighted as "yours"

**Change Reaction:**
1. User has existing reaction (💪)
2. User clicks different emoji (🔥)
3. Old removed, new added
4. Counts update

**Remove Reaction:**
1. User clicks currently selected emoji
2. Reaction removed
3. Count decreases

#### 4.1.4 Acceptance Criteria

- [ ] One reaction per user per target
- [ ] Click different = change (not add)
- [ ] Click same = remove
- [ ] Real-time count update (no refresh)
- [ ] User's reaction highlighted
- [ ] Unauthenticated: "Sign in to react"
- [ ] Optimistic UI with rollback on error
- [ ] Action reactions trigger features (🤝→Swap, 🔔→Follow)

### 4.2 Comments

#### 4.2.1 Overview

| Aspect | Detail |
|--------|--------|
| Purpose | Text messages on goals/nodes |
| Max length | 500 characters |
| Targets | Goals, Nodes |

#### 4.2.2 User Flows

**View Comments:**
1. User clicks comment icon/count
2. Comments panel opens
3. List shows newest first
4. Each: avatar, username, time, content

**Add Comment:**
1. User clicks comment input
2. Types message (max 500)
3. Press Enter or Send
4. Comment appears at top

**Delete Comment:**
1. Hover own comment → delete icon
2. Click delete
3. Confirm
4. Comment removed

**Owner Moderation:**
- Owner can delete ANY comment
- No confirmation needed

#### 4.2.3 Acceptance Criteria

- [ ] Max 500 characters
- [ ] Character count shown
- [ ] Submit on Enter
- [ ] Appears immediately (optimistic)
- [ ] Unauthenticated: "Sign in to comment"
- [ ] Newest first
- [ ] Relative timestamps ("2h ago")
- [ ] Owner can delete any
- [ ] Simple UI - no themed language

### 4.3 Follow System

#### 4.3.1 Overview

| Aspect | Detail |
|--------|--------|
| Purpose | Track goal progress, show support |
| Restriction | Cannot follow own goal |

#### 4.3.2 User Flows

**Follow:**
1. Visitor clicks "Follow"
2. Button → "Following"
3. User added to followers list
4. Goal in user's "Following" feed

**Unfollow:**
1. Click "Following"
2. Confirm: "Unfollow this quest?"
3. Button → "Follow"
4. Removed from list

#### 4.3.3 Acceptance Criteria

- [ ] State persists after refresh
- [ ] Correct state on page load
- [ ] Count updates real-time
- [ ] User in followers list
- [ ] Owner cannot follow own goal
- [ ] Unauthenticated: "Sign in to follow"

### 4.4 Sacred Boost

#### 4.4.1 Overview

| Aspect | Detail |
|--------|--------|
| Purpose | Premium support action |
| Limit | 3 per user per month |
| Restriction | Cannot boost own goal, cannot boost same goal twice |

#### 4.4.2 User Flow

1. Visitor clicks "Sacred Boost"
2. Modal: "Give Sacred Boost to [Title]? You have X remaining this month."
3. Confirm
4. Boost recorded
5. Button → "Boosted" (disabled)
6. Owner notified

#### 4.4.3 Acceptance Criteria

- [ ] Shows remaining count
- [ ] Confirmation required
- [ ] Cannot boost twice
- [ ] Cannot boost own goal
- [ ] Boost count visible
- [ ] Monthly limit enforced

### 4.5 Resource Drop

#### 4.5.1 Overview

| Aspect | Detail |
|--------|--------|
| Purpose | Share helpful resources on nodes |
| Content | URL (optional) + Message (required) |
| Visibility | All users can view |

#### 4.5.2 User Flow

1. User clicks "Drop Resource" on node
2. Modal opens:
   - URL field (optional)
   - Message (required, max 500)
3. Submit
4. Resource visible to all
5. Owner notified

#### 4.5.3 Acceptance Criteria

- [ ] Modal opens on click
- [ ] URL validation if provided
- [ ] Message required
- [ ] Success feedback
- [ ] Visible to all users
- [ ] Unauthenticated: "Sign in to share"

### 4.6 Swap (Mutual Support Exchange)

#### 4.6.1 Overview

| Aspect | Detail |
|--------|--------|
| Purpose | Exchange support between achievers |
| Mechanism | "I help you if you help me" |
| Priority | P2 (not MVP) |

#### 4.6.2 User Flow

1. Supporter views achiever's goal
2. Clicks "Propose Swap"
3. Selects one of their own goals/nodes
4. Writes message: "I can help you with X, can you help me with Y?"
5. Achiever receives notification
6. Achiever accepts or declines
7. If accepted → mutual support begins

#### 4.6.3 Swap States

| State | Description |
|-------|-------------|
| Proposed | Awaiting response |
| Accepted | Both parties agreed |
| In Progress | Actively helping |
| Completed | Both sides fulfilled |
| Declined | Rejected by receiver |
| Cancelled | Withdrawn by proposer |

#### 4.6.4 Acceptance Criteria

- [ ] Can only propose if has own goals
- [ ] Clear proposal interface
- [ ] Notification to receiver
- [ ] Accept/decline actions
- [ ] Status tracking
- [ ] Rating after completion (future)

### 4.7 Mood Feature

#### 4.7.1 Overview

| Aspect | Detail |
|--------|--------|
| Purpose | Achiever shares emotional state about their goal |
| Frequency | Optional, can update anytime |
| Visibility | Public (supporters see it) |
| Levels | Goal-level and Node-level |

#### 4.7.2 Mood Types

| Emoji | Mood | Description |
|-------|------|-------------|
| 🔥 | On Fire | "Crushing it! Super motivated" |
| 😊 | Good | "Making progress, feeling positive" |
| 😐 | Neutral | "Steady, just working through it" |
| 😓 | Struggling | "Finding it hard, need support" |
| 😰 | Stuck | "Really struggling, need help" |
| 🎉 | Celebrating | "Just hit a milestone!" |

#### 4.7.3 User Flow - Set Mood

1. Achiever goes to their goal
2. Clicks mood indicator (or prompted)
3. Selects current mood
4. Optional: Add short note (max 140 chars)
5. Mood displayed on goal

#### 4.7.4 Mood Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| **Goal-level** | Overall feeling about the goal | "How's the journey going?" |
| **Node-level** | Feeling about specific step | "How's this step going?" |

#### 4.7.5 Prompt Frequency

| Trigger | Prompt |
|---------|--------|
| After completing a node | "How are you feeling about this goal?" |
| Node active > 7 days | "Still working on this? How's it going?" |
| First visit of the week | Quick mood check (optional, dismissable) |

**User control:**

| Setting | Options | Default |
|---------|---------|---------|
| Mood prompts | On / Off | On |
| Prompt frequency | After milestones / Weekly / Never | After milestones |

**No prompt when:**
- User already set mood today
- User dismissed 3 times → stop asking for that goal

#### 4.7.6 Supporter Benefits

| Feature | Description |
|---------|-------------|
| Filter by mood | "Show achievers who are struggling" |
| Mood history | See mood over time (graph) |
| Support prompts | "This achiever is struggling. Send support?" |
| Notifications | "Someone you follow is struggling" (opt-in) |

#### 4.7.7 Mood + Struggle Detection

| Source | Signal |
|--------|--------|
| **Manual** | Achiever sets mood to Struggling/Stuck |
| **Auto** | Node active too long (system detects) |
| **Combined** | Both signals = priority support needed |

#### 4.7.8 Gamification

| Action | XP |
|--------|-----|
| Update mood | +5 XP |
| Support someone struggling | +20 XP |
| Help someone from Stuck → Good | +50 XP (badge) |

#### 4.7.9 Privacy Option

| Setting | Description |
|---------|-------------|
| Mood visible | Public / Followers only / Private |
| Notify followers | Yes / No |

---

## 5. UI/UX Specifications

### 5.1 Design Principles

| Principle | Description |
|-----------|-------------|
| **Clean & Simple** | No overly themed language, minimal clutter |
| **Responsive** | Desktop, tablet, mobile - same features |
| **Fast** | Page loads < 2s, interactions < 200ms |
| **Accessible** | WCAG 2.1 AA compliance |
| **Dual Experience** | Desktop = Map view, Mobile = TikTok swipe |

### 5.2 Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Primary | Teal/Cyan | #14B8A6 |
| Secondary | Amber | #F59E0B |
| Background | Dark slate | #0F172A |
| Surface | Slate | #1E293B |
| Text primary | White | #FFFFFF |
| Text secondary | Slate 300 | #CBD5E1 |
| Success | Green | #22C55E |
| Error | Red | #EF4444 |
| Warning | Orange | #F97316 |

### 5.3 Difficulty Colors

| Level | Color | Hex |
|-------|-------|-----|
| Easy | Green | #22C55E |
| Medium | Yellow | #EAB308 |
| Challenging | Orange | #F97316 |
| Hard | Red | #EF4444 |
| Epic | Purple | #7C3AED |

### 5.4 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 | System | 32px | Bold |
| H2 | System | 24px | Semi-bold |
| H3 | System | 20px | Semi-bold |
| Body | System | 16px | Regular |
| Small | System | 14px | Regular |
| Caption | System | 12px | Regular |

### 5.5 Platform: Mobile Web App (PWA)

| Aspect | Approach |
|--------|----------|
| **Technology** | Progressive Web App (PWA) |
| **Install** | "Add to Home Screen" prompt |
| **Offline** | Service worker for basic caching |
| **Notifications** | Web Push API |
| **Swipe gestures** | Touch events / libraries (e.g., react-swipeable) |
| **Performance** | Code splitting, lazy loading |

### 5.6 Toast Notifications

| Type | Style | Duration |
|------|-------|----------|
| Info | Dark bg, white text | 3s |
| Success | Green border | 3s |
| Error | Red border | 5s |
| Action required | Amber border, with button | Until dismissed |

**Position:** Bottom-right (desktop), Bottom-center (mobile)

### 5.7 Empty States

| Context | Message |
|---------|---------|
| No comments | "No comments yet. Be the first to support!" |
| No reactions | "Be the first to react!" |
| No followers | "No supporters yet." |
| No goals (dashboard) | "Start your first quest!" |
| Struggling node | "This step is challenging. Can you help?" |

---

## 6. API Specifications

### 6.1 Authentication

| Aspect | Detail |
|--------|--------|
| Method | JWT Bearer Token |
| Access token expiry | 15 minutes |
| Refresh token expiry | 7 days |
| Auto-refresh | On 401, use refresh token, retry |

### 6.2 Base URL

```
/api
```

### 6.3 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

### 6.4 Endpoints

#### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh token |
| POST | /auth/logout | Logout |

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/me | Current user profile |
| PUT | /users/me | Update profile |
| GET | /users/{username} | Get user by username |
| PUT | /users/me/business | Enable/disable business option |

#### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /goals | Create goal |
| GET | /goals | List goals (with filters) |
| GET | /goals/{id} | Get goal |
| PUT | /goals/{id} | Update goal |
| DELETE | /goals/{id} | Delete goal |
| POST | /goals/{id}/generate-plan | AI generate nodes |
| PUT | /goals/{id}/mood | Set goal mood |

#### Nodes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /goals/{id}/nodes | Get goal nodes |
| GET | /nodes/{id} | Get node |
| PUT | /nodes/{id} | Update node |
| POST | /nodes/{id}/complete | Mark complete |
| PUT | /nodes/{id}/checklist | Update checklist |
| PUT | /nodes/{id}/positions | Save positions (batch) |
| PUT | /nodes/{id}/mood | Set node mood |

#### Reactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reactions | Add/change reaction |
| DELETE | /reactions/{target_type}/{target_id} | Remove reaction |
| GET | /reactions/{target_type}/{target_id}/summary | Get counts + user reaction |

#### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /comments | Add comment |
| GET | /comments/{target_type}/{target_id} | Get comments |
| DELETE | /comments/{id} | Delete comment |

#### Follows
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /follows | Follow goal |
| DELETE | /follows/goal/{id} | Unfollow |
| GET | /follows/check/goal/{id} | Check if following |
| GET | /follows/goals/{id}/followers | Get followers |

#### Sacred Boost
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /boosts/goals/{id} | Give boost |
| GET | /boosts/status | Get remaining boosts |
| GET | /boosts/goals/{id} | Get goal boosts |

#### Resource Drops
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /resources/nodes/{id} | Drop resource |
| GET | /resources/nodes/{id} | Get node resources |

#### Swaps
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /swaps | Propose swap |
| GET | /swaps | List my swaps |
| PUT | /swaps/{id}/accept | Accept swap |
| PUT | /swaps/{id}/decline | Decline swap |
| PUT | /swaps/{id}/complete | Mark complete |
| PUT | /swaps/{id}/cancel | Cancel swap |

#### Mood
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | /goals/{id}/mood | Set goal mood |
| PUT | /nodes/{id}/mood | Set node mood |
| GET | /goals/{id}/mood/history | Mood history |

#### Discovery
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /discover/trending | Trending goals |
| GET | /discover/struggling | Goals needing support |
| GET | /discover/categories/{cat} | Goals by category |
| GET | /discover/search?q= | Search goals |

#### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications | List notifications |
| PUT | /notifications/{id}/read | Mark read |
| PUT | /notifications/read-all | Mark all read |

### 6.5 Real-time (WebSocket)

| Event | Payload | Description |
|-------|---------|-------------|
| reaction.added | {target, type, count} | New reaction |
| reaction.removed | {target, type, count} | Reaction removed |
| comment.added | {target, comment} | New comment |
| follow.added | {goal_id, user} | New follower |
| mood.updated | {goal_id, node_id, mood} | Mood changed |
| node.completed | {goal_id, node_id} | Node completed |

---

## 7. Data Models

### 7.1 User

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| email | String(255) | Yes | Unique |
| username | String(50) | Yes | Unique |
| display_name | String(100) | No | Display name |
| password_hash | String | Yes | Hashed password |
| avatar_url | String | No | Profile image |
| bio | String(500) | No | User bio |
| is_business | Boolean | Yes | Business account flag |
| business_info | JSON | No | Business details |
| skills | String[] | No | Skills user can offer |
| xp | Integer | Yes | Experience points |
| level | Integer | Yes | Current level |
| streak_days | Integer | Yes | Current streak |
| created_at | DateTime | Yes | Registration date |
| updated_at | DateTime | Yes | Last update |

### 7.2 Goal

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | Owner (FK → User) |
| title | String(200) | Yes | Goal title |
| description | String(2000) | No | Full description |
| category | Enum | Yes | Goal category |
| visibility | Enum | Yes | public/private |
| visible_to_business | Boolean | Yes | Allow business access |
| status | Enum | Yes | active/completed/archived |
| world_theme | String | No | Visual theme |
| mood | Enum | No | Current mood |
| mood_note | String(140) | No | Mood message |
| mood_updated_at | DateTime | No | Last mood update |
| progress | Integer | Yes | Completion % (computed) |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last update |

### 7.3 Node

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| goal_id | UUID | Yes | Parent goal (FK → Goal) |
| title | String(200) | Yes | Node title |
| description | String(2000) | No | Full description |
| status | Enum | Yes | locked/active/completed |
| difficulty | Integer | Yes | 1-5 scale |
| position_x | Float | Yes | X coordinate (desktop) |
| position_y | Float | Yes | Y coordinate (desktop) |
| sequence | Integer | Yes | Order (mobile) |
| parent_ids | UUID[] | No | Dependency nodes |
| is_parallel | Boolean | Yes | Can work with siblings |
| checklist | JSON | No | Checklist items |
| mood | Enum | No | Current mood |
| mood_note | String(140) | No | Mood message |
| mood_updated_at | DateTime | No | Last mood update |
| started_at | DateTime | No | When became active |
| completed_at | DateTime | No | Completion date |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last update |

### 7.4 Reaction

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | Reactor (FK → User) |
| target_type | Enum | Yes | goal/node |
| target_id | UUID | Yes | Target ID |
| reaction_type | String | Yes | strength/push/celebrate/etc |
| created_at | DateTime | Yes | Creation date |

**Unique Constraint:** (user_id, target_type, target_id)

### 7.5 Comment

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | Author (FK → User) |
| target_type | Enum | Yes | goal/node |
| target_id | UUID | Yes | Target ID |
| content | String(500) | Yes | Comment text |
| parent_id | UUID | No | For replies |
| created_at | DateTime | Yes | Creation date |

### 7.6 Follow

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| follower_id | UUID | Yes | Follower (FK → User) |
| follow_type | Enum | Yes | user/goal |
| target_id | UUID | Yes | Target ID |
| created_at | DateTime | Yes | Creation date |

**Unique Constraint:** (follower_id, follow_type, target_id)

### 7.7 SacredBoost

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| booster_id | UUID | Yes | Giver (FK → User) |
| goal_id | UUID | Yes | Target goal (FK → Goal) |
| created_at | DateTime | Yes | Creation date |

**Unique Constraint:** (booster_id, goal_id)

### 7.8 ResourceDrop

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| dropper_id | UUID | Yes | Giver (FK → User) |
| node_id | UUID | Yes | Target node (FK → Node) |
| message | String(500) | Yes | Message |
| resources | JSON | No | URLs/links |
| created_at | DateTime | Yes | Creation date |

### 7.9 Swap

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| proposer_id | UUID | Yes | Who proposed (FK → User) |
| receiver_id | UUID | Yes | Who receives (FK → User) |
| proposer_goal_id | UUID | Yes | Proposer's goal (FK → Goal) |
| proposer_node_id | UUID | No | Specific node |
| receiver_goal_id | UUID | Yes | Receiver's goal (FK → Goal) |
| receiver_node_id | UUID | No | Specific node |
| message | String(500) | No | Proposal message |
| status | Enum | Yes | proposed/accepted/in_progress/completed/declined/cancelled |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last update |

### 7.10 Notification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | Recipient (FK → User) |
| type | Enum | Yes | reaction/comment/follow/boost/swap/mood |
| title | String(100) | Yes | Notification title |
| message | String(255) | Yes | Notification body |
| data | JSON | No | Extra data (IDs, links) |
| read | Boolean | Yes | Read status |
| created_at | DateTime | Yes | Creation date |

### 7.11 MoodHistory

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| user_id | UUID | Yes | Owner (FK → User) |
| target_type | Enum | Yes | goal/node |
| target_id | UUID | Yes | Target ID |
| mood | Enum | Yes | Mood value |
| note | String(140) | No | Optional note |
| created_at | DateTime | Yes | When set |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target |
|--------|--------|
| Page load (initial) | < 2 seconds |
| Page load (subsequent) | < 1 second |
| API response (p50) | < 200ms |
| API response (p95) | < 500ms |
| Real-time updates | < 200ms |
| Mobile swipe transition | < 100ms |

### 8.2 Scalability

| Metric | Target (Year 1) | Target (Year 3) |
|--------|-----------------|-----------------|
| Concurrent users | 10,000 | 100,000 |
| Total users | 100,000 | 1,000,000 |
| Goals | 500,000 | 5,000,000 |
| Nodes | 2,500,000 | 25,000,000 |
| Daily API requests | 1M | 50M |

### 8.3 Availability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Planned maintenance | < 4 hours/month |
| Recovery time (RTO) | < 1 hour |
| Data loss window (RPO) | < 1 hour |

### 8.4 Security

| Aspect | Requirement |
|--------|-------------|
| Transport | HTTPS only (TLS 1.3) |
| Authentication | JWT with refresh tokens |
| Password | Bcrypt hashing, min 8 chars |
| Rate limiting | 100 req/min per user, 1000 req/min per IP |
| Input validation | All endpoints |
| SQL injection | Prevented via ORM |
| XSS | Prevented via React |
| CSRF | Token-based protection |
| Data encryption | At rest (database) |

### 8.5 Privacy & Compliance

| Aspect | Requirement |
|--------|-------------|
| GDPR | Compliant (EU users) |
| Data export | User can export all data |
| Data deletion | User can delete account + all data |
| Cookie consent | Required for non-essential |
| Privacy controls | Per-goal visibility settings |
| Business access | Opt-in only |

### 8.6 Accessibility

| Standard | Target |
|----------|--------|
| WCAG | 2.1 AA compliance |
| Screen readers | Full support |
| Keyboard navigation | Full support |
| Color contrast | 4.5:1 minimum |
| Focus indicators | Visible |
| Alt text | All images |

### 8.7 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |
| Mobile Safari | iOS 14+ |
| Chrome Mobile | Android 10+ |

### 8.8 PWA Requirements

| Feature | Requirement |
|---------|-------------|
| Installable | Add to home screen |
| Offline | Basic caching (view cached goals) |
| Push notifications | Web Push API |
| App-like | Fullscreen, no browser UI |
| Fast | Service worker pre-caching |

### 8.9 Monitoring & Logging

| Aspect | Tool/Approach |
|--------|---------------|
| Error tracking | Sentry or similar |
| Performance | Web Vitals monitoring |
| Uptime | Health checks every 30s |
| Logs | Structured JSON logging |
| Analytics | Privacy-friendly (Plausible/Umami) |
| Alerts | Slack/Email on errors |

### 8.10 Backup & Recovery

| Aspect | Requirement |
|--------|-------------|
| Database backup | Daily automated |
| Backup retention | 30 days |
| Backup location | Separate region |
| Recovery test | Monthly |
| Point-in-time recovery | Enabled |

### 8.11 Infrastructure

| Component | Technology |
|-----------|------------|
| Frontend | Next.js (React) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Cache | Redis |
| File storage | S3-compatible (future videos) |
| Hosting | Docker containers |
| CI/CD | GitHub Actions |
| Deployment | Ansible |

---

## 9. Sprint Planning

### 9.1 Priority Definitions

| Priority | Meaning | Timeline |
|----------|---------|----------|
| P0 | MVP - Must have for launch | Sprint 1-2 |
| P1 | Should have - Important for UX | Sprint 3-4 |
| P2 | Nice to have - Can come later | Sprint 5+ |

### 9.2 Sprint 1: Fix Critical Bugs (1 week)

| Task | Issue | Priority |
|------|-------|----------|
| Fix reactions (all emojis, toggle, real-time) | #49 | P0 |
| Fix goal deletion (cascade) | #57 | P0 |
| Fix comments (direct add path) | #53 | P0 |
| Fix Sacred Boost button | #55 | P0 |
| Fix Resource Drop button | #56 | P0 |
| Fix node position save (owner) | #43 | P0 |

### 9.3 Sprint 2: New Reaction System (1 week)

| Task | Priority |
|------|----------|
| Update reaction types (6 core + extended) | P0 |
| Add action reactions (🤝→Swap, 🔔→Follow, 📦→Drop) | P0 |
| Reaction UI redesign | P0 |
| Real-time WebSocket for reactions | P1 |

### 9.4 Sprint 3: Mood Feature (1 week)

| Task | Priority |
|------|----------|
| Mood data model (goal + node level) | P1 |
| Mood API endpoints | P1 |
| Mood UI (set mood) | P1 |
| Mood display (goal header, node card) | P1 |
| Mood history | P1 |
| Mood prompts (after node complete) | P1 |
| Struggle detection integration | P1 |

### 9.5 Sprint 4: Node Difficulty & Struggle (1 week)

| Task | Priority |
|------|----------|
| Difficulty field in node model | P1 |
| AI assigns difficulty on generation | P1 |
| Difficulty display (colors, icons) | P1 |
| Struggle detection logic | P1 |
| "Needs help" indicator | P1 |
| Filter "show struggling achievers" | P1 |
| XP bonus based on difficulty | P1 |

### 9.6 Sprint 5: Mobile TikTok View (2 weeks)

| Task | Priority |
|------|----------|
| PWA setup (manifest, service worker) | P1 |
| Swipe gesture library integration | P1 |
| Vertical swipe (between achievers) | P1 |
| Horizontal swipe (between nodes) | P1 |
| Mobile card UI | P1 |
| Mobile reaction/comment overlay | P1 |
| Mobile bottom navigation | P1 |
| Testing on iOS + Android | P1 |

### 9.7 Sprint 6: Swap Feature (1 week)

| Task | Priority |
|------|----------|
| Swap data model | P2 |
| Swap API endpoints | P2 |
| Propose swap UI | P2 |
| Accept/decline UI | P2 |
| Swap status tracking | P2 |
| Swap notifications | P2 |
| 🤝 reaction triggers swap | P2 |

### 9.8 Sprint 7: Notifications & Real-time (1 week)

| Task | Priority |
|------|----------|
| Notification data model | P1 |
| Web Push setup | P1 |
| In-app notification center | P1 |
| WebSocket infrastructure | P1 |
| Real-time reactions/comments | P1 |
| Notification preferences | P1 |

### 9.9 Sprint 8: Discovery & Categories (1 week)

| Task | Priority |
|------|----------|
| Category system | P1 |
| Trending algorithm | P1 |
| "Struggling" filter | P1 |
| Search functionality | P1 |
| Discovery page redesign | P1 |
| Category browse | P1 |

### 9.10 Sprint Summary

| Sprint | Focus | Duration |
|--------|-------|----------|
| 1 | Fix critical bugs | 1 week |
| 2 | New reaction system | 1 week |
| 3 | Mood feature | 1 week |
| 4 | Difficulty & struggle | 1 week |
| 5 | Mobile TikTok view | 2 weeks |
| 6 | Swap feature | 1 week |
| 7 | Notifications & real-time | 1 week |
| 8 | Discovery & categories | 1 week |

**Total:** ~10 weeks to feature-complete

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Achiever** | User who creates goals and works to complete them |
| **Supporter** | User who helps achievers through reactions, comments, resources |
| **Goal** | An objective a user wants to achieve, visualized as quest map |
| **Node** | A step/milestone within a goal |
| **Quest Map** | Visual representation of goal as connected nodes (desktop) |
| **Reaction** | Quick emoji response to show support (💪🔥🙌💡🤝🔔) |
| **Comment** | Text message on a goal or node |
| **Follow** | Subscribe to track an achiever's progress |
| **Sacred Boost** | Premium support action (limited 3/month) |
| **Resource Drop** | Share helpful links/tips on a node |
| **Swap** | Mutual support exchange between two achievers |
| **Mood** | Emotional state of achiever about goal/node |
| **Difficulty** | 1-5 scale indicating how hard a node is |
| **Struggling** | System-detected or self-reported difficulty |
| **PWA** | Progressive Web App - mobile web app installable on device |
| **TikTok View** | Mobile swipe-based navigation (vertical=achievers, horizontal=nodes) |
| **Business Account** | Standard account with business option enabled |
| **XP** | Experience points earned through actions |
| **Streak** | Consecutive days of activity |

---

**Document History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-05 | Initial draft |
| 2.0 | 2026-01-05 | Complete review with user - approved |
