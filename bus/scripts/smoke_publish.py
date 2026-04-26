"""Smoke test for CardiacLink bus event system.

Fires a fake emergency through the Coordinator and subscribes to all events
from the bus event server to verify end-to-end event flow.

Usage:
    python bus/scripts/smoke_publish.py
"""
import asyncio
import os
import sys
import time
import httpx
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.event_bus import publish

EVENT_SERVER_URL = os.getenv("BUS_EVENT_URL", "http://localhost:8010")
EMERGENCY_ID = f"smoke-test-{int(time.time())}"


async def subscribe_to_events():
    """Subscribe to events from the event server."""
    print(f"[Subscriber] Connecting to {EVENT_SERVER_URL}/events/{EMERGENCY_ID}")
    events_received = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("GET", f"{EVENT_SERVER_URL}/events/{EMERGENCY_ID}") as response:
                if response.status_code != 200:
                    print(f"[Subscriber] ✗ Failed to connect: HTTP {response.status_code}")
                    return events_received

                print(f"[Subscriber] ✓ Connected to event stream")

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        import json
                        event_json = line[6:]  # Remove "data: " prefix
                        try:
                            event = json.loads(event_json)
                            events_received.append(event)
                            print(f"[Subscriber] Received: {event['agent']}/{event['phase']}: {event['summary']}")

                            # Stop after 5 events or 10 seconds
                            if len(events_received) >= 5:
                                print(f"[Subscriber] Received {len(events_received)} events, closing")
                                break
                        except json.JSONDecodeError:
                            continue

    except Exception as e:
        print(f"[Subscriber] Error: {e}")

    return events_received


async def publish_test_events():
    """Publish test events to the bus."""
    print(f"\n[Publisher] Publishing test events to emergency_id={EMERGENCY_ID}")
    await asyncio.sleep(1)  # Wait for subscriber to connect

    events_to_publish = [
        {
            "agent": "coordinator",
            "capability": "dispatch",
            "phase": "request",
            "summary": "Smoke test emergency initiated",
            "data": {"test": True, "timestamp": datetime.utcnow().isoformat()},
        },
        {
            "agent": "aed",
            "capability": "aed-location",
            "phase": "request",
            "summary": "AED query: UCLA campus",
            "data": {"location": "UCLA", "radius_m": 500},
        },
        {
            "agent": "aed",
            "capability": "aed-location",
            "phase": "result",
            "summary": "Found 3 AEDs",
            "data": {"count": 3},
        },
        {
            "agent": "ems",
            "capability": "ems-dispatch",
            "phase": "request",
            "summary": "EMS dispatch requested",
            "data": {"location": "34.0689,-118.4452"},
        },
        {
            "agent": "ems",
            "capability": "ems-dispatch",
            "phase": "result",
            "summary": "EMS Unit RA-61 dispatched — ETA 6 min",
            "data": {"unit_id": "RA-61", "eta_s": 360},
        },
    ]

    for i, event_data in enumerate(events_to_publish):
        print(f"[Publisher] Publishing event {i+1}/{len(events_to_publish)}: {event_data['agent']}/{event_data['phase']}")
        await publish(
            emergency_id=EMERGENCY_ID,
            agent=event_data["agent"],
            capability=event_data["capability"],
            phase=event_data["phase"],
            summary=event_data["summary"],
            data=event_data["data"],
        )
        await asyncio.sleep(0.5)

    print(f"[Publisher] ✓ Published {len(events_to_publish)} events")


async def verify_event_server():
    """Check if event server is running."""
    print(f"[Check] Verifying event server at {EVENT_SERVER_URL}")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{EVENT_SERVER_URL}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"[Check] ✓ Event server is running")
                print(f"[Check]   Status: {data.get('status')}")
                print(f"[Check]   Agents: {len(data.get('agents', []))}")
                print(f"[Check]   Uptime: {data.get('uptime_s', 0):.1f}s")
                return True
            else:
                print(f"[Check] ✗ Event server returned HTTP {response.status_code}")
                return False
    except Exception as e:
        print(f"[Check] ✗ Event server not reachable: {e}")
        print(f"[Check]   Make sure the bus is running: cd bus && python scripts/run_all.py")
        return False


async def main():
    """Run the smoke test."""
    print("=" * 80)
    print("CardiacLink Bus Event System - Smoke Test")
    print("=" * 80)

    # Verify event server is running
    if not await verify_event_server():
        print("\n✗ Smoke test failed: event server not available")
        return 1

    print("\nStarting test...")

    # Start subscriber and publisher concurrently
    subscriber_task = asyncio.create_task(subscribe_to_events())
    publisher_task = asyncio.create_task(publish_test_events())

    # Wait for both to complete (subscriber will timeout after a while)
    try:
        await asyncio.wait_for(publisher_task, timeout=15.0)
        events = await asyncio.wait_for(subscriber_task, timeout=15.0)
    except asyncio.TimeoutError:
        print("\n[Timeout] Test timed out after 15 seconds")
        events = []

    # Report results
    print("\n" + "=" * 80)
    if len(events) >= 3:
        print(f"✓ Smoke test PASSED: received {len(events)} events")
        print("\nEvents received:")
        for event in events:
            print(f"  - {event['agent']}/{event['phase']}: {event['summary']}")
        return 0
    else:
        print(f"✗ Smoke test FAILED: only received {len(events)} events (expected at least 3)")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
