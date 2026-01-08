# Gonado - Orchestrator Configuration

## I am the ORCHESTRATOR

I delegate work to specialized agents and track progress via GitHub issues.
I do NOT ask "What would you like me to work on next?" - I CHECK THE ISSUES.

---

## Project Overview

**Gonado** is a goal achievement social marketplace where:
- **Achievers** create goals, track progress through visual quest maps
- **Supporters** help achievers through reactions, comments, resources
- **Desktop**: Full quest map (React Flow)
- **Mobile**: TikTok-style swipe navigation

**PRD**: `/var/apps/gonado/docs/PRD.md` (1555 lines, Version 2.0)

---

## Issue Hierarchy

### Understanding Issue Types

| Type | Label | Description |
|------|-------|-------------|
| **Epic** | `epic` | Large feature area with sub-issues |
| **Sprint Issue** | `sprint-N` | Implementation task for a sprint |
| **P0/P1/P2** | `p0`,`p1`,`p2` | Priority-tagged work items |
| **MVP** | `mvp` | Required for minimum viable product |
| **Bug** | `bug` | Defect to fix |
| **Enhancement** | `enhancement` | New feature or improvement |

### Issue Count Summary

| Status | Count |
|--------|-------|
| Total Issues | 75 |
| Closed | 63 |
| **Open** | **12** |

---

## Open Issues (12 Total)

### MVP Epics Still Open (3)

| # | Title | Status | Notes |
|---|-------|--------|-------|
| **#15** | Discovery: Find Goals to Support | OPEN | Basic page exists, needs filters/search |
| **#16** | User Profiles: Achiever & Helper Reputation | OPEN | Needs profile page at /u/{username} |
| **#19** | Infrastructure: Ansible Deployment Playbooks | OPEN | Core working, nginx/ssl roles empty |

### Recently Closed MVP Issues

| # | Title | Completed |
|---|-------|-----------|
| #8 | Backend: Real-time WebSocket System | Redis listener in lifespan |
| #14 | Social Interactions | All sub-issues done |
| #17 | Frontend: Notifications & Alerts | NotificationBell, /notifications page |

### Non-MVP Epics (6)

| # | Title | Type |
|---|-------|------|
| #2 | UX Vision: The Quest Map | documentation |
| #20 | Skill: Goal Plan Generator | ai |
| #21 | EPIC: Gonado Vision | documentation |
| #22 | Support System: Help Requests & Donations | post-mvp |
| #23 | Organization Accounts | post-mvp |
| #24 | Business Sponsorship & Targeting | post-mvp |

### Enhancements (3)

| # | Title | Priority |
|---|-------|----------|
| #33 | Landing page hero too large | Low |
| #34 | Discover page redesign | Low |
| #39 | Real-time updates for reactions | Medium |

---

## Sprint Implementation Status

All sprint implementation issues are **CLOSED**:

| Sprint | Focus | Issues | Status |
|--------|-------|--------|--------|
| 1 | Critical Bugs | #43,#49,#53,#55,#56,#57 | DONE |
| 2 | Goal Visibility, Node Complete | #58,#59,#60 | DONE |
| 3 | Node CRUD, Difficulty, Sequential | #61,#62,#63 | DONE |
| 4 | Coaching Reactions, Trail Markers | #64,#65 | DONE |
| 5 | Fellow Travelers, Mood, Struggle | #66,#67,#68 | DONE |
| 6 | Mobile Nav, PWA | #69,#70 | DONE |
| 7 | Swap, Time Capsules | #71,#72 | DONE |
| 8 | Performance, Security, Beta Prep | #73,#74,#75 | DONE |

---

## What's Actually Missing for MVP

### 1. Discovery Page (#15) - PARTIAL
- Basic page exists with grid/mobile views
- Missing:
  - Category/stage filters
  - Search functionality
  - Trending algorithm
  - Recommendations

### 2. User Profiles (#16) - NOT STARTED
- Need profile page at /u/{username}
- Need reputation display
- Need badges system
- Need helper/achiever stats

### 3. Ansible Deployment (#19) - PARTIAL
- Working: site.yml, deploy.yml, common/docker/app roles
- Missing: nginx role, ssl role, vault, backups
- Core deployment functional for dev/staging

### Completed MVP Features

- **#8 WebSocket** - Redis listener runs in lifespan, subscribes to user/goal/global channels
- **#17 Notifications** - NotificationBell, NotificationDropdown, NotificationItem, /notifications page
- **#14 Social** - Comments, reactions, follows all working

---

## Test Users

| User | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@gonado.app | admin123 | Admin testing |
| Test User | testuser@example.com | test123456 | General testing |
| E2E Test | e2etest@example.com | TestE2E123 | Playwright tests |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.11+), use `python3` not `python` |
| Database | PostgreSQL 16, Alembic migrations |
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + Framer Motion |
| Flow | React Flow (quest map) |
| Tests | Playwright E2E |
| Deploy | Docker + Ansible |

---

## Key Commands

```bash
# Backend
cd /var/apps/gonado/backend
source venv/bin/activate
python3 -m pytest

# Frontend
cd /var/apps/gonado/frontend
npm run build
npm run dev
timeout 90 npx playwright test <file> --project=chromium --reporter=list

# Docker
docker compose up -d
docker restart gonado-frontend gonado-backend

# Issues
gh issue list --state open
gh issue view <number>
gh issue close <number> -c "message"

# E2E Tests
bash /var/apps/gonado/scripts/e2e_test.sh  # API tests
```

---

## Agent Usage

```bash
# Fix build errors (fast)
Task(subagent_type="general-purpose", model="haiku", prompt="Fix build errors")

# Backend development
Task(subagent_type="backend-dev", prompt="<task>", run_in_background=true)

# Frontend development
Task(subagent_type="frontend-dev", prompt="<task>", run_in_background=true)

# E2E testing
Task(subagent_type="e2e-tester", prompt="Write/fix tests for <feature>")

# Codebase exploration
Task(subagent_type="Explore", prompt="Find <what>")
```

---

## My Workflow

### When Starting Work:
1. Run `gh issue list --state open` to see what's pending
2. **Prioritize MVP issues over enhancements**
3. Read the issue: `gh issue view <number>`
4. Check if it's an epic - read sub-issues if so
5. Create todo list with implementation steps
6. Delegate to agents in background
7. Verify with build/tests
8. Commit and close issue

### When Issue is Complete:
1. Run tests to verify
2. `git add -A && git commit` with descriptive message
3. `gh issue close <number> -c "Completed: <summary>"`
4. If closing epic, verify all sub-issues closed first
5. Check for next open issue

---

## Rules

1. NEVER ask user what to work on - check GitHub issues
2. ALWAYS read PRD section before implementing a feature
3. ALWAYS use agents for implementation work
4. ALWAYS run build after changes to verify
5. ALWAYS commit after completing an issue
6. ALWAYS close issues when done
7. Use Ansible for deployment (user preference)
8. Never skip anything without asking first (user preference)
9. **Check if epic has sub-issues before claiming it's "done"**
10. **MVP issues take priority over enhancements**

---

## File Structure Reference

```
/var/apps/gonado/
├── .claude/
│   └── CLAUDE.md          # This file
├── backend/
│   ├── alembic/           # DB migrations
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── models/        # SQLAlchemy models
│   │   └── services/      # Business logic
│   └── venv/              # Python virtualenv
├── frontend/
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   └── tests/e2e/         # Playwright tests
├── docs/
│   └── PRD.md             # Product requirements (READ THIS)
├── scripts/
│   └── e2e_test.sh        # API E2E test script
└── docker-compose.yml     # Container orchestration
```
