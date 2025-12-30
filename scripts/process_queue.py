#!/usr/bin/env python3
"""
Gonado AI Queue Processor

This script watches the generation queue and processes goal creation requests.
It outputs pending goals and waits for expert plans to be pasted in.

Usage:
    python scripts/process_queue.py --watch     # Watch mode (continuous)
    python scripts/process_queue.py --once      # Process one item and exit
    python scripts/process_queue.py --list      # List pending items only

The plan should be pasted in JSON format:
{
    "title": "Run a Marathon",
    "description": "Complete a full 26.2 mile marathon",
    "category": "fitness",
    "world_theme": "mountain",
    "target_date": "2025-03-30",
    "nodes": [
        {
            "order": 1,
            "title": "Base Building",
            "description": "Build aerobic base with easy runs...",
            "duration_estimate": "2 weeks",
            "success_criteria": "Complete 3 runs per week",
            "tips": "Keep heart rate in zone 2"
        },
        ...
    ]
}
"""

import argparse
import json
import sys
import time
import requests
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:7902/api"  # Direct backend access
POLL_INTERVAL = 5  # seconds


class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_banner():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎯 GONADO AI QUEUE PROCESSOR                                ║
║                                                               ║
║   Watching for new goal generation requests...                ║
║   Paste expert plans when prompted.                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
{Colors.ENDC}
""")


def get_pending_items():
    """Fetch pending items from the queue API."""
    try:
        response = requests.get(f"{API_BASE_URL}/queue/pending", timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"{Colors.RED}Error fetching queue: {e}{Colors.ENDC}")
        return []


def mark_processing_started(queue_id: str):
    """Mark a queue item as being processed."""
    try:
        response = requests.post(f"{API_BASE_URL}/queue/process/{queue_id}/start", timeout=10)
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"{Colors.RED}Error marking as processing: {e}{Colors.ENDC}")
        return False


def complete_processing(queue_id: str, plan: dict):
    """Complete processing by submitting the plan."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/queue/process/{queue_id}/complete",
            json=plan,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"{Colors.RED}Error completing processing: {e}{Colors.ENDC}")
        return None


def fail_processing(queue_id: str, error_message: str):
    """Mark a queue item as failed."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/queue/process/{queue_id}/fail",
            params={"error_message": error_message},
            timeout=10
        )
        response.raise_for_status()
    except requests.RequestException:
        pass


def display_pending_item(item: dict):
    """Display a pending queue item."""
    print(f"""
{Colors.YELLOW}{'═' * 65}{Colors.ENDC}
{Colors.BOLD}🎯 NEW GOAL REQUEST{Colors.ENDC}
{Colors.YELLOW}{'═' * 65}{Colors.ENDC}

{Colors.CYAN}Queue ID:{Colors.ENDC}    {item['queue_id']}
{Colors.CYAN}User:{Colors.ENDC}        {item['user_email']}
{Colors.CYAN}Submitted:{Colors.ENDC}   {item['created_at']}
{Colors.CYAN}Waiting:{Colors.ENDC}     {item['waiting_seconds']} seconds

{Colors.GREEN}{Colors.BOLD}GOAL:{Colors.ENDC}
{Colors.BOLD}"{item['goal_text']}"{Colors.ENDC}

{Colors.YELLOW}{'─' * 65}{Colors.ENDC}
""")


def read_plan_input():
    """Read multi-line JSON plan input from stdin."""
    print(f"""
{Colors.CYAN}Paste the expert plan as JSON (end with a line containing only 'END'):{Colors.ENDC}
{Colors.BLUE}Tip: The JSON should have: title, description, category, world_theme, nodes[]{Colors.ENDC}

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

    # Required fields
    required = ['title', 'description', 'category', 'world_theme', 'nodes']
    for field in required:
        if field not in plan:
            raise ValueError(f"Missing required field: {field}")

    # Validate nodes
    if not isinstance(plan['nodes'], list) or len(plan['nodes']) == 0:
        raise ValueError("nodes must be a non-empty array")

    for i, node in enumerate(plan['nodes']):
        if 'order' not in node:
            node['order'] = i + 1
        if 'title' not in node:
            raise ValueError(f"Node {i+1} missing 'title'")
        if 'description' not in node:
            raise ValueError(f"Node {i+1} missing 'description'")

    return plan


def process_item(item: dict) -> bool:
    """Process a single queue item."""
    display_pending_item(item)

    # Mark as processing
    if not mark_processing_started(item['queue_id']):
        return False

    print(f"{Colors.BLUE}Status: PROCESSING{Colors.ENDC}")

    # Read plan input
    plan_json = read_plan_input()

    if not plan_json.strip():
        print(f"{Colors.YELLOW}Empty input - skipping this item{Colors.ENDC}")
        fail_processing(item['queue_id'], "Skipped by processor")
        return False

    # Check for skip command
    if plan_json.strip().upper() in ['SKIP', 'S']:
        print(f"{Colors.YELLOW}Skipping this item{Colors.ENDC}")
        fail_processing(item['queue_id'], "Skipped by processor")
        return False

    # Validate and parse plan
    try:
        plan = validate_plan(plan_json)
    except ValueError as e:
        print(f"{Colors.RED}Invalid plan: {e}{Colors.ENDC}")
        fail_processing(item['queue_id'], str(e))
        return False

    # Submit the plan
    print(f"\n{Colors.BLUE}Saving plan...{Colors.ENDC}")
    result = complete_processing(item['queue_id'], plan)

    if result:
        print(f"""
{Colors.GREEN}{'═' * 65}
✅ SUCCESS!
{'═' * 65}{Colors.ENDC}

{Colors.CYAN}Goal ID:{Colors.ENDC}      {result.get('goal_id')}
{Colors.CYAN}Nodes Created:{Colors.ENDC} {result.get('nodes_created')}

{Colors.GREEN}The user can now see their quest map!{Colors.ENDC}
""")
        return True
    else:
        return False


def watch_mode():
    """Continuously watch the queue and process items."""
    print_banner()

    while True:
        items = get_pending_items()

        if items:
            print(f"\n{Colors.GREEN}Found {len(items)} pending item(s){Colors.ENDC}")

            for item in items:
                process_item(item)
                print(f"\n{Colors.CYAN}Checking for more items...{Colors.ENDC}\n")
        else:
            # Print heartbeat dot
            sys.stdout.write('.')
            sys.stdout.flush()

        time.sleep(POLL_INTERVAL)


def once_mode():
    """Process one item and exit."""
    print_banner()

    items = get_pending_items()

    if not items:
        print(f"{Colors.YELLOW}No pending items in queue{Colors.ENDC}")
        return

    process_item(items[0])


def list_mode():
    """List all pending items without processing."""
    items = get_pending_items()

    if not items:
        print(f"{Colors.YELLOW}No pending items in queue{Colors.ENDC}")
        return

    print(f"\n{Colors.CYAN}Pending Queue Items: {len(items)}{Colors.ENDC}\n")

    for i, item in enumerate(items, 1):
        print(f"{Colors.BOLD}{i}. {item['goal_text'][:60]}...{Colors.ENDC}")
        print(f"   User: {item['user_email']} | Waiting: {item['waiting_seconds']}s")
        print()


def main():
    parser = argparse.ArgumentParser(
        description='Gonado AI Queue Processor',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/process_queue.py --watch     # Watch mode (continuous)
    python scripts/process_queue.py --once      # Process one item and exit
    python scripts/process_queue.py --list      # List pending items only
        """
    )

    parser.add_argument('--watch', '-w', action='store_true', help='Watch mode: continuously process queue')
    parser.add_argument('--once', '-o', action='store_true', help='Process one item and exit')
    parser.add_argument('--list', '-l', action='store_true', help='List pending items only')
    parser.add_argument('--api-url', default=None, help='Backend API URL (default: http://localhost:7902/api)')

    args = parser.parse_args()

    global API_BASE_URL
    if args.api_url:
        API_BASE_URL = args.api_url

    try:
        if args.list:
            list_mode()
        elif args.once:
            once_mode()
        elif args.watch:
            watch_mode()
        else:
            # Default to watch mode
            watch_mode()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Queue processor stopped.{Colors.ENDC}")
        sys.exit(0)


if __name__ == '__main__':
    main()
