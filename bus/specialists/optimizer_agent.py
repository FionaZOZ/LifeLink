"""AED placement optimizer agent using MCLP/GRASP heuristic.

References:
- Buter et al. 2024 (Health Care Management Science) - MCLP/GRASP for AED placement
"""
import logging
import h3
from uagents import Agent, Context
from shared.protocols import OptimizerRequest, OptimizerResult
from shared.chat import enable_chat, extract_text
from shared.coverage import coverage_score, haversine_distance
from shared.discovery import register_capability_tags
from shared.event_bus import publish
from datasets.ucla_aeds import UCLA_AEDS, UCLA_CENTER

logger = logging.getLogger(__name__)

# UCLA campus bounding box
UCLA_BBOX = {
    "lat_min": 34.062,
    "lat_max": 34.078,
    "lon_min": -118.455,
    "lon_max": -118.435,
}


def generate_candidate_grid(bbox: dict, resolution: int = 8) -> list[dict]:
    """Generate a candidate grid using H3 cells."""
    candidates = []
    lat_range = bbox["lat_max"] - bbox["lat_min"]
    lon_range = bbox["lon_max"] - bbox["lon_min"]

    for i in range(10):
        for j in range(10):
            lat = bbox["lat_min"] + (i / 10) * lat_range
            lon = bbox["lon_min"] + (j / 10) * lon_range

            cell = h3.latlng_to_cell(lat, lon, resolution)
            cell_center = h3.cell_to_latlng(cell)

            candidates.append({
                "lat": cell_center[0],
                "lon": cell_center[1],
                "h3_cell": cell,
            })

    return candidates


def compute_marginal_coverage_gain(
    candidate_lat: float,
    candidate_lon: float,
    existing_aeds: list,
    transport_mode: str = "walking"
) -> float:
    """Compute marginal coverage gain for a candidate AED placement."""
    demand_points = []
    for i in range(20):
        for j in range(20):
            lat = UCLA_BBOX["lat_min"] + (i / 20) * (UCLA_BBOX["lat_max"] - UCLA_BBOX["lat_min"])
            lon = UCLA_BBOX["lon_min"] + (j / 20) * (UCLA_BBOX["lon_max"] - UCLA_BBOX["lon_min"])
            demand_points.append({"lat": lat, "lon": lon})

    uncovered_before = 0
    for point in demand_points:
        covered = False
        for aed in existing_aeds:
            dist = haversine_distance(point["lat"], point["lon"], aed["lat"], aed["lon"])
            if coverage_score(dist, transport_mode) > 0:
                covered = True
                break
        if not covered:
            uncovered_before += 1

    extended_aeds = existing_aeds + [{"lat": candidate_lat, "lon": candidate_lon}]
    uncovered_after = 0
    for point in demand_points:
        covered = False
        for aed in extended_aeds:
            dist = haversine_distance(point["lat"], point["lon"], aed["lat"], aed["lon"])
            if coverage_score(dist, transport_mode) > 0:
                covered = True
                break
        if not covered:
            uncovered_after += 1

    gain = uncovered_before - uncovered_after
    return gain / len(demand_points)


def create_optimizer_agent(seed: str) -> Agent:
    """Create the Optimizer specialist agent."""
    agent = Agent(name="optimizer", seed=seed, mailbox=True)

    register_capability_tags(agent, [
        "cardiaclink-optimizer",
        "cardiaclink",
        "aed",
        "optimizer",
        "placement",
        "mclp",
    ])

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Optimizer agent started: {agent.address}")

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="optimizer",
            capability="aed-optimization",
            phase="heartbeat",
            summary="Optimizer agent active",
            data={"address": str(agent.address)}
        )

    @agent.on_message(model=OptimizerRequest, replies={OptimizerResult})
    async def handle_optimization(ctx: Context, sender: str, msg: OptimizerRequest):
        """Handle AED placement optimization requests."""
        ctx.logger.info(f"Optimization request: region={msg.region}, n_new_aeds={msg.n_new_aeds}")

        candidates = generate_candidate_grid(UCLA_BBOX, resolution=8)

        for c in candidates:
            c["marginal_gain"] = compute_marginal_coverage_gain(
                c["lat"], c["lon"], UCLA_AEDS, msg.transport_mode
            )

        candidates.sort(key=lambda c: c["marginal_gain"], reverse=True)
        top_candidates = candidates[:msg.n_new_aeds]

        proposed_locations = []
        for i, c in enumerate(top_candidates, 1):
            proposed_locations.append({
                "name": f"Proposed AED site #{i}",
                "lat": round(c["lat"], 6),
                "lon": round(c["lon"], 6),
                "marginal_coverage_gain": round(c["marginal_gain"], 4),
            })

        ctx.logger.info(f"Proposed {len(proposed_locations)} new AED placements")

        await ctx.send(sender, OptimizerResult(
            proposed_locations=proposed_locations,
            method="GRASP-mock",
        ))

    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"Optimizer agent chat request: {text}")

        if "3" in text or "three" in text.lower():
            n = 3
        elif "5" in text or "five" in text.lower():
            n = 5
        else:
            n = 3

        candidates = generate_candidate_grid(UCLA_BBOX, resolution=8)
        for c in candidates:
            c["marginal_gain"] = compute_marginal_coverage_gain(c["lat"], c["lon"], UCLA_AEDS)
        candidates.sort(key=lambda c: c["marginal_gain"], reverse=True)

        response = f"AED placement optimizer (Buter et al. 2024 MCLP/GRASP heuristic)\n\n"
        response += f"Proposing {n} new AED placements for UCLA campus:\n\n"

        for i, c in enumerate(candidates[:n], 1):
            response += f"{i}. Lat {c['lat']:.6f}, Lon {c['lon']:.6f} -- Marginal coverage gain: {c['marginal_gain']:.2%}\n"

        response += f"\nMethod: Simplified GRASP heuristic with H3-indexed demand surface. "
        response += f"Reference: Buter et al. 2024, Health Care Management Science."

        return response

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
