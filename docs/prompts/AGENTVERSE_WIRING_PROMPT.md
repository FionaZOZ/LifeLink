# Claude Code Prompt — Wire CardiacLink frontend to 8 Agentverse hosted agents

Run this from `/Users/emilysun/Downloads/CardicLinkNew-master`.

---

## What's already done (don't redo)

- **AED specialist** is deployed on Agentverse at:
  `agent1qf4pes4jhlnrrrfcqsz9r4fxhf3dnsq4vnkq8kpzf7zm6x8pmthq2pmamprakjd93qg0`
  Note: it's currently the v0 "Square" example. `agentverse-deploy/aed_agent.py` in this repo is the production replacement; paste it over the existing code.
- **7 more Python files** are ready to paste into Agentverse, in `agentverse-deploy/`:
  `coordinator.py`, `ems_agent.py`, `voice_agent.py`, `triage_agent.py`,
  `handoff_agent.py`, `optimizer_agent.py`, `drone_agent.py`.
- `agentverse-deploy/README.md` documents secrets and the address registry.

The architecture: **the bus is Agentverse, not local Bureau.** No `python bus/scripts/run_all.py` in the demo flow. Events flow through MongoDB Atlas (the same cluster being restored in `RECOVER_AND_MAPBOX_PROMPT.md` Part 1).

```
Browser ─▶ /api/emergency/start (Next.js)
        ─▶ POST agentverse.ai/.../{coordinator_address}     [HTTPS]
                                ─▶ Coordinator (Agentverse)
                                    ├─ ctx.send(AED, …)
                                    ├─ ctx.send(EMS, …)
                                    ├─ … 7 specialists
                                    └─ writes events to MongoDB Atlas
Browser ◀─ SSE /api/telemetry/{id} (Next.js)  ◀─ MongoDB change stream / poll
```

---

## Phase 0 — Prerequisites

Before any code changes, confirm:

1. The user has deployed all 8 hosted agents on Agentverse and pasted their addresses into `agentverse-deploy/README.md` under "Addresses". If any are blank, **stop and ask** — the wiring depends on real addresses.
2. MongoDB Atlas is restored (see `RECOVER_AND_MAPBOX_PROMPT.md` Part 1). `lib/mongo/client.ts` exists, `MONGODB_URI` is in `.env.local`.
3. `npm run test:mongo` returns `Mongo ping: { ok: 1 }`.

If any of those are missing, fix them first. Run `git show 0ca0794:lib/mongo/client.ts > lib/mongo/client.ts` etc., as documented in the recovery prompt.

---

## Phase 1 — Frontend client for the Coordinator

### 1.1 Create `lib/agentverse.ts`

```ts
// lib/agentverse.ts
// Thin client for talking to the cardiaclink-coordinator hosted agent on Agentverse.

const AGENTVERSE_BASE = process.env.AGENTVERSE_BASE_URL ?? 'https://agentverse.ai';
const COORDINATOR_ADDRESS = process.env.COORDINATOR_AGENT_ADDRESS;

export interface EmergencyRequest {
  emergency_id: string;
  scenario_id: 'royce-hall' | 'pauley-pavilion' | 'bruin-walk';
  lat: number;
  lon: number;
  address: string;
}

export interface EmergencyAck {
  emergency_id: string;
  accepted: boolean;
  coordinator_address: string;
}

/**
 * POST an EmergencyRequest to the Coordinator's REST endpoint on Agentverse.
 * Verify the exact URL pattern in Agentverse's "Connect" tab — Agentverse may
 * have updated the path. Common patterns:
 *   - https://agentverse.ai/v1/submit/{address}
 *   - https://agentverse.ai/v1/agent/{address}/messages
 * If neither matches, look at the agent's own "REST endpoints" panel.
 */
export async function dispatchEmergency(req: EmergencyRequest): Promise<EmergencyAck> {
  if (!COORDINATOR_ADDRESS) {
    throw new Error(
      'COORDINATOR_AGENT_ADDRESS is not set. Deploy coordinator.py to Agentverse, ' +
      'copy its agent1q... address into .env.local.',
    );
  }

  const url = `${AGENTVERSE_BASE}/v1/submit/${COORDINATOR_ADDRESS}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Agentverse expects the typed message wrapper. The exact key name
      // ("payload" vs "message" vs flat) depends on the Agentverse version —
      // verify on the Connect tab. Below is the most common shape.
      payload: req,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agentverse dispatch failed: ${response.status} ${text}`);
  }
  return response.json();
}
```

### 1.2 Replace the stub `lib/agents/coordinator.ts`

The current file has 4 fake functions that return `{status: 'migrated_to_bus'}` without doing anything. Move it to `lib/agents/_archive/coordinator.ts` (do not delete — git history check), and create a new `lib/agents/coordinator.ts`:

```ts
// lib/agents/coordinator.ts
// Forwards an emergency to the Agentverse Coordinator. The actual orchestration
// (Claude reasoning, specialist fan-out, FHIR bundle) happens on Agentverse.
import { dispatchEmergency, type EmergencyRequest } from '@/lib/agentverse';
import { SCENARIOS } from '@/lib/scenarios';

export async function runCoordinator(
  emergencyId: string,
  scenarioId: 'royce-hall' | 'pauley-pavilion' | 'bruin-walk',
  onText: (text: string) => void,
): Promise<void> {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  onText(`Dispatching to Agentverse Coordinator…\n`);

  const ack = await dispatchEmergency({
    emergency_id: emergencyId,
    scenario_id: scenarioId,
    lat: scenario.patient.lat,
    lon: scenario.patient.lon,
    address: scenario.patient.address,
  });

  if (!ack.accepted) throw new Error('Coordinator did not accept the emergency.');
  onText(`Coordinator ${ack.coordinator_address} accepted. Streaming events…\n`);
  // Events arrive via /api/telemetry/{id} SSE, not via this callback.
}
```

### 1.3 Update `app/api/emergency/start/route.ts`

The existing version calls `runCoordinator(emergency_id, callback)` and expects Claude reasoning to stream back through the callback. Now `runCoordinator` only kicks off the Agentverse run; reasoning streams come through `/api/telemetry/{id}`. Update the route to:

1. Read `emergency_id` and `scenario_id` from the body.
2. Call `runCoordinator(emergency_id, scenario_id, onText)`.
3. Stream the few status lines via SSE for backward compat with `useEmergencyTelemetry`'s `mode: 'live'` consumer.
4. Return after the ack — long-lived events go through the telemetry endpoint.

---

## Phase 2 — Telemetry from MongoDB

### 2.1 Rewrite `app/api/telemetry/[emergencyId]/route.ts`

After Emily's 106-line version is restored from `7cc65f5` (see `RECOVER_AND_MAPBOX_PROMPT.md` Part 2), this file becomes the SSE bridge between MongoDB and the browser.

Replace the demo-timeline body with this strategy:

1. On request, open the SSE stream as before.
2. Open a MongoDB change stream on the `agent_events` collection filtered by `emergency_id` (`db.collection.watch([{$match: {'fullDocument.emergency_id': emergencyId}}])`).
3. For each change, format the doc as an SSE message and `controller.enqueue`.
4. If the change stream isn't supported (MongoDB Atlas free tier may not have it), fall back to polling:
   `setInterval(() => collection.find({emergency_id, ts: {$gt: cursor}}).toArray(), 250)`.
5. Keep Emily's `?demo=1` mode that emits the scripted timeline — useful when MongoDB is unavailable.

Implementation outline:

```ts
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongo/client';

export async function GET(req: NextRequest, { params }: { params: { emergencyId: string } }) {
  const url = new URL(req.url);
  const demo = url.searchParams.get('demo') === '1';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (demo) {
        // ... Emily's scripted timeline (preserve from git show 7cc65f5)
        return;
      }
      const db = await getDb();
      if (!db) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase: 'error', summary: 'MongoDB unavailable' })}\n\n`));
        controller.close();
        return;
      }
      const coll = db.collection('agent_events');

      // Try change stream first.
      try {
        const cs = coll.watch([
          { $match: { 'fullDocument.emergency_id': params.emergencyId } },
        ]);
        for await (const change of cs) {
          const doc = change.fullDocument;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(doc)}\n\n`));
        }
      } catch (_) {
        // Fallback: poll every 250ms
        let lastTs = '';
        const timer = setInterval(async () => {
          const docs = await coll
            .find({ emergency_id: params.emergencyId, ts: { $gt: lastTs } })
            .sort({ ts: 1 }).limit(50).toArray();
          for (const d of docs) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(d)}\n\n`));
            lastTs = d.ts;
          }
        }, 250);
        req.signal.addEventListener('abort', () => clearInterval(timer));
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

### 2.2 Verify the existing telemetry hook

`lib/useEmergencyTelemetry.ts` (Emily's 545-line version, restored from `a404c0a`) already consumes this SSE shape. Confirm the event field names align:
- `agent`, `capability`, `phase`, `summary`, `data`, `ts`, `emergency_id`.

The Coordinator's `emit_event()` in `agentverse-deploy/coordinator.py` writes exactly those fields. No frontend changes needed.

---

## Phase 3 — Scenario picker and the 3 use cases

This depends on `lib/scenarios.ts` from `RECOVER_AND_MAPBOX_PROMPT.md` Part 3. After that file exists, the scenario picker on `/sos/map/page.tsx` (or `/demo/page.tsx`) should:

1. Set `sessionStorage.setItem('cardiaclink:scenarioId', scenarioId)`.
2. POST `{emergency_id: crypto.randomUUID(), scenario_id: scenarioId}` to `/api/emergency/start`.
3. Open the SSE connection at `/api/telemetry/{emergency_id}`.
4. The 8 agents' events flow in as MongoDB documents → SSE → `useEmergencyTelemetry`.

---

## Phase 4 — Environment configuration

Update `.env.local.example`:

```env
# ── Existing ──
NEXT_PUBLIC_MAPBOX_TOKEN=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_CARDIACLINK_API_URL=http://localhost:8000

# ── MongoDB (restored in RECOVER prompt Part 1) ──
MONGODB_URI=
MONGODB_DB=cardiaclink

# ── Agentverse (NEW) ──
AGENTVERSE_BASE_URL=https://agentverse.ai
COORDINATOR_AGENT_ADDRESS=  # paste from agentverse-deploy/README.md
```

Do **not** put `ASI1_API_KEY`, `ELEVENLABS_API_KEY`, `WHAT3WORDS_API_KEY` in `.env.local`. Those go into the per-agent Secrets panel in the Agentverse UI.

---

## Phase 5 — Verification

End-to-end smoke test:

1. **All 8 agents deployed**: `agentverse-deploy/README.md` has a non-empty address for every agent.
2. **MongoDB connected**: `npm run test:mongo` returns `ok: 1`.
3. **Frontend dispatches**: Pick a scenario in the UI → `/api/emergency/start` returns 200 → an `EmergencyAck` is logged.
4. **Events flow**: Within 3 s, `/api/telemetry/{id}` starts emitting events with `agent ∈ {coordinator, aed, ems, voice, triage, drone, optimizer, handoff}`.
5. **Activity feed renders**: Emily's `<AgentActivityFeed events={state.events} />` shows the dispatch → AED located → EMS dispatched → drone launched → voice ready → triage → handoff sequence with the canonical color map.
6. **MongoDB persists**: `db.handoff_bundles.find()` shows one new FHIR R4 Bundle per resolved emergency.

If any of those fails, the failure point is one of:
- Wrong Agentverse REST URL (check the Coordinator's "Connect" tab).
- Specialist addresses missing from Coordinator's Secrets.
- MongoDB IP allowlist blocking Agentverse — add `0.0.0.0/0` for the demo, lock down later.
- ASI1 quota exhausted — check Agentverse logs.

---

## Constraints

- **No `python bus/scripts/run_all.py`** in the demo path. The local Bureau is dead code now; archive it to `bus/_local_bureau/` or just leave it untouched and note in the README that it's superseded.
- **Don't put secrets in code.** All API keys go into Agentverse Secrets (per agent) or `.env.local` (frontend only). Anything in `agentverse-deploy/*.py` reads from `os.getenv(...)`.
- **Match the event schema.** The Coordinator's `emit_event()` writes specific field names. Don't rename them on the frontend without updating both sides.
- **Verify Agentverse URL conventions.** I can't reach agentverse.ai from this environment, so the exact REST URL in `lib/agentverse.ts` may need a tweak. Check the agent's "Connect" tab and update `AGENTVERSE_BASE_URL` + the path in `dispatchEmergency()` accordingly.

## Deliverables checklist

- [ ] All 8 agent addresses present in `agentverse-deploy/README.md`
- [ ] AED agent on Agentverse re-deployed with `aed_agent.py` (replacing the v0 Square example)
- [ ] `lib/agentverse.ts` created with `dispatchEmergency()`
- [ ] `lib/agents/coordinator.ts` rewritten to forward to Agentverse (old version archived)
- [ ] `app/api/emergency/start/route.ts` calls the new coordinator
- [ ] `app/api/telemetry/[emergencyId]/route.ts` reads MongoDB change stream / poll
- [ ] `.env.local.example` updated with `COORDINATOR_AGENT_ADDRESS`
- [ ] Smoke test: scenario pick → 8 agents emit events → frontend renders them in real time
- [ ] One FHIR R4 Bundle in `cardiaclink.handoff_bundles` per resolved emergency
- [ ] `npm run build` passes

After all checks green, print a short runbook:
- The 3 scenario URLs.
- Which Agentverse agent's logs to tail when something looks off.
- How to reset state (`db.agent_events.deleteMany({})`).
