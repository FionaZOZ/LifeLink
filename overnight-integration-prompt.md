# Claude Code overnight prompt — Integrate demo orchestration view with bystander product flow

> Paste everything below the `---` line into Claude Code.
> Run from the repo root: `/Users/emilysun/Downloads/CardicLinkNew-master/`.
> Switch to Opus 4.6 first: `/model claude-opus-4-6`.
> This is a long, multi-phase task. Work through phases sequentially. Commit after each phase so a partial run still leaves the repo in a working state.

---

## CardiacLink — Overnight integration: weave Fetch.ai orchestration into the bystander product

### Mission

CardiacLink today has two parallel surfaces that don't talk to each other:

1. **Product surface** — `/`, `/emergency/location`, `/emergency/dispatch`, `/emergency/cpr`, `/emergency/cpr-hardware`, `/emergency/assessment`, `/emergency/complete`, `/cpr`, `/volunteer/map`. This is the real bystander flow with Twilio-powered 911 dispatch and the metronome-paced CPR coach.
2. **Demo surface** — `/demo`. A standalone judge-facing orchestration view with a Mapbox map and an agent activity feed (recently fixed for Mapbox crashes).

Your mission tonight is to **integrate them** so the Fetch.ai multi-agent orchestration we built in `bus/` becomes **visible inside the bystander flow**, without making the bystander flow technical or noisy. The integration philosophy:

- Bystander sees **calm, structured status cards** during dispatch and CPR. They do NOT see "PARALLEL × 4" brackets or agent IDs. They see "🚑 EMS 5:48 · 🛸 Drone 2:30 · 🏥 UCLA Reagan ready · 👥 5 volunteers alerted."
- A small floating **"🔬 Orchestration" pill button** in the corner of dispatch and CPR screens reveals a slide-in drawer containing the technical detail (PARALLEL bracket activity feed). Opt-in only. Bystanders ignore it; judges and curious users tap it.
- The demo route at `/demo` stays as the full pitch view — same components, full-screen layout.
- Both the bystander surface and the demo surface read from a **single shared telemetry hook** (`useEmergencyTelemetry`, renamed from `useBusTelemetry`). One source of truth.

This is the Sunday demo flow we're optimizing for:

> Judge opens `/`. Big EMERGENCY button. Click → location capture → dispatch screen.
> Dispatch screen shows 4 status cards updating in real time (911 confirmed, EMS dispatching, drone launching, hospital prepped). The judge taps the "🔬 Orchestration" pill in the corner — drawer slides in showing the PARALLEL bracket with Triage / AED / EMS / Drone all firing at the same millisecond, citation to Caputo et al.
> Auto-advance to CPR screen after ~10 seconds. Metronome ticks. Top strip shows live ETAs counting down. The judge taps the same Orchestration pill — drawer reveals continued agent chatter (drone en-route, voice sync active, FHIR handoff ready, Schierbeck Lancet citation).
> THEN the judge opens `/demo` in a second tab to see the full Mapbox 3D pitch view.

### Phases

This is an overnight task. Work through phases sequentially. **At the end of each phase, run `git add -A && git commit -m "phase N: <summary>"`** so a partial completion leaves the repo in a usable state. If you hit a blocker, commit what you have, write a `BLOCKED.md` file at the repo root explaining what's stuck, and skip to the next phase if it's independent.

---

### Phase 0 — Audit and checkpoint (15 minutes)

Read these files end to end before writing any code. Don't skim:

- `app/page.tsx` — home / EMERGENCY button.
- `app/emergency/location/page.tsx` — GPS capture.
- `app/emergency/dispatch/page.tsx` — current dispatch screen (you'll heavily modify this).
- `app/emergency/cpr/page.tsx` — metronome CPR screen (DO NOT modify the metronome, voice, or beat scheduler — only ADD components above and around it).
- `app/emergency/cpr-hardware/page.tsx` — Arduino-paced CPR (don't touch).
- `app/emergency/assessment/page.tsx` — assessment after 2 min (don't touch).
- `app/emergency/complete/page.tsx` — mission complete screen (don't touch).
- `app/demo/page.tsx` — current demo orchestration view.
- `app/api/emergency/start/route.ts` — existing SSE endpoint (used by CoordinatorPanel).
- `lib/useBusTelemetry.ts` — the hook you'll rename and extend.
- `components/CoordinatorPanel.tsx` — current SSE-based agent panel (will be retired in favor of the new drawer).
- `components/AgentActivityFeed.tsx` — already has PARALLEL bracket support (assume the demo-fix prompt has been merged).
- `components/DemoEmergencyMap.tsx` — Mapbox map (used in /demo and as a compact variant in dispatch).
- `components/EmergencyEtaBadge.tsx` — strip of EMS/Drone/Hospital ETAs (will be wired to telemetry).
- `components/Call911Banner.tsx` — sticky red 911 banner.

Then commit a checkpoint: `git add -A && git commit -m "phase 0: pre-integration checkpoint"`. This is your rollback point if something goes wrong.

---

### Phase 1 — Rename hook + add live mode stub (45 minutes)

Goal: a single shared telemetry hook that both surfaces consume, with playback as the safe default and a live-mode stub for future SSE wiring.

1. **Rename `lib/useBusTelemetry.ts` → `lib/useEmergencyTelemetry.ts`.** Update all imports across the codebase (search for `useBusTelemetry` and `'@/lib/useBusTelemetry'`).
2. **Rename the exported hook** function from `useBusTelemetry` to `useEmergencyTelemetry`. Keep all internal types (`AgentEvent`, `ScenarioState`, etc.) and exports identical otherwise.
3. **Add a mode parameter** to the hook:
   ```typescript
   interface UseEmergencyTelemetryOptions {
     mode?: 'playback' | 'live';
     emergencyId?: string;        // required when mode === 'live'
     scenarioId?: string;         // optional — if set in playback mode, auto-runs on mount
   }

   export function useEmergencyTelemetry(options: UseEmergencyTelemetryOptions = {}) {
     const { mode = 'playback', emergencyId, scenarioId } = options;
     // ...
   }
   ```
4. **Playback mode** keeps the existing scenario-driven playback logic.
5. **Live mode** subscribes to SSE from `/api/emergency/start` (or a new `/api/telemetry?emergency_id=X` endpoint if you want to keep that route clean — your judgment). Parse incoming events into the same `AgentEvent` shape so the rest of the UI doesn't care which mode is active. **For Phase 1 you only need a stub** — connect the EventSource, log received chunks to console, and convert ANY incoming events into `AgentEvent`s with `agent: 'Coordinator'` if the parsing fails. We'll polish the parser in Phase 5.
6. **`scenarioId` auto-run**: if mode is playback and a `scenarioId` is provided in options, automatically call `runScenario(scenarioId)` on mount via `useEffect`. This lets the dispatch screen do `useEmergencyTelemetry({ mode: 'playback', scenarioId: 'royce_hall' })` and have telemetry start flowing immediately.
7. Update `app/demo/page.tsx` to use the new name and explicitly opt into playback mode:
   ```typescript
   const { state, runScenario, reset, scenarios } = useEmergencyTelemetry({ mode: 'playback' });
   ```
8. Verify `/demo` still works exactly as before.

Commit: `git add -A && git commit -m "phase 1: rename to useEmergencyTelemetry, add live mode stub"`

---

### Phase 2 — Build shared integration components (90 minutes)

Goal: the visual building blocks that both bystander dispatch and the orchestration drawer will use.

Create these new components (each in its own file):

#### 2a. `components/EmergencyStatusCards.tsx`

A 2×2 responsive grid of status cards reflecting the current orchestration state. Each card has: icon, label (uppercase 10px tracking), value (24px bold tabular-nums), sub-label (11px muted).

```typescript
type CardKey = '911' | 'ems' | 'drone' | 'volunteers' | 'aed' | 'hospital';

interface EmergencyStatusCardsProps {
  state: ScenarioState;       // from useEmergencyTelemetry
  visibleCards?: CardKey[];   // default: ['911', 'ems', 'drone', 'volunteers']
  layout?: 'grid' | 'row';    // grid for dispatch, row for cpr top-strip
}
```

Card content rules (driven entirely by `state`):
- **911**: shows "Confirmed" green ✓ when phase is past `call_received`, with PSAP CAD ID stub. Yellow "Calling…" pulse during `call_received`.
- **EMS**: shows ETA from `state.emsUnits[0]?.eta_minutes`, sub-label "ALS Ambulance · LA County FD" or "Awaiting dispatch" when no unit yet. ETA in `m:ss` format.
- **Drone**: shows ETA from `state.drone?.eta_seconds`, sub-label "UAV-AED · 50 km/h (Schierbeck 2023)" when launched. "Standby" when null.
- **Volunteers**: shows count "5 alerted" with sub-label "PulsePoint Respond pool". Count derives from a synthetic value (3-5 based on emergency location proximity to AED list, you can hardcode 5 for now).
- **AED**: shows nearest AED name + distance (e.g. "Royce Hall · 60m") from `state.nearbyAeds[0]`.
- **Hospital**: shows `state.hospital?.name` shortened (e.g. "Reagan Medical · ECMO ✓").

Color hierarchy: 911 red, EMS red-orange, Drone cyan, Volunteers purple, AED yellow, Hospital green. Match colors used in `AgentActivityFeed.tsx`.

Active state: when an event of that type just arrived (within last 1.5s), pulse a glow ring around the card (`animate-pulse` + ring-2). Use `state.events` to detect.

Layout `grid` is 2×2 with gap-3, full-width cards. Layout `row` is horizontal flex with gap-2, fits at top of CPR screen.

#### 2b. `components/OrchestrationDrawer.tsx`

A right-side slide-in drawer (480px wide), opens when triggered. Contains:

- Header: "🔬 Live Orchestration" + close button + small live/playback indicator.
- Tabs: "Activity" (default) | "Map".
- "Activity" tab: full `AgentActivityFeed` component with PARALLEL bracket rendering (already exists from the demo-fix work).
- "Map" tab: compact `DemoEmergencyMap` (320px tall, no NavigationControl, no legend overlay — minimal version).
- Footer: micro-citation strip "Caputo · Buter · Schierbeck · MDAgents" — small text, muted, but visible.

Trigger: a separate `<OrchestrationPill />` button rendered by the parent. The drawer is controlled by an `open` prop and `onClose` callback. Drawer animates in via Tailwind `transition-transform translate-x-full ↔ translate-x-0`. Backdrop is `bg-black/40 backdrop-blur-sm` covering the rest of the screen — clicking it closes the drawer.

```typescript
interface OrchestrationDrawerProps {
  open: boolean;
  onClose: () => void;
  state: ScenarioState;
  layers?: LayerToggles;       // optional, defaults to all on
}
```

#### 2c. `components/OrchestrationPill.tsx`

A small floating button, fixed position (bottom-right, 16px from edges), 48px round, dark-translucent background with cyan border. Icon: 🔬. Subtle pulse animation when there are new events the user hasn't seen yet (compute `eventsSinceLastOpen` via a ref).

```typescript
interface OrchestrationPillProps {
  onClick: () => void;
  unseenCount?: number;        // optional badge
}
```

When `unseenCount > 0`, show a small red badge with the number. When the drawer opens, the parent should reset this count to 0.

#### 2d. `components/CompactEmergencyMap.tsx`

A compact variant of `DemoEmergencyMap` for embedding in the dispatch screen. Same data sources, but:

- Height fixed at 280px on desktop, 220px on mobile.
- No NavigationControl, no 3D buildings toggle (force `buildings3d: false`).
- No layer-toggle UI — show all relevant layers always (AEDs, coverage, EMS route, drone path, hospital).
- No legend overlay.
- Centered + zoomed to fit emergency + EMS + drone + hospital + nearest AEDs.
- Disable scroll-wheel zoom (the embedded map shouldn't fight with page scrolling).

Reuse the existing `DemoEmergencyMap` rendering logic via composition or copy-paste — your call. If you copy-paste, mark the duplicate clearly with `// COMPACT VARIANT — keep in sync with DemoEmergencyMap.tsx`.

#### Commit

`git add -A && git commit -m "phase 2: shared integration components (status cards, drawer, pill, compact map)"`

---

### Phase 3 — Rebuild the dispatch screen (90 minutes)

Goal: `/emergency/dispatch` becomes the integration linchpin — visible orchestration + status cards + opt-in technical drawer.

1. **Read the existing `app/emergency/dispatch/page.tsx`** carefully. It currently uses `CoordinatorPanel` with SSE polling for 911/volunteer status. **Preserve the Twilio-driven status polling** — don't break the real backend integration. The polling tells us "did 911 actually pick up" — that's real product behavior we want to keep.

2. **New layout**:
   ```
   ┌───────────────────────────────────────────────────────────────┐
   │  [Call911Banner — sticky, persistent]                          │
   ├───────────────────────────────────────────────────────────────┤
   │  Header: "Dispatching response — agents en route"              │
   │  Sub: timestamp · "Powered by Fetch.ai uAgents"                │
   ├───────────────────────────────────────────────────────────────┤
   │  ┌───────────────┐  ┌───────────────┐                          │
   │  │ 911           │  │ EMS           │                          │
   │  │ Confirmed ✓   │  │ 5:48 ETA      │                          │
   │  │ PSAP-LA-37    │  │ ALS Ambulance │                          │
   │  └───────────────┘  └───────────────┘                          │
   │  ┌───────────────┐  ┌───────────────┐                          │
   │  │ Drone         │  │ Volunteers    │                          │
   │  │ 2:30 ETA      │  │ 5 alerted     │                          │
   │  │ UAV-AED       │  │ PulsePoint    │                          │
   │  └───────────────┘  └───────────────┘                          │
   ├───────────────────────────────────────────────────────────────┤
   │  CompactEmergencyMap (280px)                                   │
   │  [emergency pin · drone in flight · EMS approaching · AEDs]    │
   ├───────────────────────────────────────────────────────────────┤
   │  Continue to CPR Coach  →  [auto-advances after 10s]           │
   └───────────────────────────────────────────────────────────────┘
                                                  [🔬 OrchestrationPill]
   ```

3. **Wire up telemetry**:
   ```typescript
   const { state, runScenario } = useEmergencyTelemetry({
     mode: 'playback',
     scenarioId: 'royce_hall',     // for demo; later replace with real emergencyId derivation
   });
   ```
   Use `state` to drive `<EmergencyStatusCards state={state} visibleCards={['911', 'ems', 'drone', 'volunteers']} layout="grid" />` and `<CompactEmergencyMap state={state} />`.

4. **Preserve existing Twilio polling** as-is. If `state.phase` from telemetry says EMS is dispatched but Twilio says 911 is still ringing, defer to Twilio (the real-world signal beats the simulation). Show 911 card based on Twilio status, the rest from `state`.

5. **Auto-advance**: after `state.phase === 'drone_launched'` AND at least 10 seconds elapsed in dispatch, navigate to `/emergency/cpr`. Use `router.push('/emergency/cpr')`. Provide an explicit "Continue to CPR Coach" button as fallback.

6. **Add the `OrchestrationPill` + `OrchestrationDrawer`** at the bottom of the layout:
   ```tsx
   const [drawerOpen, setDrawerOpen] = useState(false);
   const [unseenSinceOpen, setUnseenSinceOpen] = useState(0);

   useEffect(() => {
     if (!drawerOpen) {
       setUnseenSinceOpen(prev => prev + 1);
     }
   }, [state.events.length]);

   return (
     <>
       {/* ... main layout ... */}
       <OrchestrationPill
         onClick={() => { setDrawerOpen(true); setUnseenSinceOpen(0); }}
         unseenCount={unseenSinceOpen}
       />
       <OrchestrationDrawer
         open={drawerOpen}
         onClose={() => setDrawerOpen(false)}
         state={state}
       />
     </>
   );
   ```

7. **Retire `CoordinatorPanel`** — but DO NOT delete the file. Comment out its import at the top of dispatch with a note: `// CoordinatorPanel retired in favor of OrchestrationDrawer (Phase 3 integration). File preserved for reference.`

Commit: `git add -A && git commit -m "phase 3: rebuild dispatch screen with status cards + compact map + orchestration drawer"`

---

### Phase 4 — Layer ETAs onto the CPR screen (45 minutes)

Goal: make the bystander glance at top-of-screen and see live ETAs without disturbing the metronome.

1. **Read `app/emergency/cpr/page.tsx`** end to end. Identify exactly where the metronome JSX, voice toggle, and timer live. **DO NOT modify those.**
2. **Add a top strip** above the existing CPR header:
   ```tsx
   const { state } = useEmergencyTelemetry({ mode: 'playback', scenarioId: 'royce_hall' });
   // ...
   return (
     <div className="...existing wrapper...">
       <Call911Banner />                                              {/* if not already present */}
       <EmergencyStatusCards state={state} visibleCards={['ems', 'drone', 'aed', 'hospital']} layout="row" />
       {/* ... existing CPR content unchanged below ... */}
       <OrchestrationPill onClick={() => setDrawerOpen(true)} />
       <OrchestrationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} state={state} />
     </div>
   );
   ```

3. **Critical constraint:** the strip must NOT cause layout shift or push the metronome down out of the viewport. If the existing layout is height-constrained, make the strip `position: sticky; top: 0; z-index: 30` so it floats over the existing content. If there's room above the metronome, expand normally. **Test on 1024×768 and 1440×900 viewports** to make sure the metronome remains the visual centerpiece.

4. The CPR screen reads telemetry from the same hook. **Both dispatch and cpr running side by side will start two independent playback clocks** — that's fine for now; in Phase 5 we'll consolidate via shared sessionStorage if needed. For Phase 4, accept the simple model.

5. **Verify the metronome still beats at exactly 110 BPM** after your changes. Open devtools Performance tab if needed. The metronome is the most polished part of the product — don't degrade it.

Commit: `git add -A && git commit -m "phase 4: add ETA strip + orchestration drawer to CPR screen, metronome untouched"`

---

### Phase 5 — Consolidate session state across pages + polish demo route (60 minutes)

Goal: when the user goes from dispatch → cpr, the telemetry state should continue (not reset). And the `/demo` route should feel slightly more "judgement-grade".

1. **Shared session state via sessionStorage**:
   - Modify `useEmergencyTelemetry` to optionally read/write its `ScenarioState` to `sessionStorage` under a key like `cardiaclink:active-emergency`.
   - Add an option `persist?: boolean` (default `false` for `/demo`, `true` for product flow).
   - On mount with `persist: true`, hydrate state from sessionStorage if present (and don't auto-run scenario again).
   - On state changes, write to sessionStorage (debounced to 200ms — don't write on every event).
   - On `reset()`, clear sessionStorage.

2. **Dispatch and CPR pages opt in to persist**:
   ```typescript
   const { state, runScenario } = useEmergencyTelemetry({
     mode: 'playback',
     scenarioId: 'royce_hall',
     persist: true,
   });
   ```
   First visit (dispatch): runs the scenario, telemetry flows, sessionStorage updated.
   Navigation to /cpr: hook hydrates from sessionStorage, no fresh scenario run, state continues. **The interval timer continues from elapsed time stored in sessionStorage**.

3. **`/demo` polish**:
   - Rename the page header from "Demo Orchestration View" to "Pitch View · Fetch.ai Multi-Agent Orchestration".
   - Add a button next to the scenario picker labeled "Switch to Bystander View" that navigates to `/`. This lets a judge cleanly compare the two surfaces.
   - Add a small banner under the header: "This view is for technical evaluation. The bystander surface is at /." Style: muted, dismissible. Use sessionStorage flag `cardiaclink:demo-banner-dismissed` to remember dismissal.
   - In the top-right of the demo header, add a small "Live · Bus connected" / "Playback" indicator showing the current mode.

4. **Ensure the demo route does NOT use sessionStorage persistence** — judges expect Reset to fully reset. Pass `persist: false` (default).

Commit: `git add -A && git commit -m "phase 5: cross-page session state + demo route polish"`

---

### Phase 6 — Backend SSE wiring stub (45 minutes)

Goal: prepare for "live mode" without breaking the demo. Bystander flow stays in playback for Sunday demo safety; live mode is a one-flag flip away.

1. **Inspect `app/api/emergency/start/route.ts`** and any related backend code. Identify what events it currently streams and in what shape.

2. **Create a new endpoint `app/api/telemetry/[emergencyId]/route.ts`** that:
   - Accepts a GET request with an `emergencyId` path param.
   - Returns SSE stream of `AgentEvent`-shaped JSON lines.
   - For Phase 6 stub: emits canned events from the `royce_hall` scenario at the same timing as the playback hook (i.e. read from a shared scenario definition file). Tag every event with `parallelGroupId` for the parallel batch.
   - Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.

3. **Wire the `live` mode of the hook** to this endpoint:
   ```typescript
   if (mode === 'live' && emergencyId) {
     const eventSource = new EventSource(`/api/telemetry/${emergencyId}`);
     eventSource.onmessage = (msg) => {
       try {
         const event: AgentEvent = JSON.parse(msg.data);
         setState(prev => ({ ...prev, events: [...prev.events, event] }));
         // optionally derive `phase`, `nearbyAeds`, etc. from the event type
       } catch (err) {
         console.warn('[telemetry] failed to parse event', err);
       }
     };
     // ...cleanup on unmount
   }
   ```

4. **Add a URL flag** to dispatch and CPR pages: `?mode=live` switches the hook to live mode. Default stays playback. Document this in a code comment.

5. **Verify the demo still works in playback mode** — Phase 6 should not regress anything.

Commit: `git add -A && git commit -m "phase 6: backend SSE endpoint stub + live mode wiring"`

---

### Phase 7 — Verification + demo script (30 minutes)

Goal: prove the integration works end to end and produce a demo script you'd actually use Sunday.

1. **Manual test the bystander flow**:
   - Visit `/`. Click EMERGENCY.
   - On `/emergency/location`, capture location (or use default).
   - On `/emergency/dispatch`:
     - All 4 status cards render and update (911 → ✓, EMS ETA fills in, Drone ETA fills in, Volunteers shows count).
     - Compact map renders, shows emergency pin, AEDs, EMS route, drone path.
     - 🔬 Orchestration pill is visible bottom-right.
     - Click it — drawer slides in from right with 480px width, shows PARALLEL bracket cluster with 4 agents firing in same millisecond.
     - Tab to "Map" inside drawer — small map renders.
     - Close drawer.
     - After ~10 seconds, page auto-advances to `/emergency/cpr`.
   - On `/emergency/cpr`:
     - Top strip shows EMS/Drone/AED/Hospital status.
     - Metronome ticks at 110 BPM (verify with stopwatch — count beats over 30 seconds, expect ~55).
     - 🔬 Orchestration pill bottom-right opens drawer.
     - Drawer shows continued events past where dispatch left off (state continued via sessionStorage).
   - Navigate manually back to `/` and try a fresh emergency — sessionStorage clears, state resets.

2. **Manual test the demo flow**:
   - Visit `/demo`.
   - Run each scenario (Royce Hall, Pauley, Bruin Walk, Drake).
   - PARALLEL bracket renders.
   - 3D buildings toggle works (no Mapbox crash).
   - "Switch to Bystander View" button navigates to `/`.

3. **Document the demo script** at the repo root in `DEMO_SCRIPT.md`. Format:
   - 2-3 minutes total.
   - Beat sheet: at 0:00 say X, at 0:15 click Y, at 0:30 narrate Z.
   - Name-drop Caputo / Buter / Schierbeck / MDAgents at appropriate moments (when bracket appears, when AED coverage ring is visible, when drone overtakes EMS, when triage classifies complexity).
   - One-paragraph "if something breaks" fallback: switch to /demo, run a fresh scenario, narrate from there.

4. **Write `INTEGRATION_REPORT.md`** at the repo root summarizing:
   - Files added (with line counts).
   - Files modified (with line counts).
   - Files explicitly NOT modified (the protected list).
   - Known limitations (what's still placeholder, what would need backend changes for full live mode, etc.).
   - Verification steps you ran and results.

Commit: `git add -A && git commit -m "phase 7: verification + demo script + integration report"`

---

### What NOT to do (across all phases)

- Don't modify the metronome code, Web Audio scheduling, voice session hook, or beat scheduler in `app/emergency/cpr/page.tsx` or `lib/compressionBeatSound.ts` (or wherever it lives).
- Don't modify `app/emergency/cpr-hardware/page.tsx` (Arduino integration is a separate stream).
- Don't modify `app/emergency/assessment/page.tsx` or `app/emergency/complete/page.tsx`.
- Don't modify `app/cpr/page.tsx` (the standalone CPR tutorial — different from `app/emergency/cpr/page.tsx`).
- Don't modify `app/volunteer/map/page.tsx`.
- Don't modify any file under `bus/`, `backend/`, `arduino/`, or `supabase/`.
- Don't delete `components/CoordinatorPanel.tsx` — comment out usage and leave the file.
- Don't introduce new dependencies. Everything you need is already in `package.json` (mapbox-gl, react-map-gl, @turf/circle, lucide-react, tailwindcss, etc.).
- Don't change the four scenario definitions or their coordinates.
- Don't add a state management library (Redux, Zustand). `useState`, `useRef`, and sessionStorage are sufficient.
- Don't change the existing color tokens or the `EmergencyEtaBadge` component's API — extend it if needed.
- Don't render the Orchestration drawer auto-open on first visit. It's opt-in. Bystanders never see it unless they tap.
- Don't break any existing route. Visit each route after every phase to verify.
- Don't commit `.env.local` or any file containing the Mapbox token.
- Don't put real Twilio credentials, Anthropic keys, or any secrets in source.

### Visual / UX rules (apply across all phases)

- **Color palette**: stick to existing tokens. Use cyan (`#22d3ee`) for the orchestration pill and drawer accents — that's the visual signature of "Fetch.ai layer is here". Use red (`#dc2626`) for emergency, yellow for AEDs, cyan for drone, green for hospital, purple for volunteers/triage.
- **Typography**: existing font (Geist). Tabular-nums for any countdown / ETA. Uppercase 10px tracking for card labels. 24px bold for primary values.
- **Animations**: subtle. CSS keyframes. Respect `prefers-reduced-motion: reduce`. The metronome's pulse is the only "loud" animation in the UI — everything else stays calm.
- **Mobile**: bystander flow is mobile-first. Status cards must stack to 2×2 down to 375px width and remain legible. Orchestration pill must remain reachable on small screens. The drawer on mobile takes full width instead of 480px.
- **Tap targets**: ≥44px (the existing standard).
- **Accessibility**: every interactive element has aria-label. Drawer is `role="dialog"` with `aria-modal="true"`. Focus trapped while open. Esc closes it.

### Commit hygiene

- Every phase commit prefixed with `phase N:`.
- Each commit message has one summary line + a body listing files touched.
- Don't squash; the granular commits are valuable for rollback.

### Final deliverable (return at end of run)

Return a structured summary:

```
PHASES COMPLETED: <N> / 7

NEW FILES:
- components/EmergencyStatusCards.tsx (X lines)
- components/OrchestrationDrawer.tsx (X lines)
- ...

MODIFIED FILES:
- app/emergency/dispatch/page.tsx (+X / -Y lines)
- ...

PROTECTED FILES (verified untouched):
- app/emergency/cpr/page.tsx — metronome logic intact
- ...

KNOWN ISSUES:
- ...

DEMO SCRIPT: DEMO_SCRIPT.md created
INTEGRATION REPORT: INTEGRATION_REPORT.md created

NEXT MANUAL STEP:
- Open localhost:3000, walk through bystander flow once. Confirm:
  - 4 status cards render
  - Orchestration drawer opens / closes
  - Metronome unaffected
  - Auto-advance works
- Then open /demo, run all 4 scenarios.
- Then record a 90-second demo video using DEMO_SCRIPT.md as the script.
```

Good night. Build well.
