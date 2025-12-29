# Gonado - Goal Achievement Platform

Transform your goals into epic journeys with AI-powered planning and community support.

## Features

- **Quest Map UX**: Goals visualized as journeys through procedural landscapes
- **AI Planning**: Claude-powered Q&A to build optimized roadmaps
- **Gamification**: XP, levels, streaks, badges, leaderboards
- **Real-time Social**: Live campfire interactions, flare alerts
- **Community Support**: Get help via advice, connections, or funding

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Storage | MinIO (S3-compatible) |
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + Framer Motion |
| Quest Map | PixiJS |
| AI | Anthropic Claude API |
| Deployment | Docker + Ansible |

## Quick Start

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Start with Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - MinIO Console: http://localhost:9001

## Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment with Ansible

```bash
cd ansible
ansible-playbook playbooks/deploy.yml -i inventory/production
```

## Project Structure

```
gonado/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── websocket/    # Real-time
│   ├── alembic/          # Migrations
│   └── Dockerfile
├── frontend/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   ├── hooks/            # Custom hooks
│   ├── stores/           # Zustand stores
│   └── Dockerfile
├── ansible/              # Deployment playbooks
├── nginx/                # Reverse proxy config
└── docker-compose.yml
```

## License

MIT
