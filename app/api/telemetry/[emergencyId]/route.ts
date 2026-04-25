// SSE endpoint stub — streams telemetry events to the frontend in live mode.
// In production, this would pipe events from the Fetch.ai agent bus via
// Redis pub/sub or a direct WebSocket bridge. For now it replays a minimal
// demo sequence so the live-mode UI path can be verified end-to-end.
//
// Connect from the client via:
//   const es = new EventSource('/api/telemetry/<emergencyId>');
//
// The useEmergencyTelemetry hook already handles this when mode === 'live'.

import { NextRequest } from 'next/server';

// ── Demo event sequence ────────────────────────────────────────────────────

const DEMO_EVENTS = [
  { type: 'dispatch', agent: 'coordinator', message: '911 call received — dispatching agents', phase: 'call_received' },
  { type: 'agents_dispatching', agent: 'coordinator', message: 'Parallel dispatch initiated — 8 agents activated', phase: 'agents_dispatching' },
  { type: 'aed_located', agent: 'aed_agent', message: 'Nearest AED: Ackerman Union (120m)', phase: 'aeds_located' },
  { type: 'ems_dispatched', agent: 'ems_agent', message: 'EMS Unit RA-61 dispatched — ETA 5 min', phase: 'ems_en_route' },
  { type: 'drone_launched', agent: 'drone_agent', message: 'Drone launched from Station 71 — ETA 90s', phase: 'drone_launched' },
  { type: 'triage_complete', agent: 'triage_agent', message: 'Triage complete — STEMI protocol', phase: 'triage_complete' },
  { type: 'handoff_ready', agent: 'hospital_agent', message: 'UCLA Ronald Reagan Medical Center ready — ECMO standby', phase: 'handoff_ready' },
];

const EVENT_INTERVAL_MS = 2500; // Time between demo events

// ── Route handler ──────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ emergencyId: string }> },
) {
  const { emergencyId } = await params;

  const encoder = new TextEncoder();
  let eventIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial comment so the client knows the connection is alive
      controller.enqueue(encoder.encode(`: connected to telemetry stream for emergency ${emergencyId}\n\n`));

      intervalId = setInterval(() => {
        if (eventIndex >= DEMO_EVENTS.length) {
          // All demo events sent — send a final "resolved" event and close
          const resolved = {
            type: 'resolved',
            agent: 'coordinator',
            message: 'Emergency resolved — all agents stood down',
            phase: 'resolved',
            timestamp: Date.now(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(resolved)}\n\n`));
          if (intervalId) clearInterval(intervalId);
          controller.close();
          return;
        }

        const event = {
          ...DEMO_EVENTS[eventIndex],
          timestamp: Date.now(),
          emergencyId,
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        eventIndex++;
      }, EVENT_INTERVAL_MS);
    },

    cancel() {
      // Client disconnected
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering if behind proxy
    },
  });
}

// ── Future integration point ───────────────────────────────────────────────
//
// To wire real Fetch.ai bus events:
//
// 1. The FastAPI backend (backend/main.py) should expose a Redis pub/sub
//    channel or WebSocket endpoint that forwards agent_bus messages.
//
// 2. Replace the setInterval demo loop above with:
//
//    const redis = createClient({ url: process.env.REDIS_URL });
//    await redis.subscribe(`emergency:${emergencyId}`, (message) => {
//      controller.enqueue(encoder.encode(`data: ${message}\n\n`));
//    });
//
// 3. In the cancel() handler, unsubscribe from Redis.
//
// No other frontend changes are needed — the useEmergencyTelemetry hook
// already parses incoming SSE data and updates ScenarioState accordingly.
