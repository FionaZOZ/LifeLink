"""
CardiacLink Drone Specialist — Agentverse hosted agent.
Simulates an AED-payload drone launch from the nearest staging pad.

Required secrets:
  - ASI1_API_KEY
"""
import math
import random
from uagents import Context, Model
from uagents.experimental.chat_agent import ChatAgent
from uagents.experimental.quota import QuotaProtocol

class DroneRequest(Model):
    emergency_id: str
    lat: float
    lon: float

class DroneResult(Model):
    emergency_id: str
    drone_id: str
    eta_s: int
    aed_payload: bool = True

# Staging pads on/near UCLA campus
PADS = [
    {"id": "DRONE-A1", "lat": 34.0721, "lon": -118.4435},
    {"id": "DRONE-B2", "lat": 34.0699, "lon": -118.4470},
    {"id": "DRONE-C3", "lat": 34.0758, "lon": -118.4395},
]

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

agent = ChatAgent()
proto = QuotaProtocol(
    storage_reference=agent.storage,
    name="AED Drone Dispatcher",
    version="0.1.0",
)

@proto.on_message(model=DroneRequest, replies=DroneResult)
async def handle(ctx: Context, sender: str, msg: DroneRequest):
    nearest = min(PADS, key=lambda p: haversine_m(msg.lat, msg.lon, p["lat"], p["lon"]))
    dist_m = haversine_m(msg.lat, msg.lon, nearest["lat"], nearest["lon"])
    # Drone cruise: 18 m/s, plus 12 s spin-up.
    eta_s = int(dist_m / 18.0 + 12)

    await ctx.send(sender, DroneResult(
        emergency_id=msg.emergency_id,
        drone_id=nearest["id"],
        eta_s=eta_s,
        aed_payload=True,
    ))

agent.include(proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
