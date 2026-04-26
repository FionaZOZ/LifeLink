"""
LAFD EMS + AED Drone Dispatch — Agentverse hosted agent.

Discoverable on ASI:One under the keywords:
  EMS, ambulance, LAFD, dispatch, drone, AED delivery, emergency response

Given a location, finds the nearest LAFD ALS rescue unit AND the nearest AED-
payload drone staging pad, returns ETA for both, and (optionally) translates
the location into a What3Words address for the dispatcher.

Try it from ASI:One:
  > Send EMS to Pauley Pavilion
  > Launch a drone to Royce Hall

Required Agentverse secrets:
  - ASI1_API_KEY
  - WHAT3WORDS_API_KEY (optional — falls back to deterministic 3-word stub)
"""
import os
from typing import Optional, Dict, Any
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

SYSTEM_PROMPT = """You are the LAFD EMS + AED Drone Dispatch agent for UCLA \
campus emergencies. Be operational, brief, and direct — answer reasonable \
questions, don't deflect.

You coordinate two parallel rescue assets:

  Ground EMS (LAFD ALS Rescue stations):
    - Rescue 37 : 34.0759, -118.4392 (closest to north campus)
    - Rescue 92 : 34.0469, -118.4445 (south, longer ETA)
    - Rescue 19 : 34.0612, -118.4370 (east)
  Avg speed in city: 11 m/s + 60s mobilization.

  AED-payload drones (staging pads on/near UCLA):
    - DRONE-A1 : 34.0721, -118.4435 (central campus)
    - DRONE-B2 : 34.0699, -118.4470 (athletics zone)
    - DRONE-C3 : 34.0758, -118.4395 (north)
  Cruise: 18 m/s + 12s spin-up. Drone arrives first when ground ETA exceeds
  drone cruise time, which is most of the time on a dense campus.

For any UCLA-area location, dispatch BOTH the nearest ground unit and the \
nearest drone in parallel — that's the standard CardiacLink playbook. Report \
ETAs and (when WHAT3WORDS_API_KEY is set) the 3-word address for the 911 \
dispatcher.

When asked about your stations, drones, or how dispatch decisions are made, \
answer directly using the data above. Don't ask the user to specify if \
they've already given enough.

If asked about something far outside emergency dispatch, briefly say it's \
outside scope. Use plain language. No emojis."""

class EmsRequest(Model):
    emergency_id: str
    lat: float
    lon: float
    address: str
    chief_complaint: str = "cardiac_arrest"

class EmsResult(Model):
    """Bundles ground EMS dispatch + AED drone launch in one response.
    Schema must match coordinator.py exactly (no nested generics)."""
    emergency_id: str
    unit: str
    eta_s: int
    what3words: str = ""
    drone_id: str = ""
    drone_eta_s: int = 0

agent = Agent()
proto = Protocol(
    name="LAFD EMS + AED Drone Dispatch",
    version="0.1.0",
)

# LAFD ALS rescue stations near UCLA (approx)
STATIONS = [
    {"unit": "LAFD ALS Rescue 37", "lat": 34.0759, "lon": -118.4392},
    {"unit": "LAFD ALS Rescue 92", "lat": 34.0469, "lon": -118.4445},
    {"unit": "LAFD ALS Rescue 19", "lat": 34.0612, "lon": -118.4370},
]

# AED-payload drone staging pads on/near UCLA campus
DRONE_PADS = [
    {"id": "DRONE-A1", "lat": 34.0721, "lon": -118.4435},
    {"id": "DRONE-B2", "lat": 34.0699, "lon": -118.4470},
    {"id": "DRONE-C3", "lat": 34.0758, "lon": -118.4395},
]

def dispatch_drone(lat: float, lon: float) -> Dict[str, Any]:
    """Internal Drone handler (formerly a separate agent). Returns {drone_id, eta_s, aed_payload}."""
    nearest = min(DRONE_PADS, key=lambda p: haversine_m(lat, lon, p["lat"], p["lon"]))
    dist_m = haversine_m(lat, lon, nearest["lat"], nearest["lon"])
    # Drone cruise: 18 m/s + 12s spin-up
    return {"drone_id": nearest["id"], "eta_s": int(dist_m / 18.0 + 12), "aed_payload": True}

def what3words_lookup(lat: float, lon: float) -> Optional[str]:
    api_key = os.getenv("WHAT3WORDS_API_KEY")
    if not api_key:
        # Deterministic stub so the demo doesn't show "None"
        return "campus.lecture.collapse"
    try:
        import httpx
        r = httpx.get(
            "https://api.what3words.com/v3/convert-to-3wa",
            params={"coordinates": f"{lat},{lon}", "key": api_key},
            timeout=2.0,
        )
        if r.status_code == 200:
            return r.json().get("words")
    except Exception as e:
        print(f"[ems] what3words failed: {e}")
    return None

import math
def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

@proto.on_message(model=EmsRequest, replies=EmsResult)
async def handle(ctx: Context, sender: str, msg: EmsRequest):
    nearest = min(STATIONS, key=lambda s: haversine_m(msg.lat, msg.lon, s["lat"], s["lon"]))
    dist_m = haversine_m(msg.lat, msg.lon, nearest["lat"], nearest["lon"])
    # Assume 11 m/s avg ambulance speed in city, plus 60s mobilization.
    eta_s = int(dist_m / 11.0 + 60)

    drone = dispatch_drone(msg.lat, msg.lon)

    await ctx.send(sender, EmsResult(
        emergency_id=msg.emergency_id,
        unit=nearest["unit"],
        eta_s=eta_s,
        what3words=what3words_lookup(msg.lat, msg.lon) or "",
        drone_id=drone["drone_id"],
        drone_eta_s=drone["eta_s"],
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
    "ucla":    (34.0700, -118.4450),
}

def parse_loc(text):
    t = (text or "").lower()
    for name, coords in UCLA_LANDMARKS.items():
        if name in t:
            return coords, name
    return UCLA_LANDMARKS["ucla"], "ucla"

def _ems_context_for(text: str) -> str:
    """Live ground+air dispatch facts for any UCLA landmark in the text."""
    t = (text or "").lower()
    if not any(k in t for k in UCLA_LANDMARKS):
        return ""
    (lat, lon), landmark = parse_loc(text)
    nearest = min(STATIONS, key=lambda s: haversine_m(lat, lon, s["lat"], s["lon"]))
    dist_m = haversine_m(lat, lon, nearest["lat"], nearest["lon"])
    eta_s = int(dist_m / 11.0 + 60)
    drone = dispatch_drone(lat, lon)
    w3w = what3words_lookup(lat, lon)
    return (
        f"Live dispatch for {landmark.title()}:\n"
        f"Ground EMS: {nearest['unit']} ETA {eta_s}s ({eta_s//60}min {eta_s%60}s)\n"
        f"Drone:      {drone['drone_id']} ETA {drone['eta_s']}s with AED payload\n"
        f"What3Words: {w3w or '(unset)'}"
    )

@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(), acknowledged_msg_id=msg.msg_id,
    ))
    text = msg.text() if hasattr(msg, "text") else \
           " ".join(c.text for c in msg.content if isinstance(c, TextContent))
    if not text:
        return

    facts = _ems_context_for(text)
    system_with_facts = SYSTEM_PROMPT + ("\n\n" + facts if facts else "")

    if asi_client is None:
        await ctx.send(sender, create_text_chat(
            facts or "EMS + Drone Dispatch standing by. Tell me a UCLA location."
        ))
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
        response = facts or f"Sorry, having trouble reaching ASI:One. {e}"
    await ctx.send(sender, create_text_chat(response))

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
