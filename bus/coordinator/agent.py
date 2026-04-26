"""Coordinator agent - Entry point for CardiacLink multi-agent orchestration.

Implements Almanac-based discovery, Chat Protocol, and parallel specialist dispatch.
"""
import os
import logging
import asyncio
from uagents import Agent, Context
from shared.chat import enable_chat, extract_text
from shared.discovery import discover_capability, register_capability_tags
from shared.event_bus import publish
from coordinator.reasoning import run_reasoning_loop

logger = logging.getLogger(__name__)


def create_coordinator_agent(seed: str) -> Agent:
    """Create the Coordinator agent."""
    agent = Agent(name="coordinator", seed=seed, mailbox=True)

    # Routing table: capability name -> agent address
    routing_table = {}

    register_capability_tags(agent, [
        "cardiaclink-coordinator",
        "cardiaclink",
        "dispatch",
        "coordinator",
        "cpr",
        "emergency",
    ])

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Coordinator agent started: {agent.address}")
        ctx.logger.info("Starting Almanac discovery for specialists...")

        # Discover all seven specialists
        capabilities = [
            "cardiaclink-voice",
            "cardiaclink-aed",
            "cardiaclink-ems",
            "cardiaclink-handoff",
            "cardiaclink-optimizer",
            "cardiaclink-triage",
            "cardiaclink-drone",
        ]

        for cap in capabilities:
            addr = await discover_capability(ctx, cap, timeout=5.0)
            if addr:
                short_name = cap.replace("cardiaclink-", "")
                routing_table[short_name] = addr
                ctx.logger.info(f"Discovered {cap}: {addr}")
            else:
                ctx.logger.warning(f"Could not discover {cap}")

        ctx.logger.info(f"Discovery complete. Routing table has {len(routing_table)} entries.")

        # Store routing table in agent storage for access in handlers
        ctx.storage.set("routing_table", routing_table)

        # Schedule re-discovery every 60 seconds
        agent.on_interval(period=60.0)(rediscover)

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def rediscover(ctx: Context):
        """Periodically re-discover specialists in case they come online late."""
        ctx.logger.info("Re-discovering specialists...")

        capabilities = [
            "cardiaclink-voice",
            "cardiaclink-aed",
            "cardiaclink-ems",
            "cardiaclink-handoff",
            "cardiaclink-optimizer",
            "cardiaclink-triage",
            "cardiaclink-drone",
        ]

        routing_table = ctx.storage.get("routing_table") or {}

        for cap in capabilities:
            short_name = cap.replace("cardiaclink-", "")
            if short_name not in routing_table:
                addr = await discover_capability(ctx, cap, timeout=5.0)
                if addr:
                    routing_table[short_name] = addr
                    ctx.logger.info(f"Newly discovered {cap}: {addr}")

        ctx.storage.set("routing_table", routing_table)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        # Publish to a generic emergency_id for monitoring
        await publish(
            emergency_id="heartbeat",
            agent="coordinator",
            capability="dispatch",
            phase="heartbeat",
            summary="Coordinator active",
            data={"address": str(agent.address)}
        )

    # Chat Protocol handler for ASI:One
    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"Coordinator chat request: {text[:100]}")

        # Extract emergency_id if present (default to "unknown")
        emergency_id = "unknown"
        # Try to extract emergency_id from the message if it's passed
        # For now, we'll use a simple heuristic

        # Publish request event
        await publish(
            emergency_id=emergency_id,
            agent="coordinator",
            capability="dispatch",
            phase="request",
            summary=f"Received chat request: {text[:50]}",
            data={"request_text": text[:200]}
        )

        # Check for Anthropic API key
        if not os.getenv("ANTHROPIC_API_KEY"):
            response = ("Coordinator agent running in stub mode (ANTHROPIC_API_KEY not set). "
                       "I orchestrate 7 specialists: Voice, AED, EMS, Handoff, Optimizer, Triage, Drone. "
                       "In full mode, I use Claude with tool-use to coordinate parallel emergency response.")
            await publish(
                emergency_id=emergency_id,
                agent="coordinator",
                capability="dispatch",
                phase="result",
                summary="Stub mode response",
                data={"response": response}
            )
            return response

        # Run the reasoning loop
        routing_table = ctx.storage.get("routing_table") or {}

        try:
            response = await run_reasoning_loop(ctx, text, routing_table)
            await publish(
                emergency_id=emergency_id,
                agent="coordinator",
                capability="dispatch",
                phase="result",
                summary="Reasoning loop completed",
                data={"response": response[:200]}
            )
            return response
        except Exception as e:
            ctx.logger.error(f"Reasoning loop failed: {e}")
            await publish(
                emergency_id=emergency_id,
                agent="coordinator",
                capability="dispatch",
                phase="error",
                summary=f"Reasoning loop failed: {str(e)}",
                data={"error": str(e)}
            )
            return f"Coordinator error: {str(e)}"

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
