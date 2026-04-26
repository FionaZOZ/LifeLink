"""
CardiacLink Optimizer Specialist — Agentverse hosted agent.
Computes the fastest helper-to-AED route. Pure haversine + walking-speed model
for the demo; replace with Mapbox Directions API once budget allows.

Required secrets:
  - ASI1_API_KEY
"""
import math
from uagents import Context, Model
from uagents.experimental.chat_agent import ChatAgent
from uagents.experimental.quota import QuotaProtocol

class OptimizeRequest(Model):
    emergency_id: str
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float

class OptimizeResult(Model):
    emergency_id: str
    distance_m: int
    eta_s: int
    instruction: str

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def cardinal(lat1, lon1, lat2, lon2) -> str:
    """Rough cardinal direction from origin toward dest."""
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    if abs(dlat) > abs(dlon):
        return "north" if dlat > 0 else "south"
    return "east" if dlon > 0 else "west"

agent = ChatAgent()
proto = QuotaProtocol(
    storage_reference=agent.storage,
    name="Emergency Response Route Optimizer",
    version="0.1.0",
)

@proto.on_message(model=OptimizeRequest, replies=OptimizeResult)
async def handle(ctx: Context, sender: str, msg: OptimizeRequest):
    dist_m = haversine_m(msg.origin_lat, msg.origin_lon, msg.dest_lat, msg.dest_lon)
    # 1.4 m/s walking pace + a 1.4× detour factor for grid streets
    eta_s = int(dist_m * 1.4 / 1.4)
    direction = cardinal(msg.origin_lat, msg.origin_lon, msg.dest_lat, msg.dest_lon)
    instruction = f"Head {direction} {int(dist_m)}m to the AED."

    await ctx.send(sender, OptimizeResult(
        emergency_id=msg.emergency_id,
        distance_m=int(dist_m),
        eta_s=eta_s,
        instruction=instruction,
    ))

agent.include(proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
