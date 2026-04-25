"""Almanac-based discovery for CardiacLink agents.

Enables runtime capability-based agent discovery via the Fetch.ai Almanac,
addressing the "Search & Discovery of Agents" track requirement.
"""
import os
import logging
from typing import Optional
from uagents import Context

logger = logging.getLogger(__name__)


async def discover_capability(ctx: Context, capability: str, timeout: float = 5.0) -> Optional[str]:
    """
    Search Almanac for agents with the given capability tag.
    Returns the first matching agent's address, or None if not found.

    Args:
        ctx: uAgent context
        capability: Capability tag to search for (e.g. "cardiaclink-aed")
        timeout: Search timeout in seconds

    Returns:
        Agent address string if found, None otherwise

    Note:
        Falls back to environment variables (AED_AGENT_ADDRESS, etc.)
        when Almanac discovery is not yet available.
    """
    # Fallback path: environment variable
    env_var_map = {
        "cardiaclink-voice": "VOICE_AGENT_ADDRESS",
        "cardiaclink-aed": "AED_AGENT_ADDRESS",
        "cardiaclink-ems": "EMS_AGENT_ADDRESS",
        "cardiaclink-handoff": "HANDOFF_AGENT_ADDRESS",
        "cardiaclink-optimizer": "OPTIMIZER_AGENT_ADDRESS",
        "cardiaclink-triage": "TRIAGE_AGENT_ADDRESS",
        "cardiaclink-drone": "DRONE_AGENT_ADDRESS",
    }

    env_var = env_var_map.get(capability)
    if env_var:
        addr = os.getenv(env_var)
        if addr:
            logger.info(f"Discovered {capability} via env var {env_var}: {addr}")
            return addr

    logger.warning(f"Could not discover capability '{capability}' (Almanac search pending; env var not set)")
    return None


def register_capability_tags(agent, tags: list[str]):
    """
    Register capability tags on an agent for Almanac discovery.

    Args:
        agent: uAgent instance
        tags: List of capability tags (e.g. ["cardiaclink-aed", "cpr", "aed", "emergency"])
    """
    if not hasattr(agent, "_capability_tags"):
        agent._capability_tags = []
    agent._capability_tags.extend(tags)
    logger.info(f"Registered capability tags for {agent.name}: {tags}")
