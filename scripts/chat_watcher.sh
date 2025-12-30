#!/bin/bash
# Gonado Chat Watcher - Intelligent conversation handler

API_URL="http://localhost:7902/api"
POLL_INTERVAL=5
MIN_EXCHANGES=4  # Minimum user messages before considering finalization

echo "✨ Gonado Quest Guide Watcher started"
echo "   Polling every ${POLL_INTERVAL}s..."
echo "   Min exchanges before finalize: ${MIN_EXCHANGES}"
echo "   Press Ctrl+C to stop"
echo ""

while true; do
    PENDING=$(curl -s "${API_URL}/chat/pending/conversations")
    COUNT=$(echo "$PENDING" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    if [ "$COUNT" != "0" ]; then
        echo "📬 Found $COUNT pending conversation(s)"

        echo "$PENDING" | python3 << 'PYTHON_SCRIPT'
import sys
import json
import subprocess
import requests

API_URL = "http://localhost:7902/api"
MIN_EXCHANGES = 4

conversations = json.load(sys.stdin)

for conv in conversations:
    conv_id = conv['conversation_id']
    user_name = conv['user_name']
    messages = conv['messages']

    # Count user messages (excluding the initial system messages)
    user_messages = [m for m in messages if m['role'] == 'user']
    user_msg_count = len(user_messages)

    print(f'💬 Conversation from {user_name} ({user_msg_count} user messages)')

    # Build conversation history
    history = ""
    for msg in messages:
        role = 'User' if msg['role'] == 'user' else 'Quest Guide'
        history += f"{role}: {msg['content']}\n\n"

    # Determine phase: gathering info or ready to finalize
    ready_to_finalize = user_msg_count >= MIN_EXCHANGES

    # Check if last assistant message indicated readiness
    last_assistant_msg = ""
    for m in reversed(messages):
        if m['role'] == 'assistant':
            last_assistant_msg = m['content'].lower()
            break

    explicitly_ready = any(phrase in last_assistant_msg for phrase in [
        "ready to create",
        "let me create",
        "creating your quest",
        "have everything i need",
        "got all the information"
    ])

    # Check if user confirmed readiness
    last_user_msg = user_messages[-1]['content'].lower() if user_messages else ""
    user_confirmed = any(phrase in last_user_msg for phrase in [
        "yes", "sure", "go ahead", "create", "let's do it", "sounds good", "perfect", "ok", "okay"
    ])

    should_finalize = explicitly_ready and user_confirmed

    if should_finalize:
        print(f'🎯 User confirmed - creating quest map...')

        # Generate the plan
        plan_prompt = f'''Based on this conversation, create a detailed goal plan in JSON format.

CONVERSATION:
{history}

Generate a JSON object with:
- title: A motivating, specific title for the goal
- description: 2-3 sentence description of what they want to achieve
- category: One of: career, health, finance, education, personal, creative
- world_theme: One of: fantasy, space, ocean, mountain, forest, urban (pick based on their personality)
- target_date: ISO date string based on their timeline (or null if not specified)
- nodes: Array of 5-8 specific, actionable milestones with:
  - title: Short milestone name
  - description: Specific actions to take (2-3 sentences)
  - order: Sequential number

Make the nodes SPECIFIC to their situation, not generic. Reference details they mentioned.

Output ONLY valid JSON, no other text.'''

        try:
            result = subprocess.run(
                ['claude', '-p', plan_prompt],
                capture_output=True,
                text=True,
                timeout=120
            )
            plan_json = result.stdout.strip()

            # Clean up potential markdown code blocks
            if plan_json.startswith('```'):
                plan_json = plan_json.split('```')[1]
                if plan_json.startswith('json'):
                    plan_json = plan_json[4:]
            plan_json = plan_json.strip()

            plan = json.loads(plan_json)

            # Finalize the conversation
            r = requests.post(
                f'{API_URL}/chat/finalize/{conv_id}',
                json=plan
            )

            if r.status_code == 200:
                result_data = r.json()
                print(f'✅ Quest created! Goal ID: {result_data.get("goal_id")}')
            else:
                print(f'❌ Failed to finalize: {r.text}')
                # Send error message to user
                requests.post(
                    f'{API_URL}/chat/respond/{conv_id}',
                    json={'content': 'I encountered an issue creating your quest map. Let me try again - could you confirm your goal details?'}
                )

        except json.JSONDecodeError as e:
            print(f'❌ Invalid JSON from plan generation: {e}')
            requests.post(
                f'{API_URL}/chat/respond/{conv_id}',
                json={'content': 'I had trouble structuring your quest. Let me ask a few more questions to make sure I understand your goal correctly.'}
            )
        except Exception as e:
            print(f'❌ Error: {e}')

    else:
        # Continue conversation - ask more questions or propose finalization
        if ready_to_finalize and not explicitly_ready:
            # We have enough info, ask if ready to create
            prompt = f'''You are a Quest Guide helping someone create a personalized goal quest map.

CONVERSATION SO FAR:
{history}

You now have enough information about their goal. Summarize what you understand about:
- Their specific goal
- Timeline
- Their experience/starting point
- Key challenges or considerations

Then ask: "I think I have everything I need to create your personalized quest map! Should I go ahead and create it?"

Keep it concise (2-3 short paragraphs). Be enthusiastic but not over the top.
Do NOT include any prefix like "Quest Guide:" - just the message content.'''

        else:
            # Need more information
            prompt = f'''You are a Quest Guide helping someone create a personalized goal quest map.

CONVERSATION SO FAR:
{history}

Continue the conversation naturally. Ask ONE focused follow-up question to better understand:
- Specific details about their goal (what exactly do they want to achieve?)
- Timeline (by when?)
- Their current situation/experience level
- Resources or constraints
- What success looks like to them

Be warm, encouraging, and specific. Reference what they've already told you.
Keep response to 2-3 short paragraphs max.
Do NOT include any prefix like "Quest Guide:" - just the message content.'''

        try:
            result = subprocess.run(
                ['claude', '-p', prompt],
                capture_output=True,
                text=True,
                timeout=60
            )
            response = result.stdout.strip()

            if response:
                r = requests.post(
                    f'{API_URL}/chat/respond/{conv_id}',
                    json={'content': response}
                )
                if r.status_code == 200:
                    print(f'✅ Response sent')
                else:
                    print(f'❌ Failed to send: {r.text}')
            else:
                print(f'⚠️ Empty response')
                if result.stderr:
                    print(f'   Error: {result.stderr[:200]}')
        except subprocess.TimeoutExpired:
            print('⚠️ Timeout')
        except Exception as e:
            print(f'❌ Error: {e}')

PYTHON_SCRIPT
    fi

    sleep $POLL_INTERVAL
done
