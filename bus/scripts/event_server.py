"""
FastAPI server for exposing CardiacLink bus events via Server-Sent Events.
Runs on port 8010 alongside the uAgents Bureau.
"""
import asyncio
import logging
import os
import time
from datetime import datetime
from typing import Dict, List

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

# Import event bus
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.event_bus import subscribe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CardiacLink Event Server")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track server start time and agent heartbeats
SERVER_START_TIME = time.time()
AGENT_HEARTBEATS: Dict[str, Dict] = {}

# Track active emergencies
ACTIVE_EMERGENCIES: List[str] = []


@app.get("/")
async def root():
    return {"service": "CardiacLink Event Server", "version": "0.2.0"}


@app.get("/health")
async def health():
    """Health check endpoint for the bus."""
    uptime_s = time.time() - SERVER_START_TIME

    agents = []
    for agent_name, info in AGENT_HEARTBEATS.items():
        agents.append({
            "name": agent_name,
            "address": info.get("address", "unknown"),
            "capability": info.get("capability", "unknown"),
            "last_heartbeat": info.get("last_heartbeat", None)
        })

    return {
        "status": "ok",
        "agents": agents,
        "uptime_s": uptime_s,
        "active_emergencies": len(ACTIVE_EMERGENCIES)
    }


@app.get("/emergencies")
async def list_emergencies():
    """List active emergencies."""
    return {"emergencies": ACTIVE_EMERGENCIES}


@app.get("/events/{emergency_id}")
async def events(emergency_id: str):
    """
    Server-Sent Events endpoint for a specific emergency.
    Streams all bus events for this emergency in real-time.
    """
    logger.info(f"SSE connection opened for emergency: {emergency_id}")

    # Add to active emergencies if not already present
    if emergency_id not in ACTIVE_EMERGENCIES:
        ACTIVE_EMERGENCIES.append(emergency_id)

    async def event_generator():
        """Generate SSE-formatted events."""
        try:
            async for event in subscribe(emergency_id):
                # Update heartbeat tracking
                agent = event.get("agent", "unknown")
                phase = event.get("phase")

                if phase == "heartbeat":
                    AGENT_HEARTBEATS[agent] = {
                        "address": event.get("data", {}).get("address", "unknown"),
                        "capability": event.get("capability", "unknown"),
                        "last_heartbeat": event.get("ts")
                    }

                # Format as SSE
                # SSE format: "data: <json>\n\n"
                import json
                yield f"data: {json.dumps(event)}\n\n"

        except asyncio.CancelledError:
            logger.info(f"SSE connection closed for emergency: {emergency_id}")
            # Remove from active emergencies
            if emergency_id in ACTIVE_EMERGENCIES:
                ACTIVE_EMERGENCIES.remove(emergency_id)
            raise
        except Exception as e:
            logger.error(f"SSE error for emergency {emergency_id}: {e}")
            # Remove from active emergencies
            if emergency_id in ACTIVE_EMERGENCIES:
                ACTIVE_EMERGENCIES.remove(emergency_id)
            raise

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


def main():
    """Run the event server."""
    port = int(os.getenv("BUS_EVENT_PORT", "8010"))
    logger.info(f"Starting CardiacLink Event Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
