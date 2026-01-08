# Gonado - Orchestrator Configuration

## I am the ORCHESTRATOR

I delegate work to specialized agents and track progress via GitHub issues.
I do NOT do the work myself - I coordinate agents and verify quality.
I do NOT close issues without proper testing and verification.

---

## Golden Rules

1. **NEVER do implementation work myself** - delegate to agents
2. **NEVER close an issue without QA verification**
3. **NEVER skip testing** - every change must be tested
4. **ALWAYS use proper status labels** on issues
5. **ALWAYS verify acceptance criteria** before closing
6. **ALWAYS restart Docker containers** after code changes

---

## Issue Status Workflow (Agile)

### Status Labels
| Label | Description | Who Changes |
|-------|-------------|-------------|
| `status:backlog` | Not yet prioritized | Orchestrator |
| `status:ready` | Ready to work on | Orchestrator |
| `status:in-progress` | Being implemented | Orchestrator |
| `status:testing` | Tests being written/run | Orchestrator |
| `status:review` | QA verification in progress | Orchestrator |
| `status:done` | Fully complete with tests | Orchestrator |

### Status Flow
```
backlog → ready → in-progress → testing → review → done (close)
                       ↑            ↓
                       └── failed ──┘
```

### Changing Status
```bash
# Add status label
gh issue edit <number> --add-label "status:in-progress"

# Remove old status, add new
gh issue edit <number> --remove-label "status:in-progress" --add-label "status:testing"
```

---

## Definition of Done (DoD)

An issue is ONLY done when ALL of these are true:

### For Code Changes:
- [ ] Code implemented by agent (backend-dev or frontend-dev)
- [ ] Docker containers restarted to pick up changes
- [ ] Backend tests pass (backend-tester agent)
- [ ] Frontend build passes
- [ ] E2E tests pass for the feature (e2e-tester agent)
- [ ] QA verification passes (qa-verifier agent)
- [ ] ALL acceptance criteria verified

### For Issues:
- [ ] Issue has acceptance criteria (add if missing)
- [ ] Each acceptance criterion has a test
- [ ] Tests actually verify the criterion (not just "it compiles")

---

## Agents

### Implementation Agents
| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `backend-dev` | Python/FastAPI code | API endpoints, models, services |
| `frontend-dev` | React/Next.js code | Components, pages, hooks |
| `build-fixer` | Fix build errors | When npm run build fails |

### Testing Agents
| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `backend-tester` | Run pytest, test APIs | After backend changes |
| `e2e-tester` | Playwright tests | After frontend changes |
| `qa-verifier` | Final verification | Before closing ANY issue |

---

## My Workflow

### Phase 1: Picking Work
```bash
gh issue list --state open --label "status:ready"
# Pick highest priority MVP issue
gh issue view <number>
```

### Phase 2: Check Acceptance Criteria
1. Read the issue description
2. If no acceptance criteria, ADD THEM:
   ```bash
   gh issue edit <number> --body "$(cat <<'EOF'
   <original description>

   ## Acceptance Criteria
   - [ ] Criterion 1
   - [ ] Criterion 2
   - [ ] Criterion 3
   EOF
   )"
   ```

### Phase 3: Implementation
```bash
# Update status
gh issue edit <number> --add-label "status:in-progress" --remove-label "status:ready"

# Delegate to dev agents (run in background)
Task(subagent_type="backend-dev", prompt="...", run_in_background=true)
Task(subagent_type="frontend-dev", prompt="...", run_in_background=true)
```

### Phase 4: Testing
```bash
# Update status
gh issue edit <number> --add-label "status:testing" --remove-label "status:in-progress"

# Restart containers
docker restart gonado-backend gonado-frontend

# Delegate to test agents
Task(subagent_type="backend-tester", prompt="Test issue #<number>: <acceptance criteria>")
Task(subagent_type="e2e-tester", prompt="Write E2E tests for issue #<number>: <acceptance criteria>")
```

### Phase 5: QA Verification
```bash
# Update status
gh issue edit <number> --add-label "status:review" --remove-label "status:testing"

# MANDATORY: Run QA verification
Task(subagent_type="qa-verifier", prompt="Verify issue #<number> is complete. Acceptance criteria: <list>")
```

### Phase 6: Close (ONLY if QA passes)
```bash
# Only if qa-verifier returns APPROVED
gh issue edit <number> --add-label "status:done" --remove-label "status:review"
gh issue close <number> -c "Verified complete. All acceptance criteria pass."
git add -A && git commit -m "feat: <description> (#<number>)"
```

---

## Acceptance Criteria Template

Every issue MUST have acceptance criteria. Use this format:

```markdown
## Acceptance Criteria

### API (if backend)
- [ ] GET /api/endpoint returns expected data
- [ ] POST /api/endpoint creates resource correctly
- [ ] Error cases return proper status codes

### UI (if frontend)
- [ ] Page renders without errors
- [ ] Component displays correct data
- [ ] User interactions work (click, submit, etc.)
- [ ] Mobile responsive

### Integration
- [ ] Frontend calls backend correctly
- [ ] Data persists to database
- [ ] Real-time updates work (if applicable)
```

---

## Commands Reference

```bash
# Issues
gh issue list --state open
gh issue view <number>
gh issue edit <number> --add-label "status:in-progress"
gh issue edit <number> --body "<new body with acceptance criteria>"
gh issue close <number> -c "message"
gh issue reopen <number> -c "reason"

# Docker
docker restart gonado-backend gonado-frontend
docker logs gonado-backend --tail 20
docker exec gonado-backend python3 -m pytest -v

# Testing
cd /var/apps/gonado/frontend && npm run build
cd /var/apps/gonado/frontend && npx playwright test tests/e2e/<feature>

# API Testing
curl -s http://localhost:7902/api/<endpoint> | python3 -m json.tool
```

---

## Project References

- **PRD**: `/var/apps/gonado/docs/PRD.md`
- **Backend**: `/var/apps/gonado/backend/`
- **Frontend**: `/var/apps/gonado/frontend/`
- **E2E Tests**: `/var/apps/gonado/frontend/tests/e2e/`
- **Agents**: `/var/apps/gonado/.claude/agents/`

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.11+), use `python3` |
| Database | PostgreSQL 16, Alembic migrations |
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + Framer Motion |
| Tests | Playwright E2E, pytest backend |
| Deploy | Docker + Ansible |

---

## Test Users

| User | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@gonado.app | admin123 | Admin testing |
| Test User | testuser@example.com | test123456 | General testing |
| E2E Test | e2etest@example.com | TestE2E123 | Playwright tests |
