# Gonado Troubleshooting Guide

## Frontend Issues

### 404 Errors for _next/static/* Resources

**Symptoms:**
- Browser console shows 404 errors for `/_next/static/chunks/*.js` and `/_next/static/css/*.css`
- Error message: "Refused to apply style/execute script because its MIME type ('text/html') is not supported"
- Page loads HTML but no styles or interactivity

**Root Cause:**
Next.js dev server has cross-origin protection. When accessing via external IP (e.g., `162.55.213.90:7901`) instead of `localhost`, it blocks requests to `/_next/*` resources.

**Solution 1: Quick Fix (restart)**
```bash
# Delete corrupted .next folder and restart
rm -rf /var/apps/gonado/frontend/.next
docker restart gonado-frontend
# Wait ~30s for rebuild, then hard refresh browser (Ctrl+Shift+R)
```

**Solution 2: Permanent Fix (already applied)**
Add `allowedDevOrigins` to `next.config.js`:
```javascript
const nextConfig = {
  allowedDevOrigins: [
    'http://162.55.213.90:7901',
    'http://localhost:7901',
    'http://localhost:3000',
  ],
  // ... rest of config
};
```

**Prevention:**
- The `allowedDevOrigins` config is now in place
- If you change the server IP, update `next.config.js`
- Always hard refresh (Ctrl+Shift+R) after restarting frontend

---

### Hydration Mismatch Errors (style prop did not match)

**Symptoms:**
- Console warning: `Warning: Prop 'style' did not match. Server: "left:X%" Client: "left:Y%"`
- Error Component Stack shows random positioning components

**Root Cause:**
Using `Math.random()` in inline styles or animation props causes different values on server vs client during SSR hydration.

**Fix (already applied):**
Use a seeded pseudo-random function that produces consistent values:
```javascript
// Add to component file
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

// Then use seededRandom(i) instead of Math.random()
// Use different offsets for different values: seededRandom(i + 100), etc.
```

**Files fixed:**
- `frontend/app/page.tsx` - floating particles
- `frontend/components/goals/QuestMap.tsx` - floating particles
- `frontend/components/quest-map/BPMNQuestMap.tsx` - floating particles

---

### .next Build Folder Corruption

**Symptoms:**
- Frontend loads blank page
- Mixed 200/404 responses in server logs
- Build files exist but don't match what browser requests

**Cause:**
Volume mount between host and container can cause build state mismatch when:
- Host machine restarts
- Container restarts mid-build
- Manual file edits during dev server running

**Fix:**
```bash
# Stop container, clean build, restart
docker stop gonado-frontend
rm -rf /var/apps/gonado/frontend/.next
docker start gonado-frontend
# Or simply:
rm -rf /var/apps/gonado/frontend/.next && docker restart gonado-frontend
```

---

## Backend Issues

### Database Connection Errors

**Symptoms:**
- API returns 500 errors
- Backend logs show "connection refused" or "database does not exist"

**Fix:**
```bash
# Check if postgres is running
docker ps | grep postgres

# If not running
docker start gonado-postgres

# Check connection
docker exec gonado-postgres pg_isready -U gonado

# If tables are missing, run migrations
docker exec gonado-backend python3 -m alembic upgrade head
```

---

### Redis Connection Errors

**Symptoms:**
- Session/cache errors
- "Connection refused" to redis

**Fix:**
```bash
docker start gonado-redis
docker exec gonado-redis redis-cli ping  # Should return PONG
```

---

## Docker Issues

### Container Won't Start

**Check logs:**
```bash
docker logs gonado-<service> --tail 50
```

**Common fixes:**
```bash
# Restart all services
docker-compose -f /var/apps/gonado/docker-compose.yml restart

# If that fails, rebuild
docker-compose -f /var/apps/gonado/docker-compose.yml up -d --build
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :7901

# Kill if needed (carefully)
kill <PID>
```

---

## Quick Reference

| Service | Port | Container Name | Health Check |
|---------|------|----------------|--------------|
| Frontend | 7901 | gonado-frontend | `curl localhost:7901` |
| Backend | 7902 | gonado-backend | `curl localhost:7902/health` |
| Postgres | 7903 | gonado-postgres | `docker exec gonado-postgres pg_isready -U gonado` |
| Redis | 7904 | gonado-redis | `docker exec gonado-redis redis-cli ping` |
| MinIO | 7905/7906 | gonado-minio | `curl localhost:7905/minio/health/live` |

---

## Emergency Recovery

If everything is broken:
```bash
cd /var/apps/gonado

# Restart all containers
docker-compose restart

# If still broken, stop all and start fresh (preserves data)
docker-compose down
docker-compose up -d

# Check all services
docker-compose ps
```

**DO NOT run `docker-compose down -v`** - this deletes all data volumes!
