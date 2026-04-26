"""
CardiacLink Triage Specialist — Agentverse hosted agent.

Uses Anthropic Claude to assess presentation and assign STEMI / arrest level.
Falls back to a rules-only path if ANTHROPIC_API_KEY is not set.

Required secrets:
  - ASI1_API_KEY
  - ANTHROPIC_API_KEY (optional — falls back to rules-only triage)
"""
import os
from typing import Optional
from uagents import Context, Model
from uagents.experimental.chat_agent import ChatAgent
from uagents.experimental.quota import QuotaProtocol

class TriageRequest(Model):
    emergency_id: str
    age: Optional[int] = None
    presentation: str = "collapsed_unresponsive"

class TriageResult(Model):
    emergency_id: str
    level: str             # "STEMI" | "presumptive_arrest" | "stable"
    notes: str

agent = ChatAgent()
proto = QuotaProtocol(
    storage_reference=agent.storage,
    name="Cardiac Arrest Triage (STEMI Detection)",
    version="0.1.0",
)

def rules_only_triage(presentation: str, age: Optional[int]) -> tuple[str, str]:
    p = presentation.lower()
    if "collapsed" in p or "unresponsive" in p or "no pulse" in p:
        return "presumptive_arrest", "Witness reports collapse with no response. Treat as cardiac arrest. Initiate CPR + AED."
    if "chest pain" in p:
        return "STEMI", "Chest pain presentation. Activate cath lab on ETA."
    return "stable", "No acute red flags reported."

@proto.on_message(model=TriageRequest, replies=TriageResult)
async def handle(ctx: Context, sender: str, msg: TriageRequest):
    level, notes = rules_only_triage(msg.presentation, msg.age)

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=200,
                messages=[{
                    "role": "user",
                    "content": f"Patient: age {msg.age or 'unknown'}, presentation: {msg.presentation}. "
                               f"Classify as STEMI / presumptive_arrest / stable. Add one-line clinical note. "
                               f"Reply in JSON: {{\"level\": ..., \"notes\": ...}}.",
                }],
            )
            import json
            text = response.content[0].text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(text[start:end])
                level = parsed.get("level", level)
                notes = parsed.get("notes", notes)
        except Exception as e:
            ctx.logger.warning(f"Claude triage fell back to rules: {e}")

    await ctx.send(sender, TriageResult(
        emergency_id=msg.emergency_id, level=level, notes=notes,
    ))

agent.include(proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
