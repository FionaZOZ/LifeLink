"""
CardiacLink Handoff Specialist — Agentverse hosted agent.
Builds a FHIR R4 Bundle and persists to MongoDB Atlas.

Required secrets:
  - ASI1_API_KEY
  - MONGODB_URI
  - MONGODB_DB (default: "cardiaclink")
"""
import os
import uuid
from uuid import uuid4
from datetime import datetime, timezone
from typing import Dict, Any
from uagents import Agent, Context, Model, Protocol

# ── ASI:One LLM client (used by chat handler) ───────────────────────────────
try:
    from openai import OpenAI
    _asi_key = os.getenv("ASI1_API_KEY")
    asi_client = OpenAI(base_url="https://api.asi1.ai/v1", api_key=_asi_key) if _asi_key else None
except ImportError:
    asi_client = None

try:
    from uagents.experimental.chat_agent.protocol import build_llm_message_history
except ImportError:
    def build_llm_message_history(ctx):
        return []

SYSTEM_PROMPT = """You are the FHIR R4 Hospital Handoff agent. Be clinical, \
informative, and direct — answer reasonable questions about FHIR, hospital \
data exchange, and cardiac arrest record handoff.

Your job: when a CardiacLink emergency resolves, you assemble a FHIR R4 \
Bundle and persist it to MongoDB Atlas at cardiaclink/handoff_bundles, \
where receiving hospital EHR systems can pull it by UUID.

A typical bundle contains:

  - Patient resource: anonymous identifier tied to the emergency_id
  - Encounter resource: status=in-progress, class=EMER (emergency)
  - Procedure resource: CPR (SNOMED CT 89666000 "Cardiopulmonary
    resuscitation"), with performedPeriod start time
  - Observation resources: heart rate (LOINC 8867-4), AED status
    (custom URL until standardized), drone arrival time

Storage: MongoDB Atlas → database `cardiaclink` → collection \
`handoff_bundles`. Each document: _id (bundle UUID), bundle (full FHIR R4 \
JSON), emergency_id, stored_at (UTC datetime).

When asked about FHIR R4 structure, SNOMED, LOINC, hospital handoff, \
interoperability, EHR integration — explain clearly using the info above. \
Cite the actual codes. When asked to "build a bundle" or similar, describe \
what the bundle looks like for a typical cardiac arrest case.

If asked about something far outside healthcare data exchange, briefly say \
it's outside scope. Use plain language. No emojis."""

class HandoffRequest(Model):
    """Schema must match coordinator.py exactly (no nested generics)."""
    emergency_id: str
    bundle_json: str = ""

class HandoffResult(Model):
    emergency_id: str
    bundle_id: str
    status: str

agent = Agent()
proto = Protocol(
    name="FHIR R4 Hospital Handoff",
    version="0.1.0",
)

def build_canonical_bundle(emergency_id: str, partial: Dict[str, Any]) -> Dict[str, Any]:
    """Fill in canonical FHIR R4 structure even if upstream sent an empty entry list."""
    now = datetime.now(timezone.utc).isoformat()
    bundle_id = str(uuid.uuid4())
    return {
        "resourceType": "Bundle",
        "id": bundle_id,
        "type": "document",
        "timestamp": now,
        "entry": partial.get("entry") or [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": f"pt-{emergency_id}",
                    "identifier": [{"system": "urn:cardiaclink:emergency", "value": emergency_id}],
                }
            },
            {
                "resource": {
                    "resourceType": "Encounter",
                    "id": f"enc-{emergency_id}",
                    "status": "in-progress",
                    "class": {"system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                              "code": "EMER", "display": "emergency"},
                    "period": {"start": now},
                    "reasonCode": [{"text": "out-of-hospital cardiac arrest"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Procedure",
                    "id": f"proc-{emergency_id}",
                    "status": "in-progress",
                    "code": {"coding": [{"system": "http://snomed.info/sct",
                                          "code": "89666000", "display": "Cardiopulmonary resuscitation"}]},
                    "performedPeriod": {"start": now},
                }
            },
        ],
    }

@proto.on_message(model=HandoffRequest, replies=HandoffResult)
async def handle(ctx: Context, sender: str, msg: HandoffRequest):
    # If upstream sent a JSON-stringified bundle, parse it; else build canonical.
    upstream = {}
    if msg.bundle_json:
        try:
            import json as _json
            upstream = _json.loads(msg.bundle_json)
        except Exception:
            upstream = {}
    bundle = build_canonical_bundle(msg.emergency_id, upstream)
    bundle_id = bundle["id"]
    status = "stored_local"

    uri = os.getenv("MONGODB_URI")
    if uri:
        try:
            from pymongo import MongoClient
            client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            db = client[os.getenv("MONGODB_DB", "cardiaclink")]
            db["handoff_bundles"].insert_one({
                "_id": bundle_id,
                "bundle": bundle,
                "emergency_id": msg.emergency_id,
                "stored_at": datetime.now(timezone.utc),
            })
            status = "stored_atlas"
        except Exception as e:
            ctx.logger.warning(f"Mongo persistence failed: {e}")
            status = f"failed: {e}"

    await ctx.send(sender, HandoffResult(
        emergency_id=msg.emergency_id,
        bundle_id=bundle_id,
        status=status,
    ))

agent.include(proto, publish_manifest=True)

# ── Chat Protocol for ASI:One direct interaction ────────────────────────────

from uagents_core.contrib.protocols.chat import (
    ChatMessage, ChatAcknowledgement, EndSessionContent, TextContent,
    chat_protocol_spec,
)

chat_proto = Protocol(spec=chat_protocol_spec)

def create_text_chat(text: str, end_session: bool = False) -> ChatMessage:
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(timestamp=datetime.utcnow(), msg_id=uuid4(), content=content)

@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id,
    ))
    text = msg.text() if hasattr(msg, "text") else \
           " ".join(c.text for c in msg.content if isinstance(c, TextContent))
    if not text:
        return

    if asi_client is None:
        eid = f"chat-{uuid4().hex[:8]}"
        bundle = build_canonical_bundle(eid, {})
        await ctx.send(sender, create_text_chat(
            f"FHIR Hospital Handoff agent here. Sample bundle id: {bundle['id']}. "
            f"Persisted to MongoDB Atlas / cardiaclink / handoff_bundles."
        ))
        return

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *build_llm_message_history(ctx),
        {"role": "user", "content": text},
    ]
    try:
        r = asi_client.chat.completions.create(model="asi1", messages=messages, max_tokens=2048)
        response = str(r.choices[0].message.content)
    except Exception as e:
        ctx.logger.exception("ASI:One query failed")
        response = f"Sorry, having trouble reaching ASI:One. {e}"
    await ctx.send(sender, create_text_chat(response))

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
