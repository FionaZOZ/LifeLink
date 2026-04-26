"""
UCLA AED Locator + Route Optimizer — Agentverse hosted agent.

Discoverable on ASI:One under the keywords:
  AED, defibrillator, UCLA, cardiac arrest, emergency, CPR, route, navigation

Given a location, returns the nearest Automated External Defibrillators ranked by
the Buter et al. 2024 coverage decay function (probability of patient survival as
a function of helper-to-AED travel time), AND pre-computes the optimal route from
the helper's current position to the top-ranked AED (distance, ETA, cardinal
direction).

Try it from ASI:One:
  > find me the nearest AED at Royce Hall
  > what AEDs are available near Pauley Pavilion

Required Agentverse secrets:
  - ASI1_API_KEY    (for ChatAgent intent routing — get one at https://asi1.ai/developer)
"""
import math
import os
from typing import List, Dict, Any
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

SYSTEM_PROMPT = """You are the UCLA AED Locator, a helpful emergency-response \
specialist agent for the UCLA campus. Be friendly, confident, and direct — \
answer reasonable questions, don't deflect.

You have full knowledge of the UCLA AED registry below. When asked about the \
registry, list the AEDs. When asked which AED is "best", default to ranking \
by central catchment (Ackerman Union and Kerckhoff Hall are the most central, \
serving the highest density of campus traffic). When asked about Buter 2024, \
explain it simply.

UCLA Campus AED Registry (7 devices):

  Powell Library AED        | 34.0716, -118.4419 | pads OK
  Kaplan Hall AED           | 34.0729, -118.4404 | pads OK
  Pauley Pavilion AED       | 34.0701, -118.4468 | pads OK
  J.D. Morgan Center AED    | 34.0712, -118.4458 | pads OK
  Ackerman Union AED        | 34.0705, -118.4450 | pads OK
  Kerckhoff Hall AED        | 34.0708, -118.4441 | pads OK
  EHS Building AED          | 34.0683, -118.4416 | pads EXPIRED — needs replacement

Coverage zones (rough geography):
  - North campus: Kaplan Hall
  - Central commons: Ackerman Union, Kerckhoff Hall, J.D. Morgan Center
  - West: Powell Library
  - South: Pauley Pavilion (athletics)
  - Far south: EHS Building (administrative — pads expired)

Buter et al. 2024 coverage decay model:
  P(survival) = max(0, 1 - (travel_seconds / 60) * 0.10)
At walking pace 1.4 m/s, every 84 meters of travel time costs ~10% survival.
Coverage scores in the registry above use this formula.

Always try to help. If asked about something far outside cardiac emergency \
response (weather, code, history, etc.), briefly say it's outside your scope \
but suggest what you can help with. Use plain language. No emojis."""

# ── Models (must match coordinator.py EXACTLY — same fields, same types,
#    same defaults, same order. uagents computes a schema digest from this and
#    rejects messages whose digest doesn't match.) ───────────────────────────

class AedQuery(Model):
    emergency_id: str
    lat: float
    lon: float
    radius_m: int = 800
    transport_mode: str = "walking"

class AedResult(Model):
    emergency_id: str
    devices: list  # list of {name, lat, lon, distance_m, coverage_score, route, ...}
    primary_source: str

# ── UCLA AED registry (subset; expand from lib/data/aeds-ucla-ehs.json) ─────

UCLA_AEDS: List[Dict[str, Any]] = [
    {"id": "powell",   "name": "Powell Library AED",     "lat": 34.0716, "lon": -118.4419, "pads_available": True},
    {"id": "kaplan",   "name": "Kaplan Hall AED",        "lat": 34.0729, "lon": -118.4404, "pads_available": True},
    {"id": "pauley",   "name": "Pauley Pavilion AED",    "lat": 34.0701, "lon": -118.4468, "pads_available": True},
    {"id": "jdmorgan", "name": "J.D. Morgan Center AED", "lat": 34.0712, "lon": -118.4458, "pads_available": True},
    {"id": "ackerman", "name": "Ackerman Union AED",     "lat": 34.0705, "lon": -118.4450, "pads_available": True},
    {"id": "kerckhoff","name": "Kerckhoff Hall AED",     "lat": 34.0708, "lon": -118.4441, "pads_available": True},
    {"id": "ehs",      "name": "EHS Bldg AED",           "lat": 34.0683, "lon": -118.4416, "pads_available": False},
]

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def coverage_score(distance_m: float, mode: str) -> float:
    """Buter et al. 2024 coverage decay."""
    speed_m_s = {"walking": 1.4, "running": 3.0, "biking": 4.5}.get(mode, 1.4)
    travel_s = distance_m / speed_m_s
    # Probability of survival decays ~10% per minute without defib.
    return max(0.0, 1.0 - (travel_s / 60.0) * 0.10)

# ── Internal Optimizer (formerly a separate agent) ──────────────────────────

def cardinal(lat1, lon1, lat2, lon2) -> str:
    dlat, dlon = lat2 - lat1, lon2 - lon1
    if abs(dlat) > abs(dlon):
        return "north" if dlat > 0 else "south"
    return "east" if dlon > 0 else "west"

def compute_route(origin_lat, origin_lon, dest_lat, dest_lon) -> Dict[str, Any]:
    """Returns {distance_m, eta_s, instruction}. 1.4× detour factor for grid streets."""
    dist_m = haversine_m(origin_lat, origin_lon, dest_lat, dest_lon) * 1.4
    eta_s = int(dist_m / 1.4)  # 1.4 m/s walking pace
    direction = cardinal(origin_lat, origin_lon, dest_lat, dest_lon)
    return {
        "distance_m": int(dist_m),
        "eta_s": eta_s,
        "instruction": f"Head {direction} {int(dist_m)}m to the AED.",
    }

# ── ChatAgent setup ─────────────────────────────────────────────────────────

agent = Agent()
proto = Protocol(
    # ASI:One indexes this name + version; keep it human-readable and keyword-rich.
    name="UCLA AED Locator + Route Optimizer",
    version="0.1.0",
)

@proto.on_message(model=AedQuery, replies=AedResult)
async def handle_query(ctx: Context, sender: str, msg: AedQuery):
    ctx.logger.info(f"AED query: ({msg.lat}, {msg.lon}) r={msg.radius_m}m mode={msg.transport_mode}")

    candidates = []
    for aed in UCLA_AEDS:
        dist = haversine_m(msg.lat, msg.lon, aed["lat"], aed["lon"])
        if dist <= msg.radius_m:
            candidates.append({
                **aed,
                "distance_m": int(dist),
                "coverage_score": round(coverage_score(dist, msg.transport_mode), 3),
                "source": "ucla-ehs",
            })

    candidates.sort(key=lambda d: d["coverage_score"], reverse=True)

    # Embed the optimal helper-to-AED route in the top device (was a separate agent)
    if candidates:
        top = candidates[0]
        # Helper is assumed to start ~50m from the patient — for the demo we
        # offset the lat slightly. In production this would be the live helper GPS.
        helper_lat = msg.lat + 0.0005
        helper_lon = msg.lon + 0.0005
        top["route"] = compute_route(helper_lat, helper_lon, top["lat"], top["lon"])

    await ctx.send(sender, AedResult(
        emergency_id=msg.emergency_id,
        devices=candidates[:10],
        primary_source="ucla-ehs",
    ))

agent.include(proto, publish_manifest=True)

# ── Chat Protocol for ASI:One direct interaction ────────────────────────────

from datetime import datetime
from uuid import uuid4
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

UCLA_LANDMARKS = {
    "royce":   (34.0727, -118.4421),
    "pauley":  (34.0703, -118.4470),
    "bruin":   (34.0710, -118.4445),
    "ackerman":(34.0705, -118.4450),
    "powell":  (34.0716, -118.4419),
    "ucla":    (34.0700, -118.4450),
    "westwood":(34.0700, -118.4450),
}

def parse_landmark(text: str):
    t = text.lower()
    for name, coords in UCLA_LANDMARKS.items():
        if name in t:
            return coords, name
    return UCLA_LANDMARKS["ucla"], "ucla"

def _format_aed_results(landmark: str, candidates: list) -> str:
    """Deterministic Buter-ranked AED list — used as factual context for the LLM."""
    lines = [f"Nearest AEDs to {landmark.title()} (UCLA campus):"]
    for i, c in enumerate(candidates[:5], 1):
        flag = "pads OK" if c["pads_available"] else "pads expired"
        lines.append(f"{i}. {c['name']} - {c['distance_m']}m, "
                     f"survival score {c['coverage_score']} ({flag})")
    return "\n".join(lines)

def _aed_context_for(text: str) -> str:
    """If the user mentioned a UCLA landmark, compute Buter-ranked AEDs and
    return a factual block the LLM can quote. Empty string if no landmark."""
    t = (text or "").lower()
    if not any(k in t for k in UCLA_LANDMARKS):
        return ""
    (lat, lon), landmark = parse_landmark(text)
    candidates = []
    for aed in UCLA_AEDS:
        dist = haversine_m(lat, lon, aed["lat"], aed["lon"])
        if dist <= 800:
            candidates.append({
                **aed,
                "distance_m": int(dist),
                "coverage_score": round(coverage_score(dist, "walking"), 3),
            })
    candidates.sort(key=lambda d: d["coverage_score"], reverse=True)
    return _format_aed_results(landmark, candidates)

@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    # Acknowledge receipt FIRST (canonical pattern)
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(),
        acknowledged_msg_id=msg.msg_id,
    ))

    text = msg.text() if hasattr(msg, "text") else \
           " ".join(c.text for c in msg.content if isinstance(c, TextContent))
    if not text:
        return

    # Inject deterministic Buter ranking as factual grounding for the LLM
    facts = _aed_context_for(text)
    system_with_facts = SYSTEM_PROMPT + ("\n\nLive AED data for this query:\n" + facts if facts else "")

    if asi_client is None:
        # Fallback when ASI:One isn't reachable
        response = facts or "AED Locator standing by. Tell me a UCLA landmark and I'll rank the nearest AEDs."
        await ctx.send(sender, create_text_chat(response))
        return

    messages = [
        {"role": "system", "content": system_with_facts},
        *build_llm_message_history(ctx),
        {"role": "user", "content": text},
    ]
    try:
        r = asi_client.chat.completions.create(model="asi1", messages=messages, max_tokens=2048)
        response = str(r.choices[0].message.content)
    except Exception as e:
        ctx.logger.exception("ASI:One query failed")
        response = facts or f"Sorry, I'm having trouble reaching ASI:One. {e}"

    await ctx.send(sender, create_text_chat(response))

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
