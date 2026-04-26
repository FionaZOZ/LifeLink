"""Drone-delivered AED agent inspired by Sweden Lancet 2023 trial.

References:
- Schierbeck et al. 2023 (Lancet Digital Health) - drone-AED delivery beating ambulances by ~3min
"""
import logging
import secrets
from uagents import Agent, Context
from shared.protocols import DroneDispatchRequest, DroneDispatchResult
from shared.chat import enable_chat, extract_text
from shared.coverage import haversine_distance
from shared.discovery import register_capability_tags
from shared.event_bus import publish
from datasets.ucla_aeds import UCLA_CENTER

logger = logging.getLogger(__name__)

# Sweden Lancet 2023 trial: drones beat ambulances by ~3 min median
DRONE_ETA_SECONDS = 180  # 3 minutes
DRONE_ETA_JITTER = 30

# Drone service area: UCLA campus + 2km radius
DRONE_SERVICE_CENTER = UCLA_CENTER
DRONE_SERVICE_RADIUS_M = 2000


def create_drone_agent(seed: str) -> Agent:
    """Create the Drone specialist agent."""
    agent = Agent(name="drone", seed=seed, mailbox=True)

    register_capability_tags(agent, [
        "cardiaclink-drone",
        "cardiaclink",
        "drone",
        "uav",
        "aed",
        "emergency",
    ])

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Drone agent started: {agent.address}")
        ctx.logger.info(f"Service area: {DRONE_SERVICE_RADIUS_M}m radius around UCLA")

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="drone",
            capability="drone-delivery",
            phase="heartbeat",
            summary="Drone agent active",
            data={"address": str(agent.address)}
        )

    @agent.on_message(model=DroneDispatchRequest, replies={DroneDispatchResult})
    async def handle_dispatch(ctx: Context, sender: str, msg: DroneDispatchRequest):
        """Handle drone dispatch requests."""
        ctx.logger.info(f"Drone dispatch request: ({msg.target_lat}, {msg.target_lon})")

        distance = haversine_distance(
            msg.target_lat, msg.target_lon,
            DRONE_SERVICE_CENTER["lat"], DRONE_SERVICE_CENTER["lon"]
        )

        if distance <= DRONE_SERVICE_RADIUS_M:
            import random
            eta = DRONE_ETA_SECONDS + random.randint(-DRONE_ETA_JITTER, DRONE_ETA_JITTER)
            drone_id = f"DRONE-{secrets.token_hex(3).upper()}"

            ctx.logger.info(f"Drone {drone_id} dispatched, ETA {eta}s")

            await ctx.send(sender, DroneDispatchResult(
                drone_id=drone_id,
                eta_seconds=eta,
                aed_model="Philips HeartStart FRx",
                available=True,
            ))
        else:
            ctx.logger.info(f"Target {distance:.0f}m from service center -- outside range")

            await ctx.send(sender, DroneDispatchResult(
                drone_id="",
                eta_seconds=0,
                aed_model="",
                available=False,
            ))

    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"Drone agent chat request: {text}")

        if any(kw in text.lower() for kw in ["ucla", "royce", "court of sciences", "pauley"]):
            target_lat, target_lon = UCLA_CENTER["lat"], UCLA_CENTER["lon"]
            location_name = "UCLA campus"
        else:
            target_lat, target_lon = UCLA_CENTER["lat"], UCLA_CENTER["lon"]
            location_name = "specified location"

        distance = haversine_distance(
            target_lat, target_lon,
            DRONE_SERVICE_CENTER["lat"], DRONE_SERVICE_CENTER["lon"]
        )

        if distance <= DRONE_SERVICE_RADIUS_M:
            import random
            eta = DRONE_ETA_SECONDS + random.randint(-DRONE_ETA_JITTER, DRONE_ETA_JITTER)
            drone_id = f"DRONE-{secrets.token_hex(3).upper()}"

            response = f"**Drone-AED Dispatch** (Schierbeck et al., Lancet 2023)\n\n"
            response += f"Drone {drone_id} dispatched to {location_name}\n"
            response += f"ETA: {eta//60}:{eta%60:02d} (~3 min median per Sweden trial)\n"
            response += f"Payload: Philips HeartStart FRx AED\n"
            response += f"Status: Available (within {DRONE_SERVICE_RADIUS_M}m service area)\n\n"
            response += f"Reference: Drones beat ambulances by ~3 minutes median in the Schierbeck Lancet 2023 trial."
        else:
            response = f"Drone dispatch to {location_name} not available.\n"
            response += f"Target is {distance:.0f}m from service center (max range: {DRONE_SERVICE_RADIUS_M}m)."

        return response

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
