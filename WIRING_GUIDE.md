# CardiacLink Bus Wiring Implementation Guide

This guide documents what has been completed and what remains to wire the Fetch.ai bus to the frontend and build the dev dashboard.

## ✅ Completed

1. **Event Bus Infrastructure** (`bus/shared/event_bus.py`)
   - Created `EventBus` singleton with publish/subscribe methods
   - Supports both in-memory queues (local dev) and Redis pub/sub (production)
   - Global `publish()` and `subscribe()` helper functions

2. **Event Server** (`bus/scripts/event_server.py`)
   - FastAPI server on port 8010
   - SSE endpoint: `GET /events/{emergency_id}`
   - Health endpoint: `GET /health` (returns agent heartbeats)
   - Emergencies list: `GET /emergencies`

3. **Run Script Updated** (`bus/scripts/run_all.py`)
   - Added multiprocessing to spawn event server alongside Bureau
   - Event server runs as daemon process on port 8010

## 🔨 Remaining Tasks

### Task 1: Add Event Publishing to All 8 Agents

Each agent needs to publish lifecycle events. Add this pattern to each agent file:

#### Files to Update:
1. `bus/coordinator/agent.py`
2. `bus/specialists/voice_agent.py`
3. `bus/specialists/aed_agent.py`
4. `bus/specialists/ems_agent.py`
5. `bus/specialists/handoff_agent.py`
6. `bus/specialists/optimizer_agent.py`
7. `bus/specialists/triage_agent.py`
8. `bus/specialists/drone_agent.py`

#### Pattern to Add:

At the top of each file, import event bus:
```python
from shared.event_bus import publish
```

In message handlers, add event publishing:

**On request received:**
```python
@agent.on_message(model=SomeQuery, replies={SomeResult})
async def handle_query(ctx: Context, sender: str, msg: SomeQuery):
    # Extract emergency_id from message or context
    emergency_id = msg.emergency_id or "unknown"

    # Publish request event
    await publish(
        emergency_id=emergency_id,
        agent="agent_name",  # e.g., "aed", "voice", "ems"
        capability="capability_name",  # e.g., "aed-location", "cpr-voice"
        phase="request",
        summary=f"Received query: {msg}",
        data={"query": msg.dict()}
    )

    # ... existing handler code ...

    # Publish result event
    await publish(
        emergency_id=emergency_id,
        agent="agent_name",
        capability="capability_name",
        phase="result",
        summary=f"Returned {len(devices)} devices",
        data={"result": result.dict()}
    )
```

**On error:**
```python
except Exception as e:
    await publish(
        emergency_id=emergency_id,
        agent="agent_name",
        capability="capability_name",
        phase="error",
        summary=f"Error: {str(e)}",
        data={"error": str(e)}
    )
```

**Heartbeat (add to each agent's startup):**
```python
@agent.on_interval(period=5.0)
async def heartbeat(ctx: Context):
    await publish(
        emergency_id="system",
        agent="agent_name",
        capability="heartbeat",
        phase="heartbeat",
        summary="Agent alive",
        data={"address": str(agent.address)}
    )
```

### Task 2: Update Next.js Telemetry Route

**File:** `app/api/telemetry/[emergencyId]/route.ts`

Replace the current implementation to proxy from the bus event server:

```typescript
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { emergencyId: string } }
) {
  const emergencyId = params.emergencyId;
  const busEventUrl = process.env.BUS_EVENT_URL || 'http://localhost:8010';

  try {
    // Fetch from bus event server
    const response = await fetch(`${busEventUrl}/events/${emergencyId}`, {
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Bus event server returned ${response.status}`);
    }

    // Return the SSE stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Telemetry] Error connecting to bus:', error);

    // Fallback to demo events if bus is down
    return new Response(
      new ReadableStream({
        async start(controller) {
          // Send demo event
          const demoEvent = {
            ts: new Date().toISOString(),
            emergency_id: emergencyId,
            agent: 'coordinator',
            capability: 'demo',
            phase: 'result',
            summary: 'Bus offline - showing demo data',
            data: {}
          };
          controller.enqueue(`data: ${JSON.stringify(demoEvent)}\n\n`);
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
```

### Task 3: Surface Bus Events in UI

**File:** `components/lifelink/Screen.tsx` or the active emergency screen

Find the emergency screen (check recent git commits to `app/sos/` routes).

Add bus telemetry hook:

```typescript
import { useBusTelemetry } from '@/lib/useBusTelemetry';

// In the component:
const emergencyId = "current_emergency_id"; // Get from context/props
const { events, agents } = useBusTelemetry(emergencyId);

// Render agent activity strip
<div className="agent-activity">
  {Object.entries(agents).map(([agentName, agentData]) => (
    <AgentCard
      key={agentName}
      name={agentName}
      capability={agentData.capability}
      phase={agentData.phase}
      summary={agentData.summary}
      timestamp={agentData.timestamp}
    />
  ))}
</div>
```

### Task 4: Add Health Endpoint to Backend

**File:** `backend/main.py`

Add this endpoint:

```python
@app.get("/health")
def health():
    """Health check for FastAPI backend."""
    uptime_s = time.time() - SERVER_START_TIME  # Add SERVER_START_TIME at module level

    return {
        "status": "ok",
        "version": "0.2.0",
        "twilio_configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN),
        "textbelt_configured": bool(TEXTBELT_API_KEY),
        "uptime_s": uptime_s,
        "last_emergency": emergency_state.get("started_at")
    }
```

Add at top of file:
```python
import time
SERVER_START_TIME = time.time()
```

### Task 5: Create Next.js Health Aggregator

**File:** `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const results = {
    next: { status: 'ok', version: '0.2.0' },
    backend: null as any,
    bus: null as any,
  };

  // Check backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_CARDIACLINK_API_URL || 'http://localhost:8000';
    const backendRes = await fetch(`${backendUrl}/health`, {
      signal: AbortSignal.timeout(1500)
    });
    results.backend = await backendRes.json();
  } catch (error) {
    results.backend = { status: 'error', error: String(error) };
  }

  // Check bus
  try {
    const busUrl = process.env.BUS_EVENT_URL || 'http://localhost:8010';
    const busRes = await fetch(`${busUrl}/health`, {
      signal: AbortSignal.timeout(1500)
    });
    results.bus = await busRes.json();
  } catch (error) {
    results.bus = { status: 'error', error: String(error) };
  }

  return NextResponse.json(results);
}
```

### Task 6: Create Dev Dashboard

**File:** `app/dev/dashboard/page.tsx`

Full dashboard page with:
- Status pills for Next.js, FastAPI, Bus (green/yellow/red)
- 8 agent cards showing capability, address, last heartbeat
- Recent events log (last 50 events)
- Emergency switcher dropdown
- Manual trigger buttons
- Auto-refresh toggle

Use components from `components/ui/` (card, badge, button).

Add dev key check:
```typescript
if (process.env.NODE_ENV === 'production' && searchParams.devKey !== process.env.DEV_DASHBOARD_KEY) {
  return <div>404 - Not Found</div>;
}
```

### Task 7: Add Dev Link to Layout

**File:** `app/layout.tsx`

```typescript
{process.env.NODE_ENV !== 'production' && (
  <a href="/dev/dashboard" className="dev-link">
    🩺 dev
  </a>
)}
```

### Task 8: Create Smoke Test

**File:** `bus/scripts/smoke_publish.py`

```python
"""Smoke test for event bus - fires a fake emergency and prints all events."""
import asyncio
import sys
import os
import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

async def main():
    emergency_id = "smoke-test-" + str(int(asyncio.get_event_loop().time()))

    print(f"Smoke test emergency: {emergency_id}")
    print("Connecting to event stream...")

    event_url = os.getenv("BUS_EVENT_URL", "http://localhost:8010")

    async with httpx.AsyncClient() as client:
        async with client.stream('GET', f'{event_url}/events/{emergency_id}') as response:
            print(f"Connected to {event_url}/events/{emergency_id}")
            print("Listening for events (Ctrl+C to stop)...\n")

            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    event_json = line[6:]  # Remove "data: " prefix
                    print(event_json)

if __name__ == "__main__":
    asyncio.run(main())
```

### Task 9: Update Environment Examples

**File:** `.env.local.example`

Add:
```bash
# Bus event server
BUS_EVENT_URL=http://localhost:8010

# Dev dashboard (production only)
DEV_DASHBOARD_KEY=
```

**File:** `bus/.env.example`

Add:
```bash
# Redis pub/sub (optional - leave empty for in-memory queues)
BUS_REDIS_URL=

# Event server port
BUS_EVENT_PORT=8010
```

### Task 10: Run Linting

```bash
cd ~/Downloads/CardicLinkNew-master
npm run lint
```

Fix any TypeScript errors introduced.

## Final Runbook

Once everything is implemented:

### Terminal 1: Backend
```bash
cd ~/Downloads/CardicLinkNew-master/backend
python main.py
```
Should see: `Uvicorn running on http://0.0.0.0:8000`

### Terminal 2: Bus + Event Server
```bash
cd ~/Downloads/CardicLinkNew-master/bus
python scripts/run_all.py
```
Should see:
- 8 agent addresses
- `Event server started at http://localhost:8010`

### Terminal 3: Frontend
```bash
cd ~/Downloads/CardicLinkNew-master
npm run dev
```
Should see: `Ready on http://localhost:3000`

### Verify
1. Open http://localhost:3000/dev/dashboard
2. All 3 status pills should be green
3. All 8 agents should show recent heartbeats
4. Start an emergency from the main UI
5. Watch events flow in real-time on dashboard

## Key Files Created/Modified

### Created:
- `bus/shared/event_bus.py` ✅
- `bus/scripts/event_server.py` ✅
- `bus/scripts/smoke_publish.py` ⏳
- `app/api/health/route.ts` ⏳
- `app/dev/dashboard/page.tsx` ⏳

### Modified:
- `bus/scripts/run_all.py` ✅ (partial - multiprocessing added)
- `bus/coordinator/agent.py` ⏳ (needs event publishing)
- `bus/specialists/*.py` (all 7) ⏳ (needs event publishing)
- `app/api/telemetry/[emergencyId]/route.ts` ⏳ (needs proxy logic)
- `components/lifelink/Screen.tsx` ⏳ (needs useBusTelemetry integration)
- `backend/main.py` ⏳ (needs /health endpoint)
- `app/layout.tsx` ⏳ (needs dev link)
- `.env.local.example` ⏳
- `bus/.env.example` ⏳

## Emergency ID Propagation

**Important:** For events to work, every agent message handler needs access to `emergency_id`.

You may need to:
1. Add `emergency_id: str` field to protocol models in `bus/shared/protocols.py`
2. Pass `emergency_id` through the coordinator's tool calls to specialists
3. Extract it from context storage if the coordinator sets it

Example in coordinator:
```python
# When starting emergency
ctx.storage.set("current_emergency_id", emergency_id)

# When calling specialist
await ctx.send(specialist_address, AedQuery(
    emergency_id=emergency_id,  # Add this field
    location=location,
    radius_m=500
))
```

Good luck! Switch to Opus 4.7 to finish the implementation.
