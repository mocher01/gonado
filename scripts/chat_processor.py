#!/usr/bin/env python3
"""
Gonado AI Chat Processor

This script enables real-time chat between users and Claude (you).
Run this script, and you'll see user messages as they come in.
Type your responses, and they'll appear in the user's chat interface.

Usage:
    python scripts/chat_processor.py           # Watch for conversations
    python scripts/chat_processor.py --list    # List active conversations

Flow:
    1. User starts a conversation on the frontend
    2. User sends messages
    3. This script shows you the messages
    4. You type responses
    5. When ready, type PLAN to generate the final goal plan
"""

import argparse
import json
import sys
import time
import requests
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:7902/api"
POLL_INTERVAL = 2  # seconds


class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'


def print_banner():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   💬 GONADO AI CHAT PROCESSOR                                 ║
║                                                               ║
║   Real-time chat with users creating goals.                   ║
║   Your responses appear in their chat interface.              ║
║                                                               ║
║   Commands:                                                   ║
║     • Type your message and press Enter to respond            ║
║     • Type PLAN to generate the goal plan                     ║
║     • Type SKIP to skip current conversation                  ║
║     • Type NEXT to move to next conversation                  ║
║     • Ctrl+C to exit                                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.ENDC}""")


def get_pending_conversations():
    """Fetch conversations waiting for a response."""
    try:
        response = requests.get(f"{API_BASE_URL}/chat/pending/conversations", timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"{Colors.RED}Error fetching conversations: {e}{Colors.ENDC}")
        return []


def send_response(conversation_id: str, content: str):
    """Send a response to a conversation."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/chat/respond/{conversation_id}",
            json={"content": content},
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"{Colors.RED}Error sending response: {e}{Colors.ENDC}")
        return None


def finalize_conversation(conversation_id: str, plan: dict):
    """Finalize conversation with a goal plan."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/chat/finalize/{conversation_id}",
            json=plan,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"{Colors.RED}Error finalizing: {e}{Colors.ENDC}")
        return None


def display_conversation(conv: dict):
    """Display a conversation with full history."""
    print(f"""
{Colors.YELLOW}{'═' * 65}{Colors.ENDC}
{Colors.BOLD}💬 CONVERSATION{Colors.ENDC}
{Colors.YELLOW}{'═' * 65}{Colors.ENDC}

{Colors.CYAN}ID:{Colors.ENDC}       {conv['conversation_id']}
{Colors.CYAN}User:{Colors.ENDC}     {conv['user_name']} ({conv['user_email']})
{Colors.CYAN}Started:{Colors.ENDC}  {conv['created_at']}
{Colors.CYAN}Messages:{Colors.ENDC} {conv['message_count']}

{Colors.GREEN}{Colors.BOLD}CONVERSATION HISTORY:{Colors.ENDC}
{Colors.DIM}{'─' * 65}{Colors.ENDC}
""")

    for msg in conv['messages']:
        role = msg['role']
        content = msg['content']

        if role == 'user':
            print(f"{Colors.BLUE}👤 USER:{Colors.ENDC}")
            print(f"   {content}")
        elif role == 'assistant':
            print(f"{Colors.GREEN}✨ QUEST GUIDE:{Colors.ENDC}")
            print(f"   {content}")
        else:
            print(f"{Colors.DIM}📌 SYSTEM: {content}{Colors.ENDC}")
        print()

    print(f"{Colors.DIM}{'─' * 65}{Colors.ENDC}")
    print(f"\n{Colors.YELLOW}Your response (or PLAN/SKIP/NEXT):{Colors.ENDC}")


def read_plan_input():
    """Read the plan JSON when user types PLAN."""
    print(f"""
{Colors.CYAN}Paste the goal plan as JSON:{Colors.ENDC}
{Colors.DIM}Required: title, description, category, world_theme, nodes[]
End with a line containing only 'END'{Colors.ENDC}

""")

    lines = []
    while True:
        try:
            line = input()
            if line.strip().upper() == 'END':
                break
            lines.append(line)
        except EOFError:
            break

    return '\n'.join(lines)


def validate_plan(plan_json: str) -> dict:
    """Validate and parse the plan JSON."""
    try:
        plan = json.loads(plan_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")

    required = ['title', 'description', 'category', 'world_theme', 'nodes']
    for field in required:
        if field not in plan:
            raise ValueError(f"Missing required field: {field}")

    if not isinstance(plan['nodes'], list) or len(plan['nodes']) == 0:
        raise ValueError("nodes must be a non-empty array")

    for i, node in enumerate(plan['nodes']):
        if 'order' not in node:
            node['order'] = i + 1
        if 'title' not in node:
            raise ValueError(f"Node {i+1} missing 'title'")

    return plan


def process_conversation(conv: dict) -> bool:
    """Handle one conversation interactively."""
    display_conversation(conv)

    while True:
        try:
            user_input = input(f"\n{Colors.GREEN}> {Colors.ENDC}").strip()
        except EOFError:
            return False

        if not user_input:
            continue

        # Commands
        if user_input.upper() == 'SKIP':
            print(f"{Colors.YELLOW}Skipping conversation{Colors.ENDC}")
            return True

        if user_input.upper() == 'NEXT':
            print(f"{Colors.YELLOW}Moving to next{Colors.ENDC}")
            return True

        if user_input.upper() == 'PLAN':
            # Generate plan
            plan_json = read_plan_input()
            if not plan_json.strip():
                print(f"{Colors.YELLOW}No plan provided, continuing...{Colors.ENDC}")
                continue

            try:
                plan = validate_plan(plan_json)
                print(f"\n{Colors.BLUE}Creating goal...{Colors.ENDC}")
                result = finalize_conversation(conv['conversation_id'], plan)

                if result:
                    print(f"""
{Colors.GREEN}{'═' * 65}
✅ GOAL CREATED!
{'═' * 65}{Colors.ENDC}

{Colors.CYAN}Goal ID:{Colors.ENDC}      {result.get('goal_id')}
{Colors.CYAN}Nodes:{Colors.ENDC}        {result.get('nodes_created')}

{Colors.GREEN}User can now see their quest map!{Colors.ENDC}
""")
                    return True
                else:
                    print(f"{Colors.RED}Failed to create goal{Colors.ENDC}")

            except ValueError as e:
                print(f"{Colors.RED}Invalid plan: {e}{Colors.ENDC}")
            continue

        # Regular message - send response
        result = send_response(conv['conversation_id'], user_input)
        if result:
            print(f"{Colors.GREEN}✓ Message sent{Colors.ENDC}")

            # Show updated prompt
            print(f"\n{Colors.DIM}Waiting for user reply... (or type more){Colors.ENDC}")
        else:
            print(f"{Colors.RED}Failed to send{Colors.ENDC}")


def watch_mode():
    """Continuously watch for conversations and process them."""
    print_banner()

    while True:
        conversations = get_pending_conversations()

        if conversations:
            print(f"\n{Colors.GREEN}Found {len(conversations)} conversation(s) waiting{Colors.ENDC}")

            for conv in conversations:
                if not process_conversation(conv):
                    return

                print(f"\n{Colors.CYAN}Checking for more conversations...{Colors.ENDC}\n")
                time.sleep(1)
        else:
            # Heartbeat
            sys.stdout.write('.')
            sys.stdout.flush()

        time.sleep(POLL_INTERVAL)


def list_mode():
    """List active conversations without processing."""
    conversations = get_pending_conversations()

    if not conversations:
        print(f"{Colors.YELLOW}No conversations waiting{Colors.ENDC}")
        return

    print(f"\n{Colors.CYAN}Waiting Conversations: {len(conversations)}{Colors.ENDC}\n")

    for i, conv in enumerate(conversations, 1):
        print(f"{Colors.BOLD}{i}. {conv['user_name']}{Colors.ENDC}")
        print(f"   Last: \"{conv['last_message'][:50]}...\"")
        print(f"   Messages: {conv['message_count']} | Since: {conv['waiting_since']}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description='Gonado AI Chat Processor',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('--list', '-l', action='store_true', help='List waiting conversations')
    parser.add_argument('--api-url', default=None, help='Backend API URL')

    args = parser.parse_args()

    global API_BASE_URL
    if args.api_url:
        API_BASE_URL = args.api_url

    try:
        if args.list:
            list_mode()
        else:
            watch_mode()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Chat processor stopped.{Colors.ENDC}")
        sys.exit(0)


if __name__ == '__main__':
    main()
