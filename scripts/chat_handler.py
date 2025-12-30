#!/usr/bin/env python3
"""
Chat handler - processes pending conversations
Called by chat_watcher.sh with PENDING_JSON env var
"""

import os
import json
import subprocess
import requests

API_URL = "http://localhost:7902/api"
MIN_EXCHANGES = 4


def process_conversations():
    pending_json = os.environ.get("PENDING_JSON", "[]")

    try:
        conversations = json.loads(pending_json)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return

    for conv in conversations:
        conv_id = conv["conversation_id"]
        user_name = conv["user_name"]
        messages = conv["messages"]

        # Count user messages
        user_messages = [m for m in messages if m["role"] == "user"]
        user_msg_count = len(user_messages)

        print(f"💬 Conversation from {user_name} ({user_msg_count} user messages)")

        # Build conversation history
        history = ""
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Quest Guide"
            history += f"{role}: {msg['content']}\n\n"

        # Determine phase
        ready_to_finalize = user_msg_count >= MIN_EXCHANGES

        # Check if last assistant message indicated readiness
        last_assistant_msg = ""
        for m in reversed(messages):
            if m["role"] == "assistant":
                last_assistant_msg = m["content"].lower()
                break

        explicitly_ready = any(phrase in last_assistant_msg for phrase in [
            # English
            "ready to create",
            "let me create",
            "creating your quest",
            "have everything i need",
            "got all the information",
            "should i go ahead",
            # French
            "vais créer",
            "créer ta carte",
            "créer votre carte",
            "prêt à créer",
            "j'ai tout ce qu'il me faut",
            "je peux créer"
        ])

        # Check if user confirmed
        last_user_msg = user_messages[-1]["content"].lower() if user_messages else ""
        user_confirmed = any(phrase in last_user_msg for phrase in [
            # English
            "yes", "sure", "go ahead", "create", "lets do it", "sounds good",
            "perfect", "ok", "okay", "yep", "yeah",
            # French
            "oui", "ouais", "d'accord", "vas-y", "go", "crée", "génial",
            "parfait", "super", "c'est bon", "j'attend", "j'attends"
        ])

        should_finalize = explicitly_ready and user_confirmed

        if should_finalize:
            handle_finalization(conv_id, history)
        else:
            handle_response(conv_id, history, ready_to_finalize, explicitly_ready)


def handle_finalization(conv_id, history):
    """
    Generate a quest map from the conversation.

    QUEST MAP GENERATION RULES:
    ===========================
    1. Nodes are displayed in a horizontal flow (left to right)
    2. First node is the START - no gateway needed before it
    3. Last node connects to "Goal Complete!" milestone
    4. Gateways (fork/join) are ONLY added when there are parallel tasks
    5. Most goals should be simple sequential flows (node → node → node)

    PARALLEL TASKS:
    - Only use can_parallel: true when tasks can TRULY be done simultaneously
    - Need at least 2 consecutive can_parallel nodes to create a parallel branch
    - Don't over-use parallelism - keep it simple for most goals

    NODE TYPES:
    - "task": Regular step (default, most common)
    - "milestone": Major checkpoint (use sparingly, 1-2 per goal max)

    NODE DESCRIPTION FORMAT (CRITICAL):
    ===================================
    Descriptions are displayed as TODO lists in the UI. Follow these rules:

    1. USE NEWLINES to separate items:
       GOOD: "Research local gyms\\nCompare membership prices\\nVisit top 3 options"
       BAD:  "Research local gyms. Compare membership prices. Visit top 3 options."

    2. NUMBERED LISTS work well:
       GOOD: "1. Create account\\n2. Set up profile\\n3. Configure notifications"

    3. KEEP ITEMS ACTIONABLE:
       GOOD: "Call 3 contractors for quotes"
       BAD:  "You should consider reaching out to some contractors"

    4. NO PROSE PARAGRAPHS:
       GOOD: "Sign up for course\\nComplete orientation\\nSubmit first assignment"
       BAD:  "First you'll want to sign up for the course, then complete the orientation..."

    5. EACH ITEM = ONE ACTION:
       GOOD: "Download app\\nCreate account\\nLink bank"
       BAD:  "Download app and create account, then link your bank"

    UI VISIBILITY CHECKLIST:
    ========================
    - First active node MUST have visible "Complete" button
    - All description text must be fully visible (no truncation)
    - Each TODO item should be under 80 characters
    """
    print(f"🎯 User confirmed - creating quest map...")

    plan_prompt = f"""Based on this conversation, create a detailed goal plan in JSON format.

CONVERSATION:
{history}

Generate a JSON object with:
- title: A motivating, specific title for the goal
- description: 2-3 sentence description
- category: One of: career, health, finance, education, personal, creative, hobby, home, cooking
- world_theme: One of: fantasy, space, ocean, mountain, forest, city, desert
- target_date: ISO date string or null
- nodes: Array of steps (5-10 nodes typically). Each node has:
  - title: Short step name (max 50 chars)
  - description: TODO-style checklist with NEWLINES between items. Use \\n to separate.
    Example: "Research options online\\nCompare 3 providers\\nSchedule consultations"
  - order: Sequential number starting from 1
  - node_type: "task" (default) or "milestone" (use sparingly for major checkpoints)
  - can_parallel: Boolean - true ONLY if this step can be done SIMULTANEOUSLY with adjacent steps
  - estimated_duration: Estimated hours to complete (integer)

DESCRIPTION FORMAT (CRITICAL):
- Use \\n (newline) to separate each action item
- Each item = ONE clear action verb + task
- Keep each item under 80 characters
- NO prose paragraphs, NO long sentences
- GOOD: "Create account on platform\\nComplete profile setup\\nVerify email address"
- BAD: "First, you should create an account on the platform. Then complete your profile..."

IMPORTANT RULES:
1. Keep it SIMPLE - most goals should be sequential (can_parallel: false for all nodes)
2. Only use can_parallel: true when tasks genuinely can happen at the same time
3. Need at least 2 CONSECUTIVE can_parallel: true nodes to create a parallel branch
4. Use "milestone" node_type sparingly (1-2 per goal maximum)
5. First node is always the starting point - no special handling needed

Output ONLY valid JSON, no other text."""

    try:
        result = subprocess.run(
            ["claude", "-p", plan_prompt],
            capture_output=True,
            text=True,
            timeout=120
        )
        plan_json = result.stdout.strip()

        # Clean markdown code blocks
        if plan_json.startswith("```"):
            lines = plan_json.split("\n")
            plan_json = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        if plan_json.startswith("json"):
            plan_json = plan_json[4:].strip()

        plan = json.loads(plan_json)

        r = requests.post(
            f"{API_URL}/chat/finalize/{conv_id}",
            json=plan
        )

        if r.status_code == 200:
            result_data = r.json()
            print(f"✅ Quest created! Goal ID: {result_data.get('goal_id')}")
        else:
            print(f"❌ Failed to finalize: {r.text}")
            requests.post(
                f"{API_URL}/chat/respond/{conv_id}",
                json={"content": "I encountered an issue creating your quest map. Let me ask a few more questions to make sure I have everything right."}
            )

    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        requests.post(
            f"{API_URL}/chat/respond/{conv_id}",
            json={"content": "I had trouble structuring your quest. Could you tell me more about your specific goals and timeline?"}
        )
    except Exception as e:
        print(f"❌ Error: {e}")


def handle_response(conv_id, history, ready_to_finalize, explicitly_ready):
    if ready_to_finalize and not explicitly_ready:
        prompt = f"""You are a Quest Guide helping create a personalized goal quest map.

CONVERSATION:
{history}

You have enough information. Summarize what you understand about their goal, timeline, and situation.
Then ask: "I think I have everything I need to create your personalized quest map! Should I go ahead and create it?"

Keep it concise (2-3 paragraphs). Do NOT include any prefix like "Quest Guide:" - just the message."""

    else:
        prompt = f"""You are a Quest Guide helping create a personalized goal quest map.

CONVERSATION:
{history}

Continue naturally. Ask ONE focused follow-up question about:
- Specific details about their goal
- Timeline (by when?)
- Current situation/experience
- Resources or constraints
- What success looks like

Be warm and specific. Reference what they told you.
Keep to 2-3 short paragraphs.
Do NOT include any prefix - just the message."""

    try:
        result = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=60
        )
        response = result.stdout.strip()

        if response:
            r = requests.post(
                f"{API_URL}/chat/respond/{conv_id}",
                json={"content": response}
            )
            if r.status_code == 200:
                print(f"✅ Response sent")
            else:
                print(f"❌ Failed: {r.text}")
        else:
            print(f"⚠️ Empty response")
    except subprocess.TimeoutExpired:
        print("⚠️ Timeout")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    process_conversations()
