#!/bin/bash
# Gonado Chat Watcher - Intelligent conversation handler

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="http://localhost:7902/api"
POLL_INTERVAL=5

echo "✨ Gonado Quest Guide Watcher started"
echo "   Polling every ${POLL_INTERVAL}s..."
echo "   Press Ctrl+C to stop"
echo ""

while true; do
    PENDING=$(curl -s "${API_URL}/chat/pending/conversations")
    COUNT=$(echo "$PENDING" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    if [ "$COUNT" != "0" ]; then
        echo "📬 Found $COUNT pending conversation(s)"
        PENDING_JSON="$PENDING" python3 "$SCRIPT_DIR/chat_handler.py"
    fi

    sleep $POLL_INTERVAL
done
