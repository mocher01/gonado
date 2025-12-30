---
description: Manage Gonado AI Chat System - start watcher, check status, respond to conversations
allowed-tools: Bash(*), Read, Grep, Write
argument-hint: [start|status|respond|logs|test]
---

# Gonado AI Chat System Management

This command manages the real-time AI chat system for goal creation.

## Architecture Overview

The chat system allows users to have conversations with Claude to create personalized quest maps:

1. **Frontend** (`frontend/app/goals/new/page.tsx`): Chat UI that polls for messages
2. **Backend API** (`backend/app/api/chat.py`): Handles conversation state and messages
3. **Chat Watcher** (`scripts/chat_watcher.sh`): Automated responder using Claude CLI

### Database Models (`backend/app/models/conversation.py`)
- `Conversation`: Tracks conversation state (active, waiting, planning, completed, abandoned)
- `ConversationMessage`: Individual messages with roles (user, assistant, system)

### API Endpoints
- `POST /api/chat/start` - Start/resume conversation (requires auth)
- `GET /api/chat/current` - Get current active conversation
- `POST /api/chat/{id}/send` - User sends message (sets status to "waiting")
- `GET /api/chat/{id}/messages?since_sequence=N` - Poll for new messages
- `GET /api/chat/pending/conversations` - Get all waiting conversations (for watcher)
- `POST /api/chat/respond/{id}` - Send Claude's response
- `POST /api/chat/finalize/{id}` - Create goal from conversation

## Commands

### `/chat start`
Start the chat watcher in background to auto-respond to conversations:
```bash
cd /var/apps/gonado && nohup ./scripts/chat_watcher.sh > /tmp/chat_watcher.log 2>&1 &
```

### `/chat status`
Check chat system status:
```bash
# Check pending conversations
curl -s "http://localhost:7902/api/chat/pending/conversations" | python3 -m json.tool

# Check if watcher is running
pgrep -f chat_watcher.sh && echo "Watcher running" || echo "Watcher not running"
```

### `/chat respond`
Manually respond to a pending conversation. Arguments: $1=conversation_id $2=message

### `/chat logs`
View chat watcher logs:
```bash
tail -100 /tmp/chat_watcher.log
```

### `/chat test`
Test the chat API:
```bash
# Check API health
curl -s "http://localhost:7902/api/chat/pending/conversations"
```

## Flow

1. User visits `/goals/new` → starts conversation → gets welcome message
2. User sends message → status becomes "waiting"
3. Chat watcher polls `/api/chat/pending/conversations`
4. Watcher calls `claude -p` with conversation context
5. Watcher POSTs response to `/api/chat/respond/{id}`
6. Frontend polls and displays new message
7. **After 4+ exchanges**: Watcher summarizes and asks "Should I create your quest map?"
8. **User confirms**: Watcher generates plan and POSTs to `/api/chat/finalize/{id}`

## Finalization Rules

The watcher will ONLY finalize when:
- User has sent at least 4 messages (MIN_EXCHANGES=4)
- Last assistant message indicated readiness ("have everything I need", "ready to create", etc.)
- User confirmed with "yes", "sure", "go ahead", "ok", etc.

This prevents premature finalization and ensures quality, personalized plans.

## Plan JSON Format (for finalize)
```json
{
  "title": "Goal title",
  "description": "Goal description",
  "category": "career|health|finance|education|personal|creative",
  "world_theme": "fantasy|space|ocean|mountain|forest|urban",
  "target_date": "2025-12-31",
  "nodes": [
    {"title": "Step 1", "description": "...", "order": 1},
    {"title": "Step 2", "description": "...", "order": 2}
  ]
}
```

## Troubleshooting

- **Messages not appearing**: Check if watcher is running, check logs
- **500 errors**: Check backend logs with `docker logs gonado-backend`
- **Conversation stuck**: Use `/api/chat/{id}/abandon` to reset

Based on $ARGUMENTS, execute the appropriate action.
