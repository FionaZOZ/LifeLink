# Claude Code Prompt — Wire CardiacLink frontend map to live Agentverse agents

Run this from `/Users/emilysun/Downloads/CardicLinkNew-master`.

This prompt is **frontend-only**. The 4 hosted agents on Agentverse already work end-to-end (Coordinator orchestrates AED + EMS + Handoff, writes events to MongoDB Atlas). Don't touch them.

---

## 🚫 DO NOT MODIFY — these files are working in production

| Path | Why locked |
|---|---|
| `agentverse-deploy/coordinator.py` | Deployed at `agent1q2xtpl2guq322sm23lyl3ukw0229qwh54j3uyvlljc2s96pr059r7y2h3xz` — orchestration verified working |
| `agentverse-deploy/aed_agent.py` | Deployed at `agent1qtwzxzycn4ye2f76ekh5fzwf75tpgtgl8geuyku7kf6cz70n868z537a36v` |
| `agentverse-deploy/ems_agent.py` | Deployed at `agent1q2hunle9n7s0ddwst6924pv5zmfsmsan7rsq4qu5s3py5c5hequ7kwryf42` |
| `agentverse-deploy/handoff_agent.py` | Deployed at `agent1qdyjhlre8vshyk2nscr6vngqhehywt544s6suld3wqhvtgq0wg0zyulpdxp` |
| `agentverse-deploy/.deployed.json` | Address cache — DO NOT regenerate |
| `agentverse-deploy/deploy.py` | Don't run, don't edit |
| `agentverse-deploy/agents.toml` | Manifest — leave alone |
| `agentverse-deploy/_archive/*` | Archived agents — never touch |
| `secrets.sh` | Local secrets, gitignored — never read or write |

If you think you need to modify any of the above to make the frontend work, **stop and ask** — there's almost certainly a frontend-only solution.

---

## What's already running

- **4 hosted agents on Agentverse** — accept Chat Protocol messages, do real fan-out, write events to MongoDB Atlas under `cardiaclink/agent_events` and FHIR bundles to `cardiaclink/handoff_bundles`.
- **MongoDB Atlas** — connection string in user's `.env.local` as `MONGODB_URI`. Two collections in use: `agent_events` (per-step orchestration events) and `handoff_bundles` (final FHIR R4 documents).
- **3 canonical scenarios with real UCLA coordinates**:
  - `royce-hall` → 34.0727, -118.4421
  - `pauley-pavilion` → 34.0703, -118.4470
  - `bruin-walk` → 34.0710, -118.4445

The 4 agents detect these scenario keywords in chat. The frontend will trigger them by name.

## What's currently broken/stub on the frontend

1. `app/sos/map/page.tsx` renders a **schematic illustration** (`components/lifelink/RadiusMap.tsx`) — fake grid streets, hardcoded pixel coordinates, fake concentric "1mi/2mi" rings. Not a real map.
2. `app/api/emergency/start/route.ts` calls `lib/agents/coordinator.ts` which is **4 stub functions returning `{status: 'migrated_to_bus'}`** — never reaches Agentverse.
3. `app/api/telemetry/[emergencyId]/route.ts` — currently a demo timeline. Should stream events from MongoDB.
4. No scenario picker — user can't choose which UCLA case to demo.
5. No live agent activity feed visible on the map.

---

## Your job — 5 deliverables

### 1. `lib/scenarios.ts` (new file)

Single source of truth for the 3 UCLA scenarios. Frontend imports from here.

```ts
export type ScenarioId = 'royce-hall' | 'pauley-pavilion' | 'bruin-walk';

export interface Scenario {
  id: ScenarioId;
  label: string;
  narrative: string;
  patient: { lat: number; lon: number; address: string };
  helpers: Array<{ id: string; name: string; role: string; lat: number; lon: number; color: string }>;
  aeds:    Array<{ id: string; name: string; lat: number; lon: number }>;
  ems:     { lat: number; lon: number; unit: string };
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'royce-hall': {
    id: 'royce-hall',
    label: 'Royce Hall Collapse',
    narrative: 'Student collapses during a Royce Hall lecture.',
    patient: { lat: 34.0727, lon: -118.4421, address: 'Royce Hall, UCLA' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',   lat: 34.0732, lon: -118.4438, color: '#3b82f6' },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer',  lat: 34.0721, lon: -118.4408, color: '#10b981' },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',   lat: 34.0738, lon: -118.4415, color: '#a855f7' },
    ],
    aeds: [
      { id: 'powell', name: 'Powell Library AED', lat: 34.0716, lon: -118.4419 },
      { id: 'kaplan', name: 'Kaplan Hall AED',    lat: 34.0729, lon: -118.4404 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
  'pauley-pavilion': {
    id: 'pauley-pavilion',
    label: 'Pauley Pavilion Game',
    narrative: 'Spectator cardiac arrest during a Pauley Pavilion event.',
    patient: { lat: 34.0703, lon: -118.4470, address: 'Pauley Pavilion, UCLA' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',  lat: 34.0710, lon: -118.4458, color: '#3b82f6' },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer', lat: 34.0698, lon: -118.4480, color: '#10b981' },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',  lat: 34.0712, lon: -118.4475, color: '#a855f7' },
    ],
    aeds: [
      { id: 'pauley',   name: 'Pauley Pavilion AED',     lat: 34.0701, lon: -118.4468 },
      { id: 'jdmorgan', name: 'J.D. Morgan Center AED',  lat: 34.0712, lon: -118.4458 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
  'bruin-walk': {
    id: 'bruin-walk',
    label: 'Bruin Walk Incident',
    narrative: 'Jogger collapses on Bruin Walk near Ackerman Union.',
    patient: { lat: 34.0710, lon: -118.4445, address: 'Bruin Walk near Ackerman' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',  lat: 34.0716, lon: -118.4438, color: '#3b82f6' },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer', lat: 34.0703, lon: -118.4452, color: '#10b981' },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',  lat: 34.0708, lon: -118.4458, color: '#a855f7' },
    ],
    aeds: [
      { id: 'ackerman',  name: 'Ackerman Union AED', lat: 34.0705, lon: -118.4450 },
      { id: 'kerckhoff', name: 'Kerckhoff Hall AED', lat: 34.0708, lon: -118.4441 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
};
```

### 2. `lib/mongo/client.ts` (may already exist — verify)

Server-side MongoDB client used by the SSE telemetry endpoint. If missing, recover from git: `git show 0ca0794:lib/mongo/client.ts > lib/mongo/client.ts`. Confirms `MONGODB_URI` env var is read; exports `getDb()` returning a `Db` or `null` if unconfigured.

### 3. `app/api/telemetry/[emergencyId]/route.ts` (rewrite)

Stream live events from MongoDB to the browser via Server-Sent Events.

Body sketch:

```ts
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';   // need full pymongo equivalent, not edge

export async function GET(req: NextRequest, { params }: { params: { emergencyId: string } }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      const db = await getDb();
      if (!db) { send({ error: 'MongoDB not configured' }); controller.close(); return; }
      const coll = db.collection('agent_events');

      // Replay anything already in MongoDB for this emergency
      const initial = await coll
        .find({ emergency_id: params.emergencyId })
        .sort({ ts: 1 })
        .limit(200)
        .toArray();
      for (const doc of initial) send(doc);

      // Then poll every 250ms for new events. Use a change stream if Atlas tier
      // supports it (try `coll.watch(...)` and fall back to polling on error).
      let lastTs = initial.at(-1)?.ts ?? '';
      const timer = setInterval(async () => {
        const docs = await coll
          .find({ emergency_id: params.emergencyId, ts: { $gt: lastTs } })
          .sort({ ts: 1 })
          .limit(50)
          .toArray();
        for (const d of docs) {
          send(d);
          lastTs = d.ts;
        }
      }, 250);

      req.signal.addEventListener('abort', () => clearInterval(timer));
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

The MongoDB documents have shape `{ ts, emergency_id, agent, capability, phase, summary, data }` — use those field names verbatim.

### 4. `app/api/emergency/start/route.ts` (rewrite)

Trigger an emergency by sending a Chat Protocol message to the Coordinator hosted agent. The Coordinator's keyword detector picks up the scenario name and runs orchestration.

The simplest path: call Agentverse's REST submission endpoint with a Chat Protocol message. **The exact endpoint URL needs verification** — try `https://agentverse.ai/v1/submit/{coordinator_address}` first; if it 404s, look for the Connect tab in the Agentverse Coordinator dashboard for the precise URL.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { SCENARIOS, ScenarioId } from '@/lib/scenarios';
import { v4 as uuidv4 } from 'uuid';

const COORDINATOR_ADDRESS = process.env.COORDINATOR_AGENT_ADDRESS!;
const AGENTVERSE_API_KEY  = process.env.AGENTVERSE_API_KEY!;
const AGENTVERSE_BASE     = process.env.AGENTVERSE_BASE_URL ?? 'https://agentverse.ai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const scenarioId = body.scenario_id as ScenarioId;
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) return NextResponse.json({ error: 'unknown scenario' }, { status: 400 });

  const emergencyId = `web-${uuidv4().slice(0, 8)}`;

  // Send a Chat Protocol message; the Coordinator's keyword detector picks
  // up the scenario name and triggers the multi-agent fan-out.
  const text = `Cardiac arrest at ${scenario.patient.address}`;
  const url = `${AGENTVERSE_BASE}/v1/submit/${COORDINATOR_ADDRESS}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGENTVERSE_API_KEY}`,
    },
    body: JSON.stringify({
      // Chat Protocol envelope; verify shape against Agentverse docs.
      message: {
        timestamp: new Date().toISOString(),
        msg_id: emergencyId,
        content: [{ type: 'text', text }],
      },
    }),
  });

  if (!r.ok) {
    return NextResponse.json({ error: await r.text() }, { status: r.status });
  }

  return NextResponse.json({ emergency_id: emergencyId, scenario_id: scenarioId });
}
```

If the URL or body shape is wrong, the Agentverse REST surface has shifted. Investigate the Coordinator's "Connect" tab in the Agentverse dashboard for the right pattern, or fall back to triggering via ASI:One chat manually.

Add `uuid` to dependencies: `npm install uuid && npm install -D @types/uuid`.

### 5. `components/lifelink/ScenarioMap.tsx` (new) + `app/sos/map/page.tsx` (rewrite)

Replace the schematic `<RadiusMap>` with a real Mapbox-rendered UCLA map.

`ScenarioMap.tsx` requirements:

- Use `react-map-gl/mapbox` (already in `package.json`). Imports: `Map`, `Marker`, `Source`, `Layer`, `NavigationControl`.
- Read `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`. If missing, render a one-line warning banner and a `<NearbyAedMap>` Leaflet fallback.
- Props: `{ scenarioId: ScenarioId; events: AgentEvent[] }` where `events` is the SSE-streamed array.
- Center on the patient location with `zoom: 15.5`, `pitch: 0`. Style: `mapbox://styles/mapbox/light-v11`.
- Render markers:
  - **Patient**: red pulsing circle with "YOU" label.
  - **Helpers**: colored circles with initials (M / S / J), color from `helper.color`. Position from `SCENARIOS[scenarioId].helpers`.
  - **AEDs**: red square with heart-with-AED icon (`/public/cpr/aed-use-guide.png` already in repo). Position from `SCENARIOS[scenarioId].aeds`.
  - **EMS station**: blue square with ambulance icon, from `SCENARIOS[scenarioId].ems`.
- Render coverage rings around the patient at 0.5 mi, 1 mi, 2 mi using `@turf/circle`.
- For each helper, render a dashed `LineString` from `helper.lat/lon` to `patient.lat/lon`. Color the line per helper.
- When events stream in (`agent: "aed"`, `phase: "result"`), animate the AED marker to a pulsing state. Same for EMS / drone / handoff — change marker style / add a "✓" check overlay.
- Show an event log panel in the bottom-left or side, listing the last 10 events with their timestamps and color-coded agent name. Reuse `components/AgentActivityFeed.tsx` if it exists (recover from git `9cc6d7b` if not).

`app/sos/map/page.tsx` rewrite:

- Read `scenarioId` from `searchParams` (default `royce-hall`).
- Generate or read `emergencyId` from `searchParams`. If absent, render a "Trigger emergency" button that POSTs to `/api/emergency/start` with the scenario, then redirects with the resulting `emergencyId` in URL.
- Open SSE: `new EventSource('/api/telemetry/' + emergencyId)`.
- Accumulate events into state, pass to `<ScenarioMap scenarioId={scenarioId} events={events} />`.
- Keep the bottom Live Responders sheet — but bind it to real events (not the `useHelperFlow` time-based simulation). When `agent: "aed"` event arrives, show "✓ Sarah arriving with AED". When `agent: "ems"` event, show "✓ EMS dispatched".
- Add a small dev-only scenario switcher at the top with the 3 buttons (royce-hall / pauley-pavilion / bruin-walk). Hide when `process.env.NODE_ENV === 'production'`.
- "Open CPR guide →" CTA on the bottom unchanged — still routes to `/sos/cpr/assist`.

Delete or move `components/lifelink/RadiusMap.tsx` to `components/lifelink/_archive/` (don't delete outright — keep for rollback).

---

## Environment

Add these to `.env.local` (the user has `.env.local.example` with placeholders — fill them in or instruct the user to):

```
NEXT_PUBLIC_MAPBOX_TOKEN=<get from mapbox.com — needed for real map>
COORDINATOR_AGENT_ADDRESS=agent1q2xtpl2guq322sm23lyl3ukw0229qwh54j3uyvlljc2s96pr059r7y2h3xz
AED_AGENT_ADDRESS=agent1qtwzxzycn4ye2f76ekh5fzwf75tpgtgl8geuyku7kf6cz70n868z537a36v
EMS_AGENT_ADDRESS=agent1q2hunle9n7s0ddwst6924pv5zmfsmsan7rsq4qu5s3py5c5hequ7kwryf42
HANDOFF_AGENT_ADDRESS=agent1qdyjhlre8vshyk2nscr6vngqhehywt544s6suld3wqhvtgq0wg0zyulpdxp
AGENTVERSE_API_KEY=<from secrets.sh, never commit>
MONGODB_URI=<from secrets.sh, never commit>
MONGODB_DB=cardiaclink
```

---

## Acceptance — what should be true at the end

1. Visit `/sos/map?scenario=royce-hall` (or any of the 3 scenarios).
2. The page shows a **real Mapbox UCLA map** centered on the patient, with helper / AED / EMS markers at real coordinates.
3. A "Trigger emergency" button POSTs to `/api/emergency/start` and redirects with an `emergencyId`.
4. Within 3 seconds of trigger, MongoDB shows new documents in `agent_events` (verify in Atlas web console).
5. The SSE endpoint streams those events back to the browser; the bottom-left event feed shows them rolling in (8+ events: triage, voice, aed, optimizer, ems, drone, handoff, resolved).
6. As events arrive, the corresponding map markers update (✓ check on AED, EMS truck moves toward patient, etc.).
7. With `NEXT_PUBLIC_MAPBOX_TOKEN` unset, the page falls back to Leaflet + a one-line warning banner — does NOT crash.
8. `npm run build` passes.
9. `npm run lint` clean for any file you touched.

---

## Constraints

- **Frontend only.** No edits to `agentverse-deploy/`, no calls to `python deploy.py`, no changes to MongoDB schema.
- **Match the SSE event shape from MongoDB exactly**: `{ ts, emergency_id, agent, capability, phase, summary, data }`. The agents already write these fields — don't ask them to change.
- **Don't refactor** `components/lifelink/Screen.tsx`, `Pieces.tsx`, `tokens.ts`, `Icon.tsx`, or any other shared lifelink primitives unless strictly necessary. Stay surgical.
- **Mapbox token** — if missing, the user gets a graceful fallback, not a crash. Test with the token unset.
- **Verify Agentverse REST URL** — if my `https://agentverse.ai/v1/submit/{address}` is wrong, the trigger fails. Print the response body for any 4xx so the user can see what shape Agentverse actually wants. Don't silently fall back to demo events.

After you finish, print a short runbook with:
- The 3 scenario URLs that should now work.
- How to set `NEXT_PUBLIC_MAPBOX_TOKEN`.
- How to verify in MongoDB Atlas that a real emergency_id was created.
- What to do if the Agentverse trigger 4xxs.
