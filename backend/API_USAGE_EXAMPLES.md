# User Profile API - Usage Examples

## 1. Get Enhanced User Profile

**Request:**
```bash
GET /api/users/johndoe
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "display_name": "John Doe",
  "avatar_url": "https://example.com/avatars/johndoe.jpg",
  "bio": "Aspiring full-stack developer. Learning in public!",
  "xp": 2500,
  "level": 8,
  "streak_days": 15,
  "created_at": "2024-01-01T00:00:00Z",
  "stats": {
    "goals_created": 12,
    "goals_completed": 8,
    "achiever_score": 450,
    "supporter_score": 180,
    "comments_given": 45,
    "reactions_given": 120,
    "followers_count": 28,
    "following_count": 35
  },
  "badges": [
    {
      "id": "badge-001",
      "name": "Goal Crusher",
      "description": "Completed 5 goals",
      "icon_url": "https://example.com/badges/goal-crusher.png",
      "category": "achievement",
      "rarity": "rare",
      "earned_at": "2024-03-15T14:30:00Z"
    },
    {
      "id": "badge-002",
      "name": "First Step",
      "description": "Created your first goal",
      "icon_url": "https://example.com/badges/first-step.png",
      "category": "achievement",
      "rarity": "common",
      "earned_at": "2024-01-02T08:15:00Z"
    }
  ]
}
```

**Use Cases:**
- Display comprehensive user profile page
- Show user achievements and progress
- Calculate reputation/ranking
- Display social stats (followers, engagement)

---

## 2. Get User's Public Goals

### 2a. Get All Public Goals

**Request:**
```bash
GET /api/users/johndoe/goals
```

**Response:**
```json
{
  "goals": [
    {
      "id": "goal-001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Master React",
      "description": "Learn React and build 5 projects",
      "category": "learning",
      "visibility": "public",
      "status": "active",
      "world_theme": "mountain",
      "target_date": "2024-06-30T00:00:00Z",
      "created_at": "2024-01-15T00:00:00Z",
      "updated_at": "2024-04-01T10:30:00Z",
      "current_mood": "focused",
      "mood_updated_at": "2024-04-01T10:30:00Z"
    },
    {
      "id": "goal-002",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Get Fit",
      "description": "Exercise 3x per week for 3 months",
      "category": "health",
      "visibility": "public",
      "status": "completed",
      "world_theme": "forest",
      "target_date": "2024-03-31T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-03-31T18:00:00Z",
      "current_mood": "celebrating",
      "mood_updated_at": "2024-03-31T18:00:00Z"
    }
  ],
  "total": 12
}
```

### 2b. Get Only Active Goals

**Request:**
```bash
GET /api/users/johndoe/goals?status_filter=active
```

**Response:**
```json
{
  "goals": [
    {
      "id": "goal-001",
      "title": "Master React",
      "status": "active",
      ...
    },
    {
      "id": "goal-003",
      "title": "Read 20 Books",
      "status": "active",
      ...
    }
  ],
  "total": 4
}
```

### 2c. Get Only Completed Goals

**Request:**
```bash
GET /api/users/johndoe/goals?status_filter=completed
```

**Response:**
```json
{
  "goals": [
    {
      "id": "goal-002",
      "title": "Get Fit",
      "status": "completed",
      ...
    }
  ],
  "total": 8
}
```

### 2d. Paginated Goals

**Request:**
```bash
GET /api/users/johndoe/goals?skip=0&limit=5
```

**Response:**
```json
{
  "goals": [ /* 5 goals */ ],
  "total": 12
}
```

**Use Cases:**
- Display user's public goal feed
- Show active vs completed goals separately
- Browse all goals created by a user
- Implement "load more" pagination

---

## 3. Get User's Earned Badges

**Request:**
```bash
GET /api/users/johndoe/badges
```

**Response:**
```json
[
  {
    "id": "user-badge-001",
    "badge": {
      "id": "badge-001",
      "name": "Goal Crusher",
      "description": "Completed 5 goals",
      "icon_url": "https://example.com/badges/goal-crusher.png",
      "criteria": {
        "goals_completed": 5
      },
      "xp_reward": 100,
      "category": "achievement",
      "rarity": "rare",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "earned_at": "2024-03-15T14:30:00Z"
  },
  {
    "id": "user-badge-002",
    "badge": {
      "id": "badge-002",
      "name": "Social Butterfly",
      "description": "Received 50 reactions",
      "icon_url": "https://example.com/badges/social-butterfly.png",
      "criteria": {
        "reactions_received": 50
      },
      "xp_reward": 75,
      "category": "social",
      "rarity": "rare",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "earned_at": "2024-03-10T09:45:00Z"
  },
  {
    "id": "user-badge-003",
    "badge": {
      "id": "badge-003",
      "name": "First Step",
      "description": "Created your first goal",
      "icon_url": "https://example.com/badges/first-step.png",
      "criteria": {
        "goals_created": 1
      },
      "xp_reward": 25,
      "category": "achievement",
      "rarity": "common",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "earned_at": "2024-01-02T08:15:00Z"
  }
]
```

**Use Cases:**
- Display badge showcase on profile
- Show badge collection/trophy case
- Track achievement progress
- Gamification and motivation

---

## Frontend Integration Examples

### React/Next.js Example

```typescript
// Fetch user profile with stats and badges
async function fetchUserProfile(username: string) {
  const response = await fetch(`/api/users/${username}`);
  const profile = await response.json();

  return {
    user: profile,
    stats: profile.stats,
    badges: profile.badges
  };
}

// Fetch user's goals
async function fetchUserGoals(username: string, options = {}) {
  const { statusFilter, skip = 0, limit = 20 } = options;
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString()
  });

  if (statusFilter) {
    params.append('status_filter', statusFilter);
  }

  const response = await fetch(`/api/users/${username}/goals?${params}`);
  return await response.json();
}

// Fetch user's badges
async function fetchUserBadges(username: string) {
  const response = await fetch(`/api/users/${username}/badges`);
  return await response.json();
}

// Usage in a component
function UserProfile({ username }) {
  const [profile, setProfile] = useState(null);
  const [activeGoals, setActiveGoals] = useState([]);
  const [completedGoals, setCompletedGoals] = useState([]);

  useEffect(() => {
    // Fetch profile
    fetchUserProfile(username).then(setProfile);

    // Fetch active goals
    fetchUserGoals(username, { statusFilter: 'active' })
      .then(data => setActiveGoals(data.goals));

    // Fetch completed goals
    fetchUserGoals(username, { statusFilter: 'completed' })
      .then(data => setCompletedGoals(data.goals));
  }, [username]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1>{profile.display_name || profile.username}</h1>
      <p>Level {profile.level} - {profile.xp} XP</p>
      <p>{profile.streak_days} day streak!</p>

      {profile.stats && (
        <div className="stats">
          <div>Goals: {profile.stats.goals_completed}/{profile.stats.goals_created}</div>
          <div>Achiever Score: {profile.stats.achiever_score}</div>
          <div>Supporter Score: {profile.stats.supporter_score}</div>
          <div>Followers: {profile.stats.followers_count}</div>
          <div>Following: {profile.stats.following_count}</div>
        </div>
      )}

      {profile.badges.length > 0 && (
        <div className="badges">
          <h2>Badges ({profile.badges.length})</h2>
          {profile.badges.map(badge => (
            <div key={badge.id} className={`badge rarity-${badge.rarity}`}>
              <img src={badge.icon_url} alt={badge.name} />
              <span>{badge.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="goals">
        <h2>Active Goals ({activeGoals.length})</h2>
        {activeGoals.map(goal => (
          <GoalCard key={goal.id} goal={goal} />
        ))}

        <h2>Completed Goals ({completedGoals.length})</h2>
        {completedGoals.map(goal => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
```

---

## Error Handling

### User Not Found (404)
```json
{
  "detail": "User not found"
}
```

**When:** Username doesn't exist in the database

**HTTP Status:** 404 Not Found

---

## Privacy Notes

1. **Goals**: Only PUBLIC goals are returned by the `/goals` endpoint
2. **Stats**: User stats are public (for leaderboards/reputation)
3. **Badges**: All earned badges are public (achievement showcase)
4. **Private Goals**: Users with PRIVATE goals will only see those in their own `/api/users/me` endpoint

---

## Performance Tips

1. **Caching**: Consider caching user profiles for frequently viewed users
2. **Pagination**: Use pagination for users with many goals (limit: 20-50)
3. **Eager Loading**: The API uses `selectinload()` to avoid N+1 queries
4. **Rate Limiting**: Implement rate limiting for public profile endpoints

---

## Future Enhancements

- Filter badges by category/rarity
- Sort goals by different criteria (date, progress, popularity)
- Include goal completion percentage
- Add follower/following lists
- Include user's recent activity/updates
