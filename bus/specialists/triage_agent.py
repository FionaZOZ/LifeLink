"""Triage agent using Claude for MDAgents-style complexity classification.

References:
- Kim et al. 2024 (MDAgents, NeurIPS Oral) - multi-tier complexity classifier
"""
import os
import json
import logging
from anthropic import Anthropic
from uagents import Agent, Context
from shared.protocols import TriageRequest, TriageResult
from shared.chat import enable_chat, extract_text
from shared.discovery import register_capability_tags
from shared.event_bus import publish

logger = logging.getLogger(__name__)

TRIAGE_SYSTEM_PROMPT = """You are a triage specialist for cardiac emergencies. Classify the incoming emergency description as Low, Moderate, or High complexity.

- **High**: Clear cardiac arrest (unresponsive + not breathing). Requires immediate full response.
- **Moderate**: Serious but ambiguous (chest pain, syncope, shortness of breath). Requires assessment.
- **Low**: Minor issue (feels unwell, dizzy, anxious). May not require emergency response.

Output strict JSON:
{
  "complexity": "Low" | "Moderate" | "High",
  "suspected_condition": "string (e.g. 'cardiac arrest', 'syncope', 'anxiety')",
  "follow_up_questions": ["up to 2 questions if complexity != High"],
  "rationale": "1-2 sentence explanation"
}

If complexity is High and you are confident, return empty follow_up_questions.

Reference: Kim et al., MDAgents: Adaptive Collaboration of LLMs for Medical Decision-Making, NeurIPS 2024."""


def create_triage_agent(seed: str) -> Agent:
    """Create the Triage specialist agent."""
    agent = Agent(name="triage", seed=seed, mailbox=True)

    register_capability_tags(agent, [
        "cardiaclink-triage",
        "cardiaclink",
        "triage",
        "mdagents",
        "classifier",
        "emergency",
    ])

    anthropic_client = None
    if os.getenv("ANTHROPIC_API_KEY"):
        anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Triage agent started: {agent.address}")
        if anthropic_client:
            ctx.logger.info("Anthropic API key detected")
        else:
            ctx.logger.warning("ANTHROPIC_API_KEY not set -- triage agent in stub mode")

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="triage",
            capability="medical-triage",
            phase="heartbeat",
            summary="Triage agent active",
            data={"address": str(agent.address)}
        )

    @agent.on_message(model=TriageRequest, replies={TriageResult})
    async def handle_triage(ctx: Context, sender: str, msg: TriageRequest):
        """Handle triage classification requests."""
        ctx.logger.info(f"Triage request: {msg.text[:100]}")

        if not anthropic_client:
            # Stub mode: rule-based fallback
            if any(kw in msg.text.lower() for kw in ["not breathing", "unresponsive", "collapsed"]):
                complexity = "High"
                condition = "cardiac arrest"
                questions = []
                rationale = "Keywords suggest cardiac arrest"
            elif any(kw in msg.text.lower() for kw in ["chest pain", "syncope", "fainted"]):
                complexity = "Moderate"
                condition = "syncope or cardiac event"
                questions = ["Is the person responsive now?", "Any history of heart problems?"]
                rationale = "Possible cardiac event, needs assessment"
            else:
                complexity = "Low"
                condition = "unclear"
                questions = ["What are the current symptoms?"]
                rationale = "Insufficient information"

            await ctx.send(sender, TriageResult(
                complexity=complexity,
                suspected_condition=condition,
                follow_up_questions=questions,
                rationale=rationale,
            ))
            return

        # Claude mode
        try:
            response = anthropic_client.messages.create(
                model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                max_tokens=500,
                system=TRIAGE_SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": msg.text}
                ],
            )

            result_text = response.content[0].text
            result = json.loads(result_text)

            await ctx.send(sender, TriageResult(
                complexity=result["complexity"],
                suspected_condition=result["suspected_condition"],
                follow_up_questions=result.get("follow_up_questions", []),
                rationale=result["rationale"],
            ))
        except Exception as e:
            ctx.logger.error(f"Triage classification failed: {e}")
            await ctx.send(sender, TriageResult(
                complexity="Moderate",
                suspected_condition="error",
                follow_up_questions=[],
                rationale=f"Classification error: {str(e)}",
            ))

    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"Triage agent chat request: {text}")

        if not anthropic_client:
            return ("Triage agent in stub mode (ANTHROPIC_API_KEY not set). "
                   "Send an emergency description and I'll classify complexity as Low/Moderate/High.")

        try:
            response = anthropic_client.messages.create(
                model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
                max_tokens=500,
                system=TRIAGE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": text}],
            )

            result = json.loads(response.content[0].text)

            output = f"**Triage Classification** (MDAgents-inspired, NeurIPS 2024)\n\n"
            output += f"Complexity: **{result['complexity']}**\n"
            output += f"Suspected condition: {result['suspected_condition']}\n"
            output += f"Rationale: {result['rationale']}\n"

            if result.get("follow_up_questions"):
                output += f"\nFollow-up questions:\n"
                for q in result["follow_up_questions"]:
                    output += f"  {q}\n"

            return output
        except Exception as e:
            return f"Triage classification failed: {str(e)}"

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
