# Claude Code Prompt — CardiacLink frontend live map (visualization-only, ASI:One trigger)

Run from `/Users/emilysun/Downloads/CardicLinkNew-master`.

This **supersedes** `MAP_INTEGRATION_PROMPT.md`. Architecture changed: the frontend does **NOT** trigger emergencies directly. Triggering happens in ASI:One chat (judges manually chat the Coordinator agent). Frontend's job is **visualization only** — it watches MongoDB for new emergencies and renders them on a real Mapbox UCLA map in real time.

---

## 🚫 DO NOT MODIFY — these files work, leave them alone

| Path | Why locked |
|---|---|
| `agentverse-deploy/coordinator.py` | Live at `agent1qf39hy5w480wqetwekxy7z0hf8gkchdddf863thqhxsxsdynvqr9upx5q4f` |
| `agentverse-deploy/aed_agent.py` | Live at `agent1qfedfdfe9l0cwejgrz30my4gmtjj8xjsam39hjzesa0khlhnsnmfg57k3p0` |
| `agentverse-deploy/ems_agent.py` | Live at `agent1qw3239g4tahjmw93fwqqp24hyhelljh70ee6wh59euqgrts0kdqfv8gtdll` |
| `agentverse-deploy/handoff_agent.py` | Live at `agent1q2z070qakeu20musu62dcegcdykse3kx403tugtc4u09fwgu72gwsg8nc29` |
| `agentverse-deploy/.deployed.json` | Address cache — DO NOT regenerate |
| `agentverse-deploy/deploy.py` | Don't run, don't edit |
| `agentverse-deploy/agents.toml` | Manifest — leave alone |
| `agentverse-deploy/_archive/*` | Archived agents — never touch |
| `secrets.sh` | Local secrets, gitignored — never read or write |

If you think you need to modify any of the above, **stop and ask** — there is a frontend-only solution.

---

## Architecture

```
┌──────────────────┐                    ┌────────────────────┐
│  Judge in        │  chat              │  Coordinator agent │
│  ASI:One         │ ─────────────────▶ │  (Agentverse)      │
└──────────────────┘                    │                    │
                                        │  ctx.send -> AED   │
                                        │  ctx.send -> EMS   │
                                        │  ctx.send -> HF    │
                                        │                    │
                                        │  writes events to  │
                                        │  MongoDB Atlas     │
                                        └─────────┬──────────┘
                                                  │
                                                  │ 8 events
                                                  ▼
┌──────────────────┐  SSE  ┌────────┐    ┌──────────────────┐
│  CardiacLink     │ ◀──── │ Next.js│ ◀──│  MongoDB Atlas   │
│  Frontend Map    │       │  API   │    │  agent_events    │
│  (Mapbox UCLA)   │       └────────┘    │  handoff_bundles │
└──────────────────┘                     └──────────────────┘
```

The frontend has **no trigger button**. It either auto-watches the latest emergency or lets the user pick from a dropdown of recent emergencies.

---

## What's already in `.env.local` (verify before starting)

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiZW1tbTgzMyIs...
ANTHROPIC_API_KEY=sk-ant-api03-...
MONGODB_URI=mongodb+srv://qirans3_db_user:...@cluster0.1ic9oxw.mongodb.net/...
MONGODB_DB=cardiaclink
COORDINATOR_AGENT_ADDRESS=agent1qf39hy5w480wq...
AED_AGENT_ADDRESS=agent1qfedfdfe9l0cwejg...
EMS_AGENT_ADDRESS=agent1qw3239g4tahjmw93fwq...
HANDOFF_AGENT_ADDRESS=agent1q2z070qakeu20mus...
```

If any are missing, `.env.local.example` has the canonical names — copy from there.

---

## Deliverables — 6 files

### 1. `lib/scenarios.ts` (new, single source of truth)

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
  // The exact phrase that triggers this scenario in the Coordinator's keyword
  // detector. The frontend offers this as a "copy-and-chat" prompt for the user.
  chatPrompt: string;
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'royce-hall': {
    id: 'royce-hall',
    label: 'Royce Hall Collapse',
    narrative: 'Student collapses during a Royce Hall lecture.',
    chatPrompt: 'Cardiac arrest at Royce Hall',
    patient: { lat: 34.0727, lon: -118.4421, address: 'Royce Hall, UCLA' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',  lat: 34.0732, lon: -118.4438, color: '#3b82f6' },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer', lat: 34.0721, lon: -118.4408, color: '#10b981' },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',  lat: 34.0738, lon: -118.4415, color: '#a855f7' },
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
    chatPrompt: 'Cardiac arrest at Pauley Pavilion',
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
    chatPrompt: 'Jogger collapse on Bruin Walk',
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

### 2. `lib/mongo/client.ts` (verify exists; if missing, recover from `git show 0ca0794:lib/mongo/client.ts`)

Standard Node MongoDB client. Reads `MONGODB_URI` and exports `getDb()`.

### 3. `app/api/emergency/latest/route.ts` (new)

Returns the most recent emergency the agents handled, plus a few previous ones for the picker dropdown:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: 'mongo not configured' }, { status: 500 });

  // Get the 5 most recent "phase: request" events (one per emergency)
  const recent = await db.collection('agent_events')
    .find({ phase: 'request', agent: 'coordinator' })
    .sort({ ts: -1 })
    .limit(5)
    .toArray();

  return NextResponse.json({
    latest: recent[0] ? {
      emergency_id: recent[0].emergency_id,
      summary: recent[0].summary,
      data: recent[0].data,                  // {lat, lon, address}
      ts: recent[0].ts,
    } : null,
    recent: recent.map(r => ({
      emergency_id: r.emergency_id,
      summary: r.summary,
      ts: r.ts,
    })),
  });
}
```

### 4. `app/api/telemetry/[emergencyId]/route.ts` (rewrite)

SSE bridge between MongoDB `agent_events` and the browser. Replays existing events for the emergency, then polls every 250ms for new ones.

```ts
import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { emergencyId: string } }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      const db = await getDb();
      if (!db) { send({ error: 'MongoDB not configured' }); controller.close(); return; }
      const coll = db.collection('agent_events');

      // Replay everything already in MongoDB for this emergency
      const initial = await coll
        .find({ emergency_id: params.emergencyId })
        .sort({ ts: 1 })
        .limit(200)
        .toArray();
      for (const doc of initial) send(doc);

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

The MongoDB documents have shape `{ ts, emergency_id, agent, capability, phase, summary, data }`.

### 5. `app/api/agent-health/route.ts` (new — bonus, easy 5 lines)

Pings the public Almanac for each of the 4 agents — gives you 4 green dots in the demo:

```ts
import { NextResponse } from 'next/server';

const ADDRESSES = {
  coordinator: process.env.COORDINATOR_AGENT_ADDRESS!,
  aed:         process.env.AED_AGENT_ADDRESS!,
  ems:         process.env.EMS_AGENT_ADDRESS!,
  handoff:     process.env.HANDOFF_AGENT_ADDRESS!,
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = await Promise.all(
    Object.entries(ADDRESSES).map(async ([name, addr]) => {
      try {
        const r = await fetch(`https://agentverse.ai/v1/almanac/agents/${addr}`, {
          signal: AbortSignal.timeout(2000),
        });
        const data = r.ok ? await r.json() : null;
        return { name, address: addr, online: r.ok, endpoints: data?.endpoints ?? [] };
      } catch (e: any) {
        return { name, address: addr, online: false, error: e.message };
      }
    })
  );
  return NextResponse.json({ agents: checks });
}
```

### 6. `components/lifelink/ScenarioMap.tsx` (new) + `app/sos/map/page.tsx` (rewrite)

The visualization page. Two main pieces:

**`ScenarioMap.tsx`** — Mapbox component, props `{ scenarioId, events }`:

- Use `react-map-gl/mapbox` (already in `package.json`). Imports: `Map`, `Marker`, `Source`, `Layer`, `NavigationControl`.
- Read `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`. If missing, render a one-line warning banner and fall back to `<NearbyAedMap>` (Leaflet — already in `components/`).
- Center on `SCENARIOS[scenarioId].patient` at zoom 15.5, pitch 0, style `mapbox://styles/mapbox/light-v11`.
- Markers:
  - **Patient**: red pulsing circle with "YOU" label
  - **Helpers**: colored circles with M/S/J initials, color from `helper.color`, animated "moving toward patient" when their corresponding event arrives
  - **AEDs**: red square with the `/public/cpr/aed-use-guide.png` icon
  - **EMS station**: blue square with ambulance icon
- Coverage rings at 0.5 mi, 1 mi, 2 mi using `@turf/circle`.
- Dashed `LineString` from each helper to the patient, color per helper.
- React to events:
  - When an `agent: "aed"` `phase: "result"` event arrives, animate the AED that was selected (use `data.aed_id` if present, else top of list) with a pulsing "✓ found" overlay.
  - When `agent: "ems"` `phase: "result"`, animate the EMS marker moving toward the patient.
  - When `agent: "drone"` `phase: "result"`, drop a drone marker that flies a straight line from the staging pad to the patient.
  - When `agent: "handoff"` `phase: "result"`, flash a green "FHIR bundle stored" toast and show the bundle id in a corner.

**`app/sos/map/page.tsx`** rewrite:

```tsx
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SCENARIOS, ScenarioId } from '@/lib/scenarios';
import { ScenarioMap } from '@/components/lifelink/ScenarioMap';
import { AgentActivityFeed } from '@/components/AgentActivityFeed';   // recover from git 9cc6d7b if missing

export default function MapPage() {
  const params  = useSearchParams();
  const router  = useRouter();
  const scenarioId = (params.get('scenario') ?? 'royce-hall') as ScenarioId;
  const scenario = SCENARIOS[scenarioId];
  const [emergencyId, setEmergencyId] = useState<string | null>(params.get('eid'));
  const [events, setEvents] = useState<any[]>([]);
  const [agentHealth, setAgentHealth] = useState<any[]>([]);

  // 1. Auto-load the latest emergency if no eid in URL
  useEffect(() => {
    if (emergencyId) return;
    fetch('/api/emergency/latest').then(r => r.json()).then(d => {
      if (d.latest?.emergency_id) {
        setEmergencyId(d.latest.emergency_id);
        router.replace(`/sos/map?scenario=${scenarioId}&eid=${d.latest.emergency_id}`);
      }
    });
  }, [emergencyId, scenarioId, router]);

  // 2. SSE subscribe once we have an emergency_id
  useEffect(() => {
    if (!emergencyId) return;
    const es = new EventSource(`/api/telemetry/${emergencyId}`);
    es.onmessage = (e) => {
      try { setEvents(prev => [...prev, JSON.parse(e.data)]); } catch {}
    };
    return () => es.close();
  }, [emergencyId]);

  // 3. Agent health (Almanac ping every 10s)
  useEffect(() => {
    const tick = () =>
      fetch('/api/agent-health').then(r => r.json()).then(d => setAgentHealth(d.agents ?? []));
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  // 4. ASI:One deep-link to trigger
  const asioneUrl = useMemo(() => {
    const prompt = encodeURIComponent(scenario.chatPrompt);
    return `https://asi1.ai/?prompt=${prompt}`;   // Verify pattern; fall back to plain https://asi1.ai
  }, [scenario.chatPrompt]);

  return (
    <div className="relative h-screen w-screen">
      {/* Map fills the screen */}
      <ScenarioMap scenarioId={scenarioId} events={events} />

      {/* Top-left: scenario picker + agent health pills */}
      <div className="absolute top-4 left-4 space-y-2 z-10">
        <ScenarioPicker active={scenarioId} onChange={(s) => router.replace(`/sos/map?scenario=${s}`)} />
        <AgentHealthPills agents={agentHealth} />
      </div>

      {/* Top-right: trigger via ASI:One */}
      <div className="absolute top-4 right-4 z-10">
        <a
          href={asioneUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => navigator.clipboard?.writeText(scenario.chatPrompt)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg flex flex-col items-end"
        >
          <span className="font-bold">Trigger via ASI:One</span>
          <span className="text-xs opacity-80">opens chat · prompt copied to clipboard</span>
        </a>
      </div>

      {/* Bottom-left: live agent activity feed */}
      <div className="absolute bottom-4 left-4 w-96 max-h-96 overflow-y-auto z-10">
        <AgentActivityFeed events={events} />
      </div>

      {/* Bottom-right: current emergency_id + scenario narrative */}
      <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg p-3 shadow-lg">
        <div className="font-bold">{scenario.label}</div>
        <div className="text-xs text-gray-600">{scenario.narrative}</div>
        {emergencyId && (
          <div className="text-xs font-mono text-gray-500 mt-1">
            emergency_id: {emergencyId}
          </div>
        )}
      </div>
    </div>
  );
}

// helpers ScenarioPicker / AgentHealthPills inline or in a small adjacent file.
```

---

## Demo flow (this is what judges will see)

1. **Judge opens cardiaclink at `/sos/map?scenario=royce-hall`** in one tab.
2. Map shows real UCLA Mapbox view, helpers + AEDs at real coordinates, **4 green agent-health pills** in the corner.
3. Judge clicks **"Trigger via ASI:One"** → opens https://asi1.ai in a new tab, prompt `Cardiac arrest at Royce Hall` copied to clipboard.
4. Judge pastes into ASI:One chat, sends to Coordinator.
5. **Within 2 seconds**, the cardiaclink tab's activity feed and map start animating: AED highlight, helpers move, drone flies, FHIR bundle toast pops.
6. Judge can switch scenarios by clicking the picker (royce-hall / pauley-pavilion / bruin-walk).

This split-screen demo is **stronger than a single-button trigger** — it visually separates "ASI:One can chat my agents" from "real orchestration writes data" from "frontend visualizes that data". Three independent systems verified at once.

---

## Acceptance

1. `/sos/map?scenario=royce-hall` loads with a real Mapbox map centered on Royce Hall.
2. Top-left has 3 scenario pills + 4 agent-health pills (all green when agents are running).
3. Top-right has "Trigger via ASI:One" button that opens https://asi1.ai and copies the prompt.
4. Without an `eid` query param, the page auto-fetches the latest emergency from `/api/emergency/latest` and updates the URL.
5. With an `eid`, the page opens SSE on `/api/telemetry/{eid}` and renders events as they arrive.
6. The bottom-left activity feed shows ~8 events per emergency, color-coded per agent.
7. With `NEXT_PUBLIC_MAPBOX_TOKEN` unset, the page falls back to Leaflet + a one-line warning. Does NOT crash.
8. `npm run build` passes.
9. `npm run lint` clean for any file you touched.

---

## Constraints

- **Frontend only.** No edits to `agentverse-deploy/`. No POST attempts to Agentverse REST endpoints (those need uagents envelope signing — out of scope for the frontend).
- **Don't touch** `components/lifelink/Screen.tsx`, `tokens.ts`, `Icon.tsx`, or other shared lifelink primitives unless strictly necessary. Stay surgical.
- **Match the SSE event shape from MongoDB exactly**: `{ ts, emergency_id, agent, capability, phase, summary, data }`.
- If `app/api/emergency/start/route.ts` exists from a previous integration attempt, **delete it or keep it as a no-op stub** that returns 410 Gone. We're not triggering through Next.js anymore.
- The `chatPrompt` strings in `lib/scenarios.ts` must include keywords the Coordinator detects: at minimum "royce" / "pauley" / "bruin" / "ackerman" or "cardiac arrest" / "collapse". The current strings already do.

---

## After you finish, print a short runbook

```
1. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local (already done if you used the
   updated .env.local).
2. npm run dev
3. Open http://localhost:3000/sos/map?scenario=royce-hall
4. Verify: map renders, 4 green agent-health pills, scenario picker works.
5. Click "Trigger via ASI:One" — opens asi1.ai, prompt in clipboard.
6. Paste & send "Cardiac arrest at Royce Hall" to the Coordinator agent.
7. Switch back to cardiaclink tab — within 2s, activity feed and map should
   begin animating with real MongoDB events.
8. Verify in Atlas: `cardiaclink.agent_events` has 8 new docs;
   `cardiaclink.handoff_bundles` has one new FHIR bundle.
```
