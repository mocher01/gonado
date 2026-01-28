import json
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from app.config import settings

SYSTEM_PROMPT = """You are a goal planning expert helping users create actionable roadmaps to achieve their objectives.

When a user tells you their goal, you should:
1. Ask clarifying questions to understand:
   - The specific outcome they want (make it SMART - Specific, Measurable, Achievable, Relevant, Time-bound)
   - Their current starting point and resources
   - Time constraints and deadlines
   - Budget or resource constraints
   - Their motivation and commitment level
   - Any previous attempts at this goal

2. Based on their answers, generate an optimized plan broken into 5-10 milestone nodes.

3. Each node should have:
   - A clear title
   - A description of what needs to be accomplished
   - Position on the journey (order)
   - Suggested timeline

When generating the final plan, respond with a JSON object in this exact format:
{
    "world_theme": "mountain|ocean|forest|desert|space|city",
    "nodes": [
        {
            "title": "Node title",
            "description": "What to accomplish",
            "order": 1,
            "position_x": 0.0,
            "position_y": 0.0
        }
    ]
}

Choose a world_theme that matches the nature of the goal:
- mountain: Career growth, business goals, challenging achievements
- ocean: Travel, exploration, journey-based goals
- forest: Personal growth, learning, creative pursuits
- desert: Endurance goals, lifestyle changes, health
- space: Innovation, technology, ambitious dreams
- city: Urban projects, networking, social goals"""

PEDAGOGIC_PLAN_PROMPT = '''You are a compassionate goal coach helping complete beginners achieve their dreams.

Your job is to create a detailed, day-by-day action plan that:
1. ASSUMES ZERO KNOWLEDGE - Never use jargon without explaining it first
2. ONE ACTION PER DAY - Each day has exactly one clear task
3. EXPLAINS WHY - Every task includes a simple reason
4. INCLUDES REST - Rest days are explicit with light activities
5. CELEBRATES PROGRESS - Each milestone ends with encouragement

IMPORTANT PRINCIPLES:
- Talk like a friendly mentor, not a textbook
- If you would say "3-4 times per week", instead assign specific days
- First week tasks should be VERY simple to build confidence
- Include buffer days for life happening
- Gradually increase complexity

Generate a plan in this JSON format:
{
    "world_theme": "mountain|ocean|forest|desert|space|city",
    "milestones": [
        {
            "title": "Milestone name",
            "description": "What this phase accomplishes",
            "order": 1,
            "days": [
                {
                    "day_number": 1,
                    "action": "Clear, specific action to take today",
                    "why": "Simple explanation of why this matters",
                    "tip": "Optional helpful tip or link",
                    "duration": "Estimated time (e.g., '20 min')"
                }
            ],
            "celebration": "Encouragement message when milestone complete"
        }
    ]
}

Remember:
- Day 1 should be TRIVIALLY easy (build confidence)
- Include rest days with stretching/reflection activities
- Cover ALL days from now until target date
- Each milestone should be 1-2 weeks maximum
'''


class AIPlannerService:
    def __init__(self):
        # Only create client if API key is set and not a placeholder
        api_key = settings.ANTHROPIC_API_KEY
        has_valid_key = api_key and not api_key.startswith("your-") and len(api_key) > 20
        self.client = Anthropic(api_key=api_key) if has_valid_key else None

    async def generate_plan(
        self,
        goal_description: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generate a goal plan using Claude.
        Returns the plan with nodes and world theme.
        """
        if not self.client:
            # Return a default plan if no API key
            return self._generate_default_plan(goal_description)

        messages = conversation_history or []
        messages.append({"role": "user", "content": goal_description})

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                messages=messages
            )

            content = response.content[0].text

            # Try to parse JSON from response
            try:
                # Find JSON in the response
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    plan = json.loads(json_str)
                    return self._add_positions(plan)
            except json.JSONDecodeError:
                pass

            # If no JSON found, return the text for further conversation
            return {
                "type": "conversation",
                "message": content,
                "needs_more_info": True
            }

        except Exception as e:
            return {"error": str(e)}

    def _generate_default_plan(self, goal_description: str) -> Dict[str, Any]:
        """Generate a simple default plan when AI is not available."""
        return {
            "world_theme": "mountain",
            "nodes": [
                {
                    "title": "Research & Planning",
                    "description": f"Research and plan your approach to: {goal_description}",
                    "order": 1,
                    "position_x": 100,
                    "position_y": 400
                },
                {
                    "title": "First Steps",
                    "description": "Take the initial actions to get started",
                    "order": 2,
                    "position_x": 200,
                    "position_y": 350
                },
                {
                    "title": "Build Momentum",
                    "description": "Continue building on your progress",
                    "order": 3,
                    "position_x": 300,
                    "position_y": 280
                },
                {
                    "title": "Overcome Challenges",
                    "description": "Push through the difficult middle phase",
                    "order": 4,
                    "position_x": 400,
                    "position_y": 200
                },
                {
                    "title": "Final Push",
                    "description": "Make the final effort to reach your goal",
                    "order": 5,
                    "position_x": 500,
                    "position_y": 100
                }
            ]
        }

    async def generate_pedagogic_plan(
        self,
        title: str,
        description: str,
        target_date: str,
        category: str
    ) -> Dict[str, Any]:
        """Generate a detailed pedagogic plan with daily tasks."""
        if not self.client:
            return self._generate_default_pedagogic_plan(title, description, target_date)

        # Calculate days until target
        from datetime import datetime
        target = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
        days_until = (target - datetime.now(target.tzinfo)).days

        user_message = f'''Create a detailed day-by-day plan for this goal:

Goal: {title}
Description: {description}
Category: {category}
Days until target: {days_until} days
Target date: {target_date}

Generate a complete plan covering all {days_until} days with milestones and daily tasks.
Remember: Assume the person has ZERO experience with this topic.'''

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4000,
                system=PEDAGOGIC_PLAN_PROMPT,
                messages=[{"role": "user", "content": user_message}]
            )

            content = response.content[0].text

            # Parse JSON from response
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                plan = json.loads(content[json_start:json_end])
                return self._process_pedagogic_plan(plan)

            return {"error": "Could not parse plan from AI response"}

        except Exception as e:
            return {"error": str(e)}

    def _generate_default_pedagogic_plan(self, title: str, description: str, target_date: str) -> Dict[str, Any]:
        """Generate a simple default plan when AI is not available."""
        from datetime import datetime, timedelta

        # Calculate days until target
        try:
            target = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
            days_until = max((target - datetime.now(target.tzinfo)).days, 14)
        except:
            days_until = 30

        # Create 3 milestones with sample daily tasks
        days_per_milestone = days_until // 3

        return {
            "world_theme": "forest",
            "milestones": [
                {
                    "title": "Getting Started",
                    "description": f"Introduction to {title}",
                    "order": 1,
                    "days": [
                        {
                            "day_number": day,
                            "action": f"Day {day} task for getting started",
                            "why": "Building foundation and confidence",
                            "tip": "Take it one step at a time",
                            "duration": "15-20 min"
                        }
                        for day in range(1, days_per_milestone + 1)
                    ],
                    "celebration": "Great start! You've completed the first milestone."
                },
                {
                    "title": "Building Skills",
                    "description": "Developing core competencies",
                    "order": 2,
                    "days": [
                        {
                            "day_number": day,
                            "action": f"Day {day} task for building skills",
                            "why": "Strengthening your abilities",
                            "tip": "Practice makes progress",
                            "duration": "20-30 min"
                        }
                        for day in range(days_per_milestone + 1, days_per_milestone * 2 + 1)
                    ],
                    "celebration": "You're making real progress! Keep going."
                },
                {
                    "title": "Final Push",
                    "description": f"Achieving {title}",
                    "order": 3,
                    "days": [
                        {
                            "day_number": day,
                            "action": f"Day {day} task for final push",
                            "why": "Reaching your goal",
                            "tip": "You're almost there!",
                            "duration": "30 min"
                        }
                        for day in range(days_per_milestone * 2 + 1, days_until + 1)
                    ],
                    "celebration": "Congratulations! You've achieved your goal!"
                }
            ]
        }

    def _process_pedagogic_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Process and validate the pedagogic plan from AI."""
        # Ensure all required fields are present
        if "milestones" not in plan:
            return {"error": "Invalid plan format: missing milestones"}

        # Validate each milestone has required fields
        for milestone in plan.get("milestones", []):
            if "days" not in milestone:
                milestone["days"] = []
            if "celebration" not in milestone:
                milestone["celebration"] = "Great job completing this milestone!"

        return plan

    def _add_positions(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Add visual positions to nodes for quest map display."""
        nodes = plan.get("nodes", [])
        num_nodes = len(nodes)

        for i, node in enumerate(nodes):
            # Create a winding path going up
            progress = i / max(num_nodes - 1, 1)
            node["position_x"] = 100 + (progress * 400) + (50 * (i % 2))
            node["position_y"] = 400 - (progress * 300)

        return plan


ai_planner_service = AIPlannerService()
