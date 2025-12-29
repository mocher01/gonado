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


class AIPlannerService:
    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None

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
