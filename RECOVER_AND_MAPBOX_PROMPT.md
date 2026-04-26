# Claude Code Prompt — Recover MongoDB + Live Stream, swap to real Mapbox

Run this from the project root: `/Users/emilysun/Downloads/CardicLinkNew-master`.

This prompt has three parts. Do them in order. Don't skip the verification steps — the previous teammate has already had merges silently drop work, and we need each phase to be visibly green before moving on.

---

## Background — read this first

Two things written by the user (Emily, qirans3@uci.edu) on 2026-04-25 are missing from HEAD:

1. **MongoDB + FHIR R4 handoff persistence** (commits `f8bca54` → `0ca0794`, 7 phases). Explicitly deleted on the same day at 13:46 by Paul Jiang in commit `7a8b8fd` (message: "chore: remove mongodb dependency and related code").
2. **Fetch.ai agent flow live stream** (commits `9cc6d7b` → `a404c0a` → `364a3c2` → `5cbdca8` → `676a934` → `143bcc7` → `7cc65f5`, also 7 phases). Not deleted — orphaned by merge commit `9093e93` ("Merge backend integration + ship LifeLink role-organized design") at 14:13:49, which chose the parallel LifeLink branch and silently left these commits unreachable from `main`.

Both sets of code are still in git (`git log --all`, reflog). Recover from the listed commit hashes.

In the same recovery, the schematic radial illustration at `/sos/map/page.tsx` (uses `components/lifelink/RadiusMap.tsx`, the cream-colored fake-grid map with concentric pink circles) needs to be swapped for the real Mapbox-based `components/DemoEmergencyMap.tsx` view, wired to the three UCLA scenarios already defined in `lib/useEmergencyTelemetry.ts::SCENARIOS` (`royce-hall`, `pauley-pavilion`, `bruin-walk`).

Before you touch anything, run:

```bash
git fetch --all
git log 7a8b8fd -1 --stat              # confirm MongoDB deletion scope
git log 9093e93 -1 --stat               # confirm merge that orphaned the stream
git reflog --all | head -80             # confirm Emily's commits are reachable
git show 0ca0794 --stat                 # last good MongoDB state
git show 7cc65f5 --stat                 # last good live-stream state
```

If any of those don't resolve, stop and report — do not improvise.

---

## Part 1 — Restore MongoDB + FHIR

Recover these files verbatim from `0ca0794`:

```bash
mkdir -p lib/mongo lib/fhir scripts app/api/handoff/[id]
git show 0ca0794:lib/mongo/client.ts            > lib/mongo/client.ts
git show 0ca0794:lib/fhir/types.ts              > lib/fhir/types.ts
git show 0ca0794:lib/fhir/buildBundle.ts        > lib/fhir/buildBundle.ts
git show 0ca0794:app/api/handoff/route.ts       > app/api/handoff/route.ts
git show '0ca0794:app/api/handoff/[id]/route.ts' > app/api/handoff/[id]/route.ts
git show 0ca0794:scripts/test-mongo.ts          > scripts/test-mongo.ts
```

Merge the following changes back into existing HEAD files (do **not** overwrite — diff against `git show 0ca0794:<path>` and re-apply only the MongoDB/FHIR-related blocks):

- `lib/useEmergencyTelemetry.ts` — re-add the `persistence` state field and the fire-and-forget `POST /api/handoff` on `phase === 'resolved'`. Note this file is also the subject of Part 2 — coordinate the merge.
- `components/OrchestrationDrawer.tsx` — re-add the footer badge: green dot + "FHIR R4 Bundle stored in MongoDB Atlas · id: …" when persisted, yellow pulse during persistence, red on failure. (This file is also being recovered in Part 2 from `364a3c2` — start from the Part 2 version, then layer this badge on top.)
- `app/globals.css` — re-add the ~31 lines of badge animation styles.
- `package.json` — re-add `"mongodb": "^7.2.0"` to dependencies and `"test:mongo": "tsx --env-file=.env.local scripts/test-mongo.ts"` to scripts.
- `.env.local.example` — re-add `MONGODB_URI=` and `MONGODB_DB=cardiaclink`.

Then:

```bash
npm install
npm run test:mongo   # expect: Mongo ping: { ok: 1 }   (or graceful skip when MONGODB_URI is unset)
```

Verification:

- `lib/mongo/client.ts` exports `getMongoClient`, `getDb`, `HANDOFF_COLLECTION = 'handoff_bundles'`.
- `POST /api/handoff` with a valid FHIR Bundle returns `{ ok: true, id: <ObjectId> }` and `GET /api/handoff` lists recent bundles.
- The OrchestrationDrawer footer renders the persistence badge (it can be in "idle" state — just confirm the JSX is back).

---

## Part 2 — Restore the Fetch.ai agent flow live stream

Recover these files verbatim from the orphaned commits:

```bash
git show 7cc65f5:'app/api/telemetry/[emergencyId]/route.ts' > app/api/telemetry/[emergencyId]/route.ts
git show a404c0a:lib/useEmergencyTelemetry.ts                > lib/useEmergencyTelemetry.ts
git show 9cc6d7b:components/AgentActivityFeed.tsx           > components/AgentActivityFeed.tsx
git show 364a3c2:components/OrchestrationDrawer.tsx         > components/OrchestrationDrawer.tsx
git show 364a3c2:components/EmergencyStatusCards.tsx        > components/EmergencyStatusCards.tsx
git show 364a3c2:components/OrchestrationPill.tsx           > components/OrchestrationPill.tsx
git show 364a3c2:components/CompactEmergencyMap.tsx         > components/CompactEmergencyMap.tsx
```

Now reconcile:

1. **`lib/useEmergencyTelemetry.ts`** — Emily's 545-line version is now the base. On top of it, re-apply Part 1's `persistence` block (the `/api/handoff` POST on resolve). Keep both modes Emily had: `playback` (scripted timeline, used for the 3 scenarios) and `live` (subscribes to `/api/telemetry/{id}` via EventSource). Make sure the exported `SCENARIOS` object still contains `royce-hall`, `pauley-pavilion`, `bruin-walk`.
2. **`app/api/telemetry/[emergencyId]/route.ts`** — Emily's 106-line version is the new baseline. On top of it, add a `BUS_EVENT_URL` proxy: if `process.env.BUS_EVENT_URL` is set and `?live=1` is on the request, proxy SSE from `${BUS_EVENT_URL}/events/{emergencyId}`; otherwise fall back to the demo timeline. Keep the demo event sequence (`dispatch → agents_dispatching → aed_located → ems_dispatched → drone_launched → triage_complete → handoff_ready → resolved`) intact for the playback path.
3. **`components/OrchestrationDrawer.tsx`** — Part 2 baseline + Part 1 MongoDB persistence badge (additive, not conflicting).
4. **Color map** — Emily's `AgentActivityFeed.tsx` defines: Coordinator=blue, AED=yellow, EMS=red, Drone=cyan, Triage=purple, Handoff=green, Voice=pink, Optimizer=orange. Extract that map to `lib/agentColors.ts` and import from both the activity feed and any dashboard widget that needs it.

Verification:

```bash
npm run build
npm run dev   # in another terminal
```

Then in the browser:

- Open the demo route or any screen that mounts `<AgentActivityFeed events={state.events} />` — expect to see the dispatch → … → resolved sequence with HH:MM:SS timestamps, color-coded agent names, and parallel-event brackets.
- Click `<OrchestrationPill />` — drawer opens, contains `<AgentActivityFeed />` + `<CompactEmergencyMap />`.
- `EventSource('/api/telemetry/test-id?live=1')` from devtools should receive the SSE stream (proxied if the bus event server is up, demo timeline if not).

---

## Part 3 — Replace the schematic map with real Mapbox + the 3 scenarios

The current `/sos/map/page.tsx` (the screen the user just shared) renders a stylized illustration via `components/lifelink/RadiusMap.tsx` — fake grid streets, hardcoded pink concentric "1 mi / 2 mi" rings, and four pins (M, S, J, E) tweened along Bezier curves. The marker positions live in the `HELPER_MAP` constant on lines 14–19 of the same file as `startX/startY` pixel coordinates.

Replace the entire map area (the absolutely-positioned block on lines 74–76 of `app/sos/map/page.tsx`) with the real Mapbox component recovered in earlier work and the three real-coordinate scenarios.

### 3.1 Promote scenarios to a shared module

Move the `SCENARIOS` definition from `lib/useEmergencyTelemetry.ts` into a new `lib/scenarios.ts` so the map page and the bus can import the same data.

```ts
// lib/scenarios.ts
export type Scenario = {
  id: 'royce-hall' | 'pauley-pavilion' | 'bruin-walk';
  label: string;
  narrative: string;
  patient: { lat: number; lon: number; address: string };
  // helpers/AEDs/EMS unit start positions for this scenario, real lat/lon
  helpers: Array<{ id: string; name: string; role: string; lat: number; lon: number; tier?: 1 | 2 }>;
  aeds: Array<{ id: string; name: string; lat: number; lon: number }>;
  ems: { lat: number; lon: number; unit: string };
};

export const SCENARIOS: Record<Scenario['id'], Scenario> = {
  'royce-hall': {
    id: 'royce-hall',
    label: 'Royce Hall Collapse',
    narrative: 'Student collapses during a lecture inside Royce Hall.',
    patient: { lat: 34.0727, lon: -118.4421, address: 'Royce Hall, UCLA' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',
        lat: 34.0732, lon: -118.4438 },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer',
        lat: 34.0721, lon: -118.4408 },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',
        lat: 34.0738, lon: -118.4415 },
    ],
    aeds: [
      { id: 'aed-powell',  name: 'Powell Library AED', lat: 34.0716, lon: -118.4419 },
      { id: 'aed-kaplan',  name: 'Kaplan Hall AED',    lat: 34.0729, lon: -118.4404 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
  'pauley-pavilion': {
    id: 'pauley-pavilion',
    label: 'Pauley Pavilion Game',
    narrative: 'Fan goes into cardiac arrest during a Pauley Pavilion basketball game.',
    patient: { lat: 34.0703, lon: -118.4470, address: 'Pauley Pavilion, UCLA' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',
        lat: 34.0710, lon: -118.4458 },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer',
        lat: 34.0698, lon: -118.4480 },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',
        lat: 34.0712, lon: -118.4475 },
    ],
    aeds: [
      { id: 'aed-pauley',  name: 'Pauley Pavilion AED', lat: 34.0701, lon: -118.4468 },
      { id: 'aed-jdmorgan',name: 'J.D. Morgan Center AED', lat: 34.0712, lon: -118.4458 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
  'bruin-walk': {
    id: 'bruin-walk',
    label: 'Bruin Walk Incident',
    narrative: 'Jogger collapses on Bruin Walk near Ackerman Union.',
    patient: { lat: 34.0710, lon: -118.4445, address: 'Bruin Walk near Ackerman' },
    helpers: [
      { id: 'marcus', name: 'Marcus', role: 'CPR Tier 2',
        lat: 34.0716, lon: -118.4438 },
      { id: 'sarah',  name: 'Sarah',  role: 'AED bringer',
        lat: 34.0703, lon: -118.4452 },
      { id: 'jordan', name: 'Jordan', role: 'CPR Tier 1',
        lat: 34.0708, lon: -118.4458 },
    ],
    aeds: [
      { id: 'aed-ackerman', name: 'Ackerman Union AED', lat: 34.0705, lon: -118.4450 },
      { id: 'aed-kerckhoff',name: 'Kerckhoff Hall AED', lat: 34.0708, lon: -118.4441 },
    ],
    ems: { lat: 34.0759, lon: -118.4392, unit: 'LAFD ALS Rescue 37' },
  },
};
```

`lib/useEmergencyTelemetry.ts` should now `import { SCENARIOS } from '@/lib/scenarios'` instead of declaring its own. Don't change the playback timeline.

### 3.2 Replace the schematic on `/sos/map/page.tsx`

In `app/sos/map/page.tsx`:

- Delete the `HELPER_MAP` constant (lines 14–19) and the pixel-coordinate logic that builds `liveHelpers` (lines 32–48).
- Read the active scenario from sessionStorage (set by Task 3's scenario picker) or default to `royce-hall`.
- Replace the `<RadiusMap mode="live" helpers={liveHelpers}/>` block (lines 74–76) with the real Mapbox component:

```tsx
import dynamic from 'next/dynamic';
const ScenarioMap = dynamic(() => import('@/components/lifelink/ScenarioMap'), { ssr: false });

// inside the component, replace lines 74-76 with:
<div style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 230 }}>
  <ScenarioMap scenarioId={scenarioId} flow={flow} />
</div>
```

- Keep the bottom sheet (Live responders list + "Open CPR guide →" CTA) exactly as it is — it's already wired to `useHelperFlow()` and renders correctly. Only the map area changes.

### 3.3 Build `components/lifelink/ScenarioMap.tsx`

A new client component that renders the real Mapbox map for a given scenario, sized to fit the absolute container.

Requirements:

- Use `react-map-gl/mapbox` (`Map`, `Marker`, `Source`, `Layer`) — same imports as `components/DemoEmergencyMap.tsx`.
- Read `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`. If missing, render a one-line warning banner "Mapbox token missing — set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local" and a Leaflet fallback via `components/NearbyAedMap.tsx`. Don't crash.
- Center on `SCENARIOS[scenarioId].patient` with `zoom: 15.5, pitch: 0`.
- Render:
  - **Patient marker** at `patient.lat/lon` — red pulsing circle with "YOU" label (matching the screenshot).
  - **Helper markers** — circle with helper initial (M/S/J), color per helper.color from `useHelperFlow`. Marker for `ems` should be a square ambulance icon.
  - **AED markers** — red square with the heart-with-AED glyph, copy the icon used in the screenshot's `aed-use-guide.png` style.
  - **Coverage rings** — concentric circles at 0.5 mi, 1 mi, 2 mi around the patient (use `@turf/circle`, render via `Source`+`Layer` like `DemoEmergencyMap.tsx` does on lines 40–58).
  - **Route lines** — for each helper currently `state !== 'queued' && state !== 'notified'`, draw a dashed line from helper to patient. Color the line per helper.
  - Live ETA labels above each helper marker, taken from `flow.rows[i].rowEtaText`.
- The map is read-only (no panning needed for the demo, but `NavigationControl` is fine).

Keep the visual language consistent with the cream-and-crimson LifeLink theme: use Mapbox's `mapbox://styles/mapbox/light-v11` style, override water/road colors lightly via inline `style` if needed.

### 3.4 Wire the scenario picker

If `app/demo/page.tsx` (recovered earlier from `143bcc7`) is in place, its `DemoControls` already lets you pick a scenario. Make picking a scenario:

1. Write the scenario id to `sessionStorage.setItem('cardiaclink:scenarioId', id)`.
2. POST `{ emergency_id, scenario_id, location: SCENARIOS[id].patient }` to `/api/emergency/start`.
3. Navigate to `/sos/map` (or whatever the active emergency screen is).

If `app/demo/page.tsx` isn't recovered yet, add a tiny dev-only scenario switcher to the top-right of `/sos/map/page.tsx` that does the same three things. Hide it when `process.env.NODE_ENV === 'production'`.

### 3.5 Verify the map is real

After running `npm run dev`:

- `/sos/map?scenario=royce-hall` shows real UCLA streets, with the patient pin landing on Royce Hall (34.0727, -118.4421) and AED pins at Powell Library and Kaplan Hall.
- Switching to `pauley-pavilion` re-centers on Pauley (34.0703, -118.4470) and the helpers/AEDs move to the matching real coordinates.
- `bruin-walk` centers on Bruin Walk near Ackerman (34.0710, -118.4445).
- The bottom Live Responders sheet still shows Marcus / Sarah / Jordan / EMS with live ETAs from `useHelperFlow` — its layout, copy, and CTA do not change.
- With `NEXT_PUBLIC_MAPBOX_TOKEN` unset, the map area shows the warning banner + Leaflet fallback instead of crashing.

---

## Final acceptance

- `npm run build` passes.
- `npm run lint` is clean for any file you touched.
- `git status` shows recovered files in `lib/mongo/`, `lib/fhir/`, `app/api/handoff/`, `scripts/test-mongo.ts`, `components/AgentActivityFeed.tsx`, `OrchestrationDrawer.tsx`, `OrchestrationPill.tsx`, `EmergencyStatusCards.tsx`, `CompactEmergencyMap.tsx`, plus modifications to `lib/useEmergencyTelemetry.ts`, `app/sos/map/page.tsx`, `app/api/telemetry/[emergencyId]/route.ts`, `lib/scenarios.ts` (new), `components/lifelink/ScenarioMap.tsx` (new).
- Print a short runbook at the end:
  - How to set `NEXT_PUBLIC_MAPBOX_TOKEN`, `MONGODB_URI`, `MONGODB_DB` in `.env.local`.
  - How to run `npm run test:mongo` and how to run a scenario end-to-end.
  - The 3 scenario URLs (`/sos/map?scenario=royce-hall`, `?scenario=pauley-pavilion`, `?scenario=bruin-walk`).

If any conflict between Part 1 and Part 2 is non-obvious, stop and ask — don't guess. Both parts touch `lib/useEmergencyTelemetry.ts` and `components/OrchestrationDrawer.tsx`.
