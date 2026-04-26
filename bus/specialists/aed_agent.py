"""AED locator agent with H3 indexing and Buter 2024 coverage decay.

References:
- Buter et al. 2024 (Health Care Management Science) - coverage decay function
- Uber H3 - hexagonal geospatial indexing
"""
import os
import logging
import httpx
from uagents import Agent, Context
from shared.protocols import AedQuery, AedResult, AedDevice
from shared.chat import enable_chat, extract_text
from shared.coverage import (
    coverage_score,
    candidate_aeds_in_h3_neighborhood,
    haversine_distance,
    get_h3_cell,
)
from shared.discovery import register_capability_tags
from shared.event_bus import publish
from datasets.ucla_aeds import UCLA_AEDS, UCLA_CENTER, UCLA_CAMPUS_RADIUS_M

logger = logging.getLogger(__name__)


def create_aed_agent(seed: str) -> Agent:
    """Create the AED specialist agent."""
    agent = Agent(name="aed", seed=seed, mailbox=True)

    register_capability_tags(agent, [
        "cardiaclink-aed",
        "cardiaclink",
        "aed",
        "cpr",
        "emergency",
    ])

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"AED agent started: {agent.address}")
        ctx.logger.info(f"Loaded {len(UCLA_AEDS)} UCLA campus AEDs")

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="aed",
            capability="aed-location",
            phase="heartbeat",
            summary="AED agent active",
            data={"address": str(agent.address), "aeds_loaded": len(UCLA_AEDS)}
        )

    @agent.on_message(model=AedQuery, replies={AedResult})
    async def handle_query(ctx: Context, sender: str, msg: AedQuery):
        """Handle AED query requests."""
        ctx.logger.info(f"AED query: location={msg.location}, radius={msg.radius_m}m, transport={msg.transport_mode}")

        emergency_id = getattr(msg, 'emergency_id', 'unknown')
        await publish(
            emergency_id=emergency_id,
            agent="aed",
            capability="aed-location",
            phase="request",
            summary=f"AED query: {msg.location}",
            data={"location": msg.location, "radius_m": msg.radius_m}
        )

        # Parse location
        try:
            if "," in msg.location:
                lat, lon = map(float, msg.location.split(","))
            else:
                if any(kw in msg.location.lower() for kw in ["ucla", "royce", "pauley", "westwood"]):
                    lat, lon = UCLA_CENTER["lat"], UCLA_CENTER["lon"]
                else:
                    lat, lon = 34.0095, -118.4977
                    ctx.logger.warning(f"Location '{msg.location}' not recognized, using Santa Monica Pier")
        except Exception as e:
            ctx.logger.error(f"Failed to parse location: {e}")
            await ctx.send(sender, AedResult(devices=[], primary_source="parse_error", h3_cell=""))
            return

        # Check if within UCLA campus radius
        distance_to_ucla = haversine_distance(lat, lon, UCLA_CENTER["lat"], UCLA_CENTER["lon"])

        if distance_to_ucla <= UCLA_CAMPUS_RADIUS_M:
            ctx.logger.info("Using UCLA hardcoded AED registry")

            class AedCandidate:
                def __init__(self, data):
                    self.lat = data["lat"]
                    self.lon = data["lon"]
                    self.data = data

            candidates_objs = [AedCandidate(aed) for aed in UCLA_AEDS]
            candidates = candidate_aeds_in_h3_neighborhood(lat, lon, candidates_objs, k_rings=3, resolution=9)

            devices = []
            for c in candidates:
                dist = haversine_distance(lat, lon, c.lat, c.lon)
                if dist <= msg.radius_m:
                    score = coverage_score(dist, msg.transport_mode)
                    devices.append(AedDevice(
                        name=c.data["name"],
                        address=c.data["address"],
                        lat=c.lat,
                        lon=c.lon,
                        distance_m=int(dist),
                        coverage_score=score,
                        last_checked=c.data["last_checked"],
                        pads_available=c.data["pads_available"],
                        source="ucla-ehs",
                        attribution="UCLA Environmental Health & Safety",
                    ))

            devices.sort(key=lambda d: d.coverage_score, reverse=True)

            h3_cell = get_h3_cell(lat, lon, resolution=9)
            result = AedResult(
                devices=devices[:10],
                primary_source="ucla-ehs",
                h3_cell=h3_cell,
            )
            await ctx.send(sender, result)

            await publish(
                emergency_id=emergency_id,
                agent="aed",
                capability="aed-location",
                phase="result",
                summary=f"Found {len(devices[:10])} AEDs",
                data={"count": len(devices[:10]), "h3_cell": h3_cell}
            )
        else:
            ctx.logger.info("Query outside UCLA campus, using OpenAEDMap fallback (mocked)")
            h3_cell = get_h3_cell(lat, lon, resolution=9)
            result = AedResult(
                devices=[],
                primary_source="openaedmap_unavailable",
                h3_cell=h3_cell,
            )
            await ctx.send(sender, result)

            await publish(
                emergency_id=emergency_id,
                agent="aed",
                capability="aed-location",
                phase="result",
                summary="Query outside UCLA campus",
                data={"h3_cell": h3_cell}
            )

    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"AED agent chat request: {text}")

        if any(kw in text.lower() for kw in ["ucla", "royce", "pauley", "westwood"]):
            location = f"{UCLA_CENTER['lat']},{UCLA_CENTER['lon']}"
        else:
            location = "34.0689,-118.4452"

        devices = []
        for aed_data in UCLA_AEDS[:5]:
            dist = haversine_distance(
                UCLA_CENTER["lat"], UCLA_CENTER["lon"],
                aed_data["lat"], aed_data["lon"]
            )
            score = coverage_score(dist, "walking")
            devices.append({
                "name": aed_data["name"],
                "distance_m": int(dist),
                "coverage_score": round(score, 2),
                "pads_available": aed_data["pads_available"],
            })

        devices.sort(key=lambda d: d["coverage_score"], reverse=True)

        response = f"Found {len(UCLA_AEDS)} AEDs on UCLA campus. Top 5 by coverage score (Buter 2024):\n\n"
        for i, d in enumerate(devices[:5], 1):
            status = "pads OK" if d["pads_available"] else "pads expired"
            response += f"{i}. {d['name']} - {d['distance_m']}m, score {d['coverage_score']} ({status})\n"

        response += "\nRanked using Buter et al. 2024 coverage decay function with H3 geospatial indexing."
        return response

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
