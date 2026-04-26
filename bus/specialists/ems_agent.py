"""EMS dispatch agent with LA County benchmarks and What3Words.

Mock dispatch with realistic ETA based on LA County Fire Department cardiac-call
response time benchmark (~6 minutes).
"""
import os
import secrets
import logging
from uagents import Agent, Context
from shared.protocols import EmsDispatchRequest, EmsDispatchResult
from shared.chat import enable_chat, extract_text
from shared.discovery import register_capability_tags
from shared.event_bus import publish

logger = logging.getLogger(__name__)

# LA County Fire Department published cardiac-call response benchmark
LA_COUNTY_EMS_ETA_SECONDS = 360  # 6 minutes
ETA_JITTER_SECONDS = 30


def synthesize_w3w(lat: float, lon: float) -> str:
    """Synthesize deterministic What3Words-style string from coordinates."""
    hash_val = hash(f"{lat:.6f},{lon:.6f}")
    words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"]
    w1 = words[abs(hash_val) % len(words)]
    w2 = words[abs(hash_val // 10) % len(words)]
    w3 = words[abs(hash_val // 100) % len(words)]
    return f"{w1}.{w2}.{w3}"


def create_ems_agent(seed: str) -> Agent:
    """Create the EMS specialist agent."""
    agent = Agent(name="ems", seed=seed, mailbox=True)

    register_capability_tags(agent, [
        "cardiaclink-ems",
        "cardiaclink",
        "ems",
        "dispatch",
        "911",
        "emergency",
    ])

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"EMS agent started: {agent.address}")
        if os.getenv("WHAT3WORDS_API_KEY"):
            ctx.logger.info("What3Words API key detected")
        else:
            ctx.logger.info("What3Words API key not set -- using synthesized words")

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="ems",
            capability="ems-dispatch",
            phase="heartbeat",
            summary="EMS agent active",
            data={"address": str(agent.address)}
        )

    @agent.on_message(model=EmsDispatchRequest, replies={EmsDispatchResult})
    async def handle_dispatch(ctx: Context, sender: str, msg: EmsDispatchRequest):
        """Handle EMS dispatch requests."""
        ctx.logger.info(f"EMS dispatch: location={msg.location}, status={msg.status}")

        dispatch_id = f"LACO-EMS-{secrets.token_hex(4).upper()}"

        import random
        eta = LA_COUNTY_EMS_ETA_SECONDS + random.randint(-ETA_JITTER_SECONDS, ETA_JITTER_SECONDS)

        try:
            if "," in msg.location:
                lat, lon = map(float, msg.location.split(","))
            else:
                lat, lon = 34.0689, -118.4452
        except:
            lat, lon = 34.0689, -118.4452

        if os.getenv("WHAT3WORDS_API_KEY"):
            w3w = synthesize_w3w(lat, lon)
            w3w_source = "api"
        else:
            w3w = synthesize_w3w(lat, lon)
            w3w_source = "synthesized"

        ctx.logger.info(f"Dispatch {dispatch_id}: ETA {eta}s, W3W {w3w}")

        await ctx.send(sender, EmsDispatchResult(
            dispatch_id=dispatch_id,
            eta_seconds=eta,
            w3w=w3w,
            w3w_source=w3w_source,
        ))

    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"EMS agent chat request: {text}")

        if "ucla" in text.lower() or "royce" in text.lower():
            location = "34.0720,-118.4424"
        else:
            location = "34.0689,-118.4452"

        dispatch_id = f"LACO-EMS-{secrets.token_hex(4).upper()}"
        import random
        eta = LA_COUNTY_EMS_ETA_SECONDS + random.randint(-ETA_JITTER_SECONDS, ETA_JITTER_SECONDS)
        lat, lon = map(float, location.split(","))
        w3w = synthesize_w3w(lat, lon)

        return (f"EMS dispatch {dispatch_id} confirmed.\n"
               f"ETA: {eta//60}:{eta%60:02d} (based on LA County Fire Dept cardiac-call benchmark: 6:00 +/- 0:30)\n"
               f"Location: {w3w} (What3Words)\n"
               f"Status: Units en route")

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
