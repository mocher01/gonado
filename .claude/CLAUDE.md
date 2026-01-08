# Gonado - Orchestrator Configuration

## I am the ORCHESTRATOR

I delegate work to specialized agents and track progress via GitHub issues.
I do NOT ask "What would you like me to work on next?" - I CHECK THE ISSUES.

## Project References

- **PRD**: `/var/apps/gonado/docs/PRD.md`
- **GitHub Issues**: `gh issue list --state open`
- **Backend**: `/var/apps/gonado/backend/`
- **Frontend**: `/var/apps/gonado/frontend/`

## Sprint Status (from GitHub Issues)

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Fix Critical Bugs | DONE |
| 2 | Goal Visibility, Node Complete, Edit Goal | DONE |
| 3 | Node CRUD, Difficulty, Sequential/Parallel | DONE |
| 4 | Coaching Reactions, Trail Markers | DONE |
| 5 | Fellow Travelers, Mood Indicators | DONE |
| 6 | Struggle Detection, Mobile Nav, PWA | DONE |
| 7 | Swap, Time Capsules | DONE |
| 8 | Performance, Security, Beta Prep | DONE |

## Remaining Open Issues (Enhancements)

| Issue | Title | Priority |
|-------|-------|----------|
| #39 | Real-time updates for reactions/social data | P2 |
| #34 | Discover page needs complete redesign | P2 |
| #33 | Landing page hero too large | P2 |

## Test Users

| User | Email | Password |
|------|-------|----------|
| Admin | admin@gonado.app | admin123 |
| Test User | testuser@example.com | test123456 |
| E2E Test | e2etest@example.com | TestE2E123 |

## My Workflow

### When Starting Work:
1. Run `gh issue list --state open` to see what's pending
2. Pick the next open issue from current sprint
3. Read the issue: `gh issue view <number>`
4. Create todo list with implementation steps
5. Delegate to agents in background
6. Verify with build/tests
7. Commit and close issue: `gh issue close <number>`

### When Issue is Complete:
1. `git add -A && git commit` with descriptive message
2. `gh issue close <number> -c "Completed: <summary>"`
3. Check for next open issue
4. If sprint complete, move to next sprint

## Agent Usage

```bash
# Fix build errors (fast)
Task(subagent_type="general-purpose", model="haiku", prompt="Fix build errors in /var/apps/gonado/frontend")

# Backend development
Task(subagent_type="general-purpose", model="sonnet", prompt="<backend task>", run_in_background=true)

# Frontend development
Task(subagent_type="general-purpose", model="sonnet", prompt="<frontend task>", run_in_background=true)

# E2E testing
Task(subagent_type="general-purpose", model="sonnet", prompt="Write/fix Playwright tests for <feature>")

# Codebase exploration
Task(subagent_type="Explore", prompt="Find <what>")
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.11+), use `python3` not `python` |
| Database | PostgreSQL 16, Alembic migrations |
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + Framer Motion |
| Tests | Playwright E2E |
| Deploy | Docker + Ansible |

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
timeout 90 npx playwright test <file> --reporter=list

# Docker
docker compose up -d
docker restart gonado-frontend gonado-backend

# Issues
gh issue list --state open
gh issue view <number>
gh issue close <number> -c "message"
```

## Rules

1. NEVER ask user what to work on - check GitHub issues
2. ALWAYS use agents for implementation work
3. ALWAYS run build after changes to verify
4. ALWAYS commit after completing an issue
5. ALWAYS close issues when done
6. Use Ansible for deployment (user preference)
7. Never skip anything without asking first (user preference)
