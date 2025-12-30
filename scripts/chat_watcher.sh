#!/bin/bash
# Gonado Chat Watcher - Uses Claude Code CLI to respond to chats

API_URL="http://localhost:7902/api"
POLL_INTERVAL=5

echo "🤖 Gonado Chat Watcher started"
echo "   Polling every ${POLL_INTERVAL}s for new messages..."
echo "   Press Ctrl+C to stop"
echo ""

while true; do
    # Get pending conversations
    PENDING=$(curl -s "${API_URL}/chat/pending/conversations")
    COUNT=$(echo "$PENDING" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    if [ "$COUNT" != "0" ]; then
        echo "📬 Found $COUNT pending conversation(s)"

        # Process each conversation
        echo "$PENDING" | python3 -c "
import sys
import json
import subprocess
import requests

API_URL = '${API_URL}'
conversations = json.load(sys.stdin)

for conv in conversations:
    conv_id = conv['conversation_id']
    user_name = conv['user_name']
    messages = conv['messages']

    print(f'💬 Processing conversation from {user_name}')

    # Build prompt for Claude
    prompt = '''You are an AI assistant helping users create goal quest maps on Gonado.
Your job is to have a friendly conversation to understand their goal, then create a structured plan.

Ask clarifying questions about:
- Timeline (when do they want to achieve this?)
- Experience level (beginner/intermediate/expert?)
- Resources available
- Specific milestones they envision

When you have enough info (usually after 3-5 exchanges), say \"I have enough information to create your quest map!\" and the system will prompt you for the plan.

Keep responses concise (2-4 paragraphs max).

CONVERSATION SO FAR:
'''

    for msg in messages:
        role = 'User' if msg['role'] == 'user' else 'Assistant'
        prompt += f\"{role}: {msg['content']}\n\n\"

    prompt += '''
Respond naturally to continue the conversation. Do not include \"Assistant:\" prefix.'''

    # Call Claude Code CLI
    try:
        result = subprocess.run(
            ['claude', '-p', prompt],
            capture_output=True,
            text=True,
            timeout=60
        )
        response = result.stdout.strip()

        if response:
            # Send response to API
            r = requests.post(
                f'{API_URL}/chat/respond/{conv_id}',
                json={'content': response}
            )
            if r.status_code == 200:
                print(f'✅ Response sent')
            else:
                print(f'❌ Failed to send: {r.text}')
        else:
            print(f'⚠️ Empty response from Claude')
            if result.stderr:
                print(f'   Error: {result.stderr[:200]}')
    except subprocess.TimeoutExpired:
        print('⚠️ Claude timed out')
    except Exception as e:
        print(f'❌ Error: {e}')
"
    fi

    sleep $POLL_INTERVAL
done
