# Claude Code Prompt — Wire Fetch.ai bus to the new UI + build a backend dashboard

Paste the block below into Claude Code from the project root (`/Users/emilysun/Downloads/CardicLinkNew-master`).

---

## Context for Claude Code

You are working in a CardiacLink emergency-response app. There are **three runtimes** that already exist but aren't fully wired together:

1. **Next.js frontend** (`app/`, `components/`, `lib/`) — App Router. The new UI lives in `components/lifelink/` (Screen.tsx, CallScreen.tsx, IncomingCallTrigger.tsx, callState.ts, Icon.tsx) and was just rebuilt. Routes of interest: `/`, `/sos/*`, `/helper/*`, `/patient/*`, `/profile`.
2. **FastAPI backend** (`backend/main.py`) — handles Twilio voice/SMS, patient profile handoff, volunteer responses. Runs on `:8000`.
3. **Fetch.ai uAgents bus** (`bus/`) — 8 uAgents (Coordinator, Voice, AED, EMS, Handoff, Triage, Optimizer, Drone) launched together via `bus/scripts/run_all.py`. The Coordinator uses Anthropic Claude for reasoning and talks to specialists over the Chat Protocol with Almanac discovery.

What's already partially wired:
- `app/api/emergency/start/route.ts` streams Server-Sent Events from `lib/agents/coordinator.ts`.
- `app/api/telemetry/[emergencyId]/route.ts` is an SSE stub that's supposed to surface real bus events but currently emits demo telemetry.
- `lib/useEmergencyTelemetry.ts` and `lib/useBusTelemetry.ts` consume those streams.
- `components/CoordinatorPanel.tsx`, `AgentCard.tsx`, `AgentActivityFeed.tsx`, `OrchestrationPill.tsx`, `OrchestrationDrawer.tsx` already render orchestration UI but read demo data.

What's missing:
- The Fetch.ai bus doesn't actually publish events the Next.js API can subscribe to. The new `components/lifelink/` UI doesn't show any bus state.
- There's no way for the developer to verify the FastAPI backend or the bus is running without poking at terminal logs.

---

## Task 1 — Route Fetch.ai bus events to the frontend

Goal: when an emergency fires from the new UI, the frontend should display **live, real** specialist activity coming out of the Fetch.ai bus (not demo telemetry), alongside the existing Claude reasoning stream.

Do the following:

1. **Add an event sink to the bus.** In `bus/shared/`, add `event_bus.py` that exposes `publish(emergency_id, event)` and `subscribe(emergency_id)` (async generator). Back it with an in-process `asyncio.Queue` per emergency_id for local dev, plus an optional Redis pub/sub backend toggled by `BUS_REDIS_URL`. Each agent (`bus/coordinator/agent.py`, every file in `bus/specialists/*.py`) should call `publish` whenever it (a) receives a request, (b) returns a result, (c) errors, with payload `{ts, emergency_id, agent, capability, phase: "request"|"result"|"error", summary, data}`.

2. **Expose the sink to Next.js.** Add a small FastAPI sidecar in `bus/scripts/event_server.py` (uvicorn on `:8010`) with one endpoint: `GET /events/{emergency_id}` returning text/event-stream. It calls `subscribe(emergency_id)` and forwards each event as an SSE message. Update `bus/scripts/run_all.py` to spawn it alongside the Bureau.

3. **Replace the telemetry stub in Next.js.** Rewrite `app/api/telemetry/[emergencyId]/route.ts` to proxy SSE from `process.env.BUS_EVENT_URL ?? "http://localhost:8010"`. Keep the existing event shape compatible with `lib/useBusTelemetry.ts`; add new fields (`agent`, `capability`, `phase`) without breaking old consumers.

4. **Surface the events in the new UI.** In `components/lifelink/Screen.tsx` (or whichever file is the active emergency screen — check git log to confirm), mount `useBusTelemetry(emergencyId)` and render an Agent Activity strip that shows each of the 8 agents' latest phase + summary. Reuse `components/AgentCard.tsx`, but wire it to real telemetry. The Coordinator's Claude reasoning should keep streaming through the existing `useEmergencyTelemetry` hook unchanged.

5. **Update the env example.** Add `BUS_EVENT_URL=http://localhost:8010` to `.env.local.example`. Add `BUS_REDIS_URL=` (empty by default) to `bus/.env.example`.

6. **Verify.** Add a `bus/scripts/smoke_publish.py` that fires a fake emergency through the Coordinator and prints all events received from `:8010/events/{id}`. Document the run sequence in `bus/README.md`.

## Task 2 — Backend status dashboard

Goal: a single page at `/dev/dashboard` that tells the developer at a glance whether each runtime is alive and healthy. This is a dev tool, not a user surface.

Do the following:

1. **Health endpoints.**
   - `backend/main.py`: add `GET /health` returning `{status, version, twilio_configured, textbelt_configured, uptime_s, last_emergency}`.
   - `bus/scripts/event_server.py`: add `GET /health` returning `{status, agents: [{name, address, capability, last_heartbeat}], uptime_s}`. Heartbeats: have each agent push `{phase: "heartbeat"}` to the event bus every 5 s.
   - Next.js: add `app/api/health/route.ts` that returns Next status + fans out to the FastAPI and bus health endpoints (server-side fetch, 1.5 s timeout each) and aggregates `{next, backend, bus}`.

2. **Dashboard page.** Create `app/dev/dashboard/page.tsx` (client component) using existing UI primitives in `components/ui/` (`card.tsx`, `badge.tsx`, `button.tsx`). Layout:
   - Header row: three big status pills — Next.js / FastAPI / Fetch.ai bus — green/yellow/red driven by `/api/health`.
   - Agents grid: 8 cards, one per uAgent, showing capability, address (truncated), last heartbeat (relative time), and phase of the most recent event. Use `components/AgentCard.tsx` if it fits; otherwise build inline.
   - Recent events log: tail the last 50 bus events across all emergencies. Add a filter input. Use a virtualized list if the dependency is already present; otherwise plain `<div>` rows.
   - Live emergency switcher: dropdown of active `emergency_id`s (from a new `GET /emergencies` on the bus event server) so the operator can pin the log to one.
   - Manual triggers: buttons to (a) POST `/api/emergency/start` with a synthetic id, (b) POST `backend/api/emergency/trigger` with a demo payload. Show the response inline.
   - Auto-refresh every 3 s; pause toggle.

3. **Don't expose this in production.** In `app/dev/dashboard/page.tsx`, return a 404-style message if `process.env.NODE_ENV === "production"` and no `?devKey=` matches `process.env.DEV_DASHBOARD_KEY`.

4. **Wire it into navigation.** Add a tiny "🩺 dev" link in `app/layout.tsx` that's only rendered when `process.env.NODE_ENV !== "production"`.

## Task 3 — Restore the Mapbox UI and migrate the 3 use cases

Goal: bring back the Mapbox-based demo UI that existed before commit `9093e93` (the "Merge backend integration + ship LifeLink role-organized design" commit on 2026-04-25), and re-attach the three emergency scenarios (Royce Hall Collapse, Pauley Pavilion Game, Bruin Walk Incident) so the dashboard can drive any of them through the new bus + backend wiring from Tasks 1 and 2.

Context for Claude Code:
- The previous demo route lived at `app/demo/page.tsx` and was deleted in commit `9093e93`. Recover its content with `git show 143bcc7:app/demo/page.tsx` (and sibling files: `git show 143bcc7:app/volunteer/map/page.tsx`, `git show 143bcc7:app/emergency/location/page.tsx`, `git show 143bcc7:app/emergency/dispatch/page.tsx`).
- The Mapbox/Leaflet components are still in the repo but orphaned — no file currently imports them. Reuse, don't rewrite: `components/EmergencyMap.tsx`, `components/DemoEmergencyMap.tsx`, `components/LocationMap.tsx`, `components/AEDMap.tsx`, `components/NearbyAedMap.tsx`, `components/EmergencyStatusCards.tsx`, `components/OrchestrationDrawer.tsx`, `components/AgentActivityFeed.tsx`, `components/DemoControls.tsx`.
- The three scenarios are already defined in `lib/useEmergencyTelemetry.ts` (`SCENARIOS` object): `royce-hall`, `pauley-pavilion`, `bruin-walk` — keep those IDs.

Do the following:

1. **Recover the previous demo page.** Recreate `app/demo/page.tsx` based on the version in commit `143bcc7`. Dark theme, full-screen layout: left sidebar with `DemoControls` (scenario selector) + `AgentActivityFeed`; right side rendering `DemoEmergencyMap`. Footer credit: "Fetch.ai uAgents + Mapbox". Do not blindly copy — update imports to current paths, replace any references to deleted components (`CompactEmergencyMap`) with the live equivalent, and TypeScript-check it.

2. **Make the three scenarios first-class.** Move the `SCENARIOS` definition out of `lib/useEmergencyTelemetry.ts` into `lib/scenarios.ts` so other components can import it. Add a `Scenario` type with `{id, label, location: {lat, lon, label}, narrative, expectedAgents: string[]}`. Keep the existing three:
   - `royce-hall` — "Student collapses during lecture at Royce Hall" (34.0727, -118.4421)
   - `pauley-pavilion` — "Fan goes into cardiac arrest during a Pauley Pavilion game" (34.0703, -118.4470)
   - `bruin-walk` — "Jogger collapses on Bruin Walk near Ackerman" (34.0710, -118.4445)
   Do not introduce new scenarios in this task.

3. **Wire scenarios end-to-end.** When the user picks a scenario in `DemoControls`:
   - POST `{emergency_id, scenario_id, location}` to `/api/emergency/start` (the SSE route from Task 1).
   - The bus Coordinator (`bus/coordinator/agent.py`) should accept `scenario_id` and seed the run — pre-set patient location, expected AED hex, and the scripted narrative beats. Add a `bus/shared/scenarios.py` mirroring the TS file so the Python side has the same canonical data.
   - The bus event server (Task 1) tags every published event with `scenario_id` so `app/dev/dashboard/page.tsx` can filter by scenario.

4. **Replace the current home page entry points.** Update `app/page.tsx` so the role landing screens link into the recovered Mapbox flow:
   - Guest → `/emergency/location` (recovered) → `/emergency/dispatch` (recovered) → existing `/sos/cpr/*` flow.
   - Volunteer → `/volunteer/map` (recovered, Leaflet + AED retrieval card with "I Got the AED ✓" CTA).
   - Patient → unchanged (`/patient/hardware`, `/patient/contacts`).
   The new lifelink card UI on `app/page.tsx` stays — only the destination routes change. If Claude Code thinks any of the LifeLink screens conflict with the recovered routes, it must ask before deleting anything from `components/lifelink/`.

5. **Switch the new emergency screen to the Mapbox view.** In `components/lifelink/Screen.tsx` (or whichever screen Task 1 step 4 mounted `useBusTelemetry` on), replace the placeholder map area with `<DemoEmergencyMap scenarioId={...} />`. Keep the bus telemetry strip from Task 1 above or below the map.

6. **Mapbox token handling.** Confirm `NEXT_PUBLIC_MAPBOX_TOKEN` is read in every Mapbox component and gracefully falls back to the Leaflet variant (`NearbyAedMap` for AEDs, `LocationMap` for the location picker) when the token is missing. Add a one-line warning banner on `/demo` if the token is absent.

7. **Smoke checks.**
   - `/demo` loads, all three scenarios are in the picker, picking each fires a real bus run that shows up in `/dev/dashboard`.
   - `/volunteer/map` renders the AED card and the "I Got the AED" CTA dispatches the existing `/api/volunteer/respond/{phone}` endpoint.
   - `/emergency/location` and `/emergency/dispatch` render and forward to the existing CPR flow at `/sos/cpr/tutorial`.
   - `npm run build` passes.

8. **Cleanup.** Any LifeLink-only file that becomes truly unreachable after this swap should be moved to `components/lifelink/_archive/` rather than deleted, so we can roll back. Do not touch `components/ui/`.

## Task 4 — Wire the remaining pages to the backend

Goal: today the LifeLink flow is ~95% frontend simulation. After Tasks 1–3 give us a real bus + dashboard + Mapbox UI, this task closes the data loop so every screen reads from FastAPI / the bus instead of hardcoded fixtures, `sessionStorage`, or time-based fakes.

For each gap below, the file + line is where the mock lives today and the arrow is the target endpoint. If the target endpoint doesn't exist yet, create it in `backend/main.py` matching the existing FastAPI style.

### Existing FastAPI endpoints not called from anywhere — wire these first

- `POST /api/emergency/trigger` — call from `app/sos/page.tsx:11` (`startSosTimer`) and from the HOLD-to-fire handler in `app/page.tsx` (HomeGuest). Pass `{location, patient_id?}`, await `emergency_id`, persist alongside the existing `sessionStorage` value so server is authoritative.
- `GET /api/emergency/status` — replace `useDispatchElapsed()` in `components/lifelink/sosTimer.ts:53–71` with a poller (or bus SSE subscription from Task 1) so timers survive refresh and clock skew.
- `GET /api/patient/profile` — call from `app/sos/cpr/assist/page.tsx:253–265` (replaces `DEMO_FALLBACK_PROFILE`), `app/patient/contacts/page.tsx:31–33`, `app/patient/hardware/page.tsx:17–22`. Hide the "DEMO" label once a real profile loads.
- `POST /api/patient/profile` — used by `app/patient/contacts/page.tsx:49–55` (the "Share live ECG" toggle) and the patch-handoff path in `app/sos/cpr/assist/page.tsx`.
- `POST /api/volunteer/respond/{phone}` — call from `app/helper/code-red/page.tsx` accept handler and from `app/helper/pickup-aed/page.tsx` "I Got the AED" button.
- `POST /api/emergency/reset` — call from `app/sos/complete/page.tsx` exit and from any "reset demo" button on `app/page.tsx`.

### Hardcoded data that needs to become live

- `app/sos/cpr/assist/page.tsx`
  - `253–265`: `DEMO_FALLBACK_PROFILE` (John Doe) → `GET /api/patient/profile`.
  - `358–360`: voice-cue strings → stream from the Voice agent on the bus (capability `cardiaclink-voice`).
  - `449`: `liveRate` derived locally → POST every 10 s to a new `POST /api/emergency/{id}/cpr-metrics`.
  - `534`: "92%" recoil → real sensor metric from the same endpoint.
- `app/sos/dispatch/conscious/page.tsx:24–30`: "0:08", "0.3 mi", "3 helpers alerted" → `GET /api/emergency/status`.
- `app/sos/dispatch/unconscious/page.tsx:16–34, 119`: timer + helper rows + "123 Main St · Westwood Plaza" → `GET /api/emergency/{id}/helpers` (new endpoint, see below) plus `GET /api/emergency/status` for address.
- `app/sos/complete/page.tsx:13–18, 31, 57–59, 91–92, 101`: TIMELINE_FRACTIONS, compression count (55% × 110 BPM), "78% in ideal band", "David Tanaka notified", "Ronald Reagan UCLA · ECMO ready" → reconstruct from `GET /api/emergency/{id}/timeline` (new endpoint that aggregates bus events from Task 1).
- `app/sos/map/page.tsx:14–19`: `HELPER_MAP` start positions → `GET /api/emergency/{id}/helpers`, plus SSE updates from the bus event server.
- `app/helper/code-red/page.tsx:19, 27–35`: case ID, "Eleanor T., 67", AED distance/ETA → real emergency + patient + AED data from the bus AED agent.
- `app/helper/pickup-aed/page.tsx:33–34, 40` and `app/helper/direct/page.tsx:33–34, 40`: hardcoded distances and turn instructions ("Right onto Olympic Blvd") → backend route proxy that calls Mapbox/Google Directions and returns turn-by-turn (new `POST /api/route` endpoint, keeps the API key server-side).
- `app/patient/contacts/page.tsx:31–33`: David Tanaka / Mei Tanaka / Dr. Patel contacts → `GET /api/patient/contacts` (new endpoint).
- `app/patient/hardware/page.tsx:63–66`: "Last reading 74 BPM, 142/500 cycles, 4 days adhesive" → real patch telemetry from `GET /api/patient/hardware` (new endpoint) and/or the existing Web Serial path.
- `app/profile/page.tsx:101, 137–139, 158–160, 204`: Marcus Kim, response stats, certs, email → `GET /api/volunteer/profile` (new endpoint, look up by authenticated user).
- `components/lifelink/helperFlow.ts:40–79, 97–143`: HELPERS array + `deriveRowState()` time-based simulation → subscribe to `GET /api/emergency/{id}/helpers` SSE; remove the simulated timeline once real events flow.
- `components/lifelink/sosTimer.ts:4–35`: sessionStorage-only timers → mirror to backend on every state transition.
- `components/lifelink/demoRole.ts:6–13`: role in localStorage → keep local cache but sync to `GET/POST /api/user/role` on login.
- `lib/useEmergencyTelemetry.ts:663`: POSTs to `/api/handoff` which does not exist → create `POST /api/emergency/{id}/handoff` accepting a FHIR R4 bundle.

### New backend endpoints to create

- `POST /api/emergency/{id}/cpr-metrics` — accept `{rate, depth, recoil_pct, count, ts}`; append to per-emergency log.
- `GET /api/emergency/{id}/helpers` — return current helper roster `[{name, phone, state, eta_s, location}]`; expose an SSE variant for live updates that replays bus events.
- `GET /api/emergency/{id}/timeline` — return ordered events used by the post-event recap on `/sos/complete`.
- `GET /api/patient/contacts` + `POST /api/patient/contacts/{id}` — emergency contact CRUD.
- `GET /api/patient/hardware` — patch status (battery, cycles, adhesive replace date).
- `GET /api/volunteer/profile` — volunteer record (name, stats, certs, email).
- `POST /api/route` — server-side proxy to Mapbox/Google Directions, returns turn-by-turn JSON.
- `POST /api/emergency/{id}/handoff` — FHIR bundle persistence; optional forward to a hospital FHIR endpoint.

### Acceptance

- `grep -rE "TODO|FIXME|MOCK|DEMO_FALLBACK|hardcode" app/ components/lifelink/` returns zero results that aren't either intentional placeholders for empty server state or comments inside `_archive/`.
- Refreshing any `/sos/*` page mid-emergency keeps the correct timer, helper roster, and address (proves server-authoritative state).
- The "Endpoints defined but unused by frontend" list above is empty — every FastAPI route has at least one frontend caller.
- `/dev/dashboard` (from Task 2) shows the new endpoints under a "Backend coverage" panel: green dot if hit at least once this session, gray otherwise.

## Task 5 — Restore the deleted MongoDB + FHIR persistence

Goal: bring back the MongoDB / FHIR R4 handoff implementation that was added across commits `f8bca54 … 0ca0794` (Apr 25 2026, by Emily) and then deleted in a single commit **`7a8b8fd`** ("chore: remove mongodb dependency and related code") on the same day. None of this code exists in HEAD; it lives only in git history.

The last commit that contained the full working implementation is **`0ca0794`**. Restore from there.

Files to recover verbatim from `0ca0794`:

```bash
git show 0ca0794:lib/mongo/client.ts            > lib/mongo/client.ts
git show 0ca0794:lib/fhir/types.ts              > lib/fhir/types.ts
git show 0ca0794:lib/fhir/buildBundle.ts        > lib/fhir/buildBundle.ts
git show 0ca0794:app/api/handoff/route.ts       > app/api/handoff/route.ts
git show '0ca0794:app/api/handoff/[id]/route.ts' > app/api/handoff/[id]/route.ts
git show 0ca0794:scripts/test-mongo.ts          > scripts/test-mongo.ts
```

Files to merge changes back into (do NOT overwrite — these have moved on since `0ca0794`, so cherry-pick the MongoDB-related blocks only):

- `lib/useEmergencyTelemetry.ts` — re-add the `persistence` state field and the fire-and-forget POST to `/api/handoff` when `phase === 'resolved'`. Look at `git show 0ca0794:lib/useEmergencyTelemetry.ts` and diff against current HEAD.
- `components/OrchestrationDrawer.tsx` — re-add the footer badge that shows "FHIR R4 Bundle stored in MongoDB Atlas · id: …" with green/yellow/red dots driven by `persistence.status`.
- `app/globals.css` — re-add the ~31 lines of badge animation styles.
- `package.json` — re-add `"mongodb": "^7.2.0"` to dependencies and `"test:mongo": "tsx --env-file=.env.local scripts/test-mongo.ts"` to scripts.
- `.env.local.example` — re-add `MONGODB_URI=` and `MONGODB_DB=cardiaclink`.

What was stored:
- Database `cardiaclink`, collection `handoff_bundles`.
- Each document: `{ _id, bundle: <FHIR R4 Bundle>, scenario, receivingHospital, storedAt }`.
- Bundle entries: anonymous `Patient`, `Encounter`, 3–4 `Observation`s (heart rate, compressions, AED status, drone ETA), one `Procedure` (CPR).

Reconciliation with the rest of this prompt:
- Task 4 currently calls for a new `POST /api/emergency/{id}/handoff` on the FastAPI side. Decide and document one of the two:
  - **Option A (recommended):** keep the Next.js `/api/handoff` route restored here as the canonical handoff sink (it already builds and persists FHIR bundles), and have the FastAPI `/api/emergency/{id}/handoff` from Task 4 simply forward to it. Drop the duplicate from Task 4's deliverables.
  - **Option B:** move handoff persistence into FastAPI using `motor` (async MongoDB) and delete the Next.js route again. Only do this if the team explicitly wants Python-side persistence.
  Default to Option A unless the user says otherwise.
- The `/dev/dashboard` from Task 2 should add a "MongoDB" pill: green when `MONGODB_URI` is set and the last `db.command({ping: 1})` succeeded, yellow when unconfigured (graceful degradation), red on error.

Verification:
- `npm install` succeeds with the restored `mongodb@^7.2.0`.
- `npm run test:mongo` prints `Mongo ping: { ok: 1 }` when `MONGODB_URI` is set, and exits cleanly when it isn't.
- After running the Royce Hall scenario from Task 3 to completion, the OrchestrationDrawer footer flips to green and shows a real ObjectId, and `GET /api/handoff` returns at least one entry.
- If the original MongoDB Atlas cluster is still alive, the `handoff_bundles` collection there should be checked — old data persists independently of the repo.

Investigate before restoring: run `git log 7a8b8fd -1 --stat` and `git show 7a8b8fd` first, in case the deletion was intentional and tied to a specific issue. If a good reason surfaces (e.g. credentials leak, license concern), surface it instead of restoring blindly.

## Task 6 — Restore Emily's Fetch.ai agent flow live stream

Goal: bring back the live agent-activity stream Emily built across 7 phases on **2026-04-25 02:20–02:32** (commits `9cc6d7b` → `a404c0a` → `364a3c2` → `5cbdca8` → `676a934` → `143bcc7` → `7cc65f5`). It is **not** a destructive deletion like Task 5 — it's an orphaned branch. The merge commit **`9093e93`** at 14:13:49 chose the parallel LifeLink-design branch and dropped Emily's telemetry work. Her commits are reachable via `git log --all` and `git reflog`, just not on HEAD.

The feature is a real-time Fetch.ai bus event stream with: SSE endpoint, telemetry React hook with playback/live modes, color-coded agent activity feed (Coordinator/AED/EMS/Drone/Triage/Handoff/Voice/Optimizer) with parallel-event grouping and auto-scroll, plus status cards / orchestration pill / drawer / compact map.

Files to recover (use `git show <hash>:<path> > <path>`):

```bash
git show 7cc65f5:'app/api/telemetry/[emergencyId]/route.ts' > app/api/telemetry/[emergencyId]/route.ts
git show a404c0a:lib/useEmergencyTelemetry.ts                > lib/useEmergencyTelemetry.ts
git show 9cc6d7b:components/AgentActivityFeed.tsx           > components/AgentActivityFeed.tsx
git show 364a3c2:components/OrchestrationDrawer.tsx         > components/OrchestrationDrawer.tsx
git show 364a3c2:components/EmergencyStatusCards.tsx        > components/EmergencyStatusCards.tsx
git show 364a3c2:components/OrchestrationPill.tsx           > components/OrchestrationPill.tsx
git show 364a3c2:components/CompactEmergencyMap.tsx         > components/CompactEmergencyMap.tsx
```

Reconciliation with the rest of this prompt:

- The current `app/api/telemetry/[emergencyId]/route.ts` is a thinner stub. Replace it with Emily's 106-line version — but Task 1 step 3 still applies: in addition to the demo event sequence, proxy SSE from the bus event server when the bus is reachable, and fall back to the demo timeline when it isn't. Treat Emily's file as the new baseline, then layer the Task 1 proxy logic onto it.
- The current `lib/useEmergencyTelemetry.ts` may have been touched by HEAD work (the MongoDB POST to `/api/handoff` from Task 5 lives in this file). Do a 3-way merge: take Emily's 545-line version as the base, re-apply the Task 5 persistence block, and re-apply any LifeLink-specific glue HEAD needed.
- `OrchestrationDrawer.tsx` references a `CompactEmergencyMap` that's also being recovered here — restore both together so the drawer compiles.
- The active emergency screen from Task 1 step 4 should mount `<AgentActivityFeed events={state.events} />` plus `<OrchestrationPill />` (which opens `<OrchestrationDrawer />`). On `/demo` (Task 3), use the same components in the left sidebar.
- Color coding from Emily's component must stay: Coordinator=blue, AED=yellow, EMS=red, Drone=cyan, Triage=purple, Handoff=green, Voice=pink, Optimizer=orange. Map agent names to these colors centrally so the dev dashboard (Task 2) can reuse them.

Verification:

- After running the Royce Hall scenario from Task 3, the agent activity feed shows the dispatch → agents_dispatching → aed_located → ems_dispatched → drone_launched → triage_complete → handoff_ready → resolved sequence with timestamps and parallel-event brackets.
- Switching `useEmergencyTelemetry` to `mode: 'live'` opens an `EventSource` to `/api/telemetry/{id}` and the same UI updates from real bus events (Task 1).
- `OrchestrationPill` shows the live event count and opens `OrchestrationDrawer` containing `AgentActivityFeed` + `CompactEmergencyMap`.
- `npm run build` passes.

Investigate before restoring: run `git log 9093e93 -1 --stat` to confirm it's the merge that dropped these commits, and `git reflog --all | head -80` to verify Emily's commits are still reachable. Don't blindly cherry-pick if a conflicting refactor on HEAD has already replaced this functionality with something equivalent.

## Constraints

- **Do not break the existing demo flow.** `/sos/*` must keep working with or without the bus running. `useBusTelemetry` should fall back to demo events when the bus event server is unreachable.
- **Match existing style.** Tailwind + the shadcn primitives already in `components/ui/`. Don't introduce a new component library.
- **Keep secrets out.** No real Anthropic / Twilio / ElevenLabs keys in committed files. Update `.env.local.example` and `bus/.env.example`, never `.env`.
- **TypeScript strict.** Run `npm run lint` at the end and fix anything you introduced.
- **Python style.** Match the existing FastAPI + uagents code in `backend/main.py` and `bus/coordinator/agent.py`.
- **Preserve git history.** Use `git show <hash>:<path>` to recover deleted files; don't paste random reconstructions.

## Deliverables checklist

- [ ] `bus/shared/event_bus.py` with publish/subscribe
- [ ] All 8 agents in `bus/coordinator/` and `bus/specialists/` publish lifecycle events
- [ ] `bus/scripts/event_server.py` SSE + health endpoints
- [ ] `bus/scripts/run_all.py` boots the event server alongside the Bureau
- [ ] `app/api/telemetry/[emergencyId]/route.ts` proxies real bus events
- [ ] `components/lifelink/Screen.tsx` (or current active emergency screen) shows live agent activity
- [ ] `backend/main.py` `GET /health`
- [ ] `app/api/health/route.ts` aggregator
- [ ] `app/dev/dashboard/page.tsx` with status pills, agent grid, event log, manual triggers
- [ ] `bus/scripts/smoke_publish.py` end-to-end smoke test
- [ ] `.env.local.example` and `bus/.env.example` updated
- [ ] `npm run lint` clean
- [ ] `app/demo/page.tsx` restored from `143bcc7` with current imports
- [ ] `app/volunteer/map/page.tsx`, `app/emergency/location/page.tsx`, `app/emergency/dispatch/page.tsx` recovered and routed
- [ ] `lib/scenarios.ts` + `bus/shared/scenarios.py` define the 3 canonical scenarios (royce-hall, pauley-pavilion, bruin-walk)
- [ ] `DemoControls` scenario picker drives `/api/emergency/start` and bus Coordinator accepts `scenario_id`
- [ ] `DemoEmergencyMap` mounted on the active emergency screen with bus telemetry strip
- [ ] Leaflet fallback works when `NEXT_PUBLIC_MAPBOX_TOKEN` is missing
- [ ] Removed lifelink files moved to `components/lifelink/_archive/`, none deleted
- [ ] `npm run build` passes
- [ ] Every existing FastAPI endpoint has at least one frontend caller (none orphaned)
- [ ] New endpoints created: `/api/emergency/{id}/cpr-metrics`, `/api/emergency/{id}/helpers` (+ SSE), `/api/emergency/{id}/timeline`, `/api/patient/contacts`, `/api/patient/hardware`, `/api/volunteer/profile`, `/api/route`, `/api/emergency/{id}/handoff`
- [ ] `DEMO_FALLBACK_PROFILE`, `HELPERS` mock array, `HELPER_MAP`, hardcoded ETAs/distances/contacts/profile stats removed
- [ ] Refresh test: page refresh mid-emergency preserves timer + roster + address
- [ ] `helperFlow.ts` time-based simulation replaced with bus SSE subscription
- [ ] MongoDB + FHIR files restored from commit `0ca0794`: `lib/mongo/client.ts`, `lib/fhir/types.ts`, `lib/fhir/buildBundle.ts`, `app/api/handoff/route.ts`, `app/api/handoff/[id]/route.ts`, `scripts/test-mongo.ts`
- [ ] `mongodb@^7.2.0` and `test:mongo` script back in `package.json`; `MONGODB_URI` / `MONGODB_DB` back in `.env.local.example`
- [ ] `useEmergencyTelemetry.ts` posts to `/api/handoff` on resolve; `OrchestrationDrawer.tsx` shows the persistence badge
- [ ] `/dev/dashboard` includes a MongoDB status pill
- [ ] Decision documented: handoff lives in Next.js (Option A) or FastAPI (Option B); no duplicate route
- [ ] Emily's live stream files restored: `app/api/telemetry/[emergencyId]/route.ts` (from `7cc65f5`), `lib/useEmergencyTelemetry.ts` (from `a404c0a`), `components/AgentActivityFeed.tsx` (from `9cc6d7b`), `OrchestrationDrawer.tsx` / `EmergencyStatusCards.tsx` / `OrchestrationPill.tsx` / `CompactEmergencyMap.tsx` (from `364a3c2`)
- [ ] Telemetry route proxies real bus SSE (Task 1) on top of Emily's demo timeline
- [ ] Telemetry hook merges Emily's 545-line version with the Task 5 MongoDB persistence block
- [ ] Active emergency screen + `/demo` mount `<AgentActivityFeed />` and `<OrchestrationPill />`
- [ ] Agent color map (Coordinator/AED/EMS/Drone/Triage/Handoff/Voice/Optimizer) centralized for reuse

After you finish, print a short runbook: how to start FastAPI, the bus, and Next.js in three terminals, then how to open `/dev/dashboard` and confirm everything is green.
