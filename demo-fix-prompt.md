# Claude Code prompt — Fix CardiacLink demo orchestration view

> Paste everything below the `---` line into Claude Code.
> Run from the repo root: `/Users/emilysun/Downloads/CardicLinkNew-master/`.
> Switch to Opus 4.6 first: `/model claude-opus-4-6` — this prompt requires careful reasoning about Mapbox internals and visual timing.

---

## CardiacLink — Three fixes for the demo orchestration view at `/demo`

### Context

`/Users/emilysun/Downloads/CardicLinkNew-master/` is a Next.js 14 + Mapbox GL JS + react-map-gl v8 project. The demo orchestration view is at `app/demo/page.tsx`, with three companion files:

- `components/DemoEmergencyMap.tsx` — Mapbox map with AED dots, coverage rings, EMS route, drone path, hospital marker, 3D buildings.
- `components/AgentActivityFeed.tsx` — left-side feed of agent events.
- `components/DemoControls.tsx` — scenario picker + layer toggles.
- `lib/useBusTelemetry.ts` — owns all state, runs scenario playback via `setInterval` with phase callbacks.

The view currently has three problems. Fix all three in this single round, in the order below.

### Problem 1 (CRITICAL) — Mapbox crashes on mouseover

**Symptom:**
```
TypeError: Cannot read properties of undefined (reading '0')
  at Object.ee [as aE]      (mapbox-gl.js)
  at so.pointRayIntersection
  at qv.pointCoordinate
  at so.pointCoordinate
  at so.pointCoordinate3D
  at so.pointLocation3D
  at Map.unproject
  at new Xa
  at Qa.mouseover
  at kl.handleEvent
```

**Root cause:**
- `DemoEmergencyMap.tsx:302` renders `<Layer {...buildings3dLayer} />` outside a `<Source>` wrapper, referencing `source: 'composite'` (dark-v11 built-in source).
- `app/demo/page.tsx:18` defaults `buildings3d: true`, so the 3D fill-extrusion layer is added on first paint.
- All `<Source>` and `<Layer>` children are rendered before `mapLoaded` flips true (line 271 conditional doesn't gate sources, only the easeTo).
- When the user mouseovers, Mapbox triggers `pointLocation3D` → `pointCoordinate3D` → `pointRayIntersection`, which dereferences a transform/camera array that hasn't fully initialized.
- No `interactiveLayerIds` prop on `<Map>`, so Mapbox tries to query EVERY layer for hover, including the 3D fill-extrusion that's still mid-init.

**Fix in `components/DemoEmergencyMap.tsx`:**

1. **Gate ALL sources and layers behind `mapLoaded`.** Wrap every `<Source>` and the standalone `<Layer>` for 3D buildings in `{mapLoaded && (...)}`. Markers can stay outside the gate (they're HTML overlays, not interactive map features).

2. **Add `interactiveLayerIds` to the `<Map>` prop**, whitelisting only the AED layers for hover:
   ```tsx
   interactiveLayerIds={mapLoaded ? ['aed-available', 'aed-unavailable'] : []}
   ```
   This excludes 3D buildings and coverage rings from the raycasting, eliminating the crash path.

3. **Add a defensive `onError` handler** on the `<Map>`:
   ```tsx
   onError={(e) => {
     // Silence the known mapbox terrain raycasting warning during init.
     // Real errors still surface via the browser console.
     if (e.error?.message?.includes('reading \'0\'')) return;
     console.error('[Mapbox]', e.error);
   }}
   ```
   This is a belt-and-suspenders guard in case the gate above misses an edge case.

4. **Move the `easeTo` for pitch/bearing into a single combined effect** that only runs after `mapLoaded === true`:
   ```tsx
   useEffect(() => {
     if (!mapRef.current || !mapLoaded) return;
     const map = mapRef.current.getMap();
     // Wait one extra frame to be sure the style is fully applied
     requestAnimationFrame(() => {
       map.easeTo({
         pitch: layers.buildings3d ? 45 : 0,
         bearing: layers.buildings3d ? -17 : 0,
         duration: 1000,
       });
     });
   }, [layers.buildings3d, mapLoaded]);
   ```

5. **Verify the `<NavigationControl>` and `<Marker>` components remain mounted regardless of `mapLoaded`** — they don't trigger the bug.

### Problem 2 (HIGH) — Parallel dispatch is fake

**Symptom:** the activity feed shows Triage at second 2, AED at second 3, EMS at second 4, Drone at second 5 — clearly sequential. The whole "Caputo Swiss study: parallel beats sequential" narrative is undermined by the timeline.

**Root cause:**
- `lib/useBusTelemetry.ts:395` uses a 1-second `setInterval` to fire phase callbacks at integer second boundaries.
- Each phase fires one or two `addEvent` calls, then waits ≥1 second for the next phase.
- There's no concept of a "parallel batch" in the data model. The `AgentEvent` type has no `parallelGroupId`.
- `AgentActivityFeed.tsx` renders events linearly with no grouping.

**Fix in `lib/useBusTelemetry.ts`:**

1. **Add `parallelGroupId?: string` to the `AgentEvent` interface** (line 7-14):
   ```ts
   export interface AgentEvent {
     id: string;
     timestamp: number;
     agent: string;
     type: '...';
     message: string;
     data?: Record<string, unknown>;
     parallelGroupId?: string;  // NEW — events sharing this id render under a PARALLEL bracket
   }
   ```

2. **Restructure the phase timeline** to fire the four parallel-dispatch events in a single phase callback. Replace the existing phase 1 ("agents_dispatching") with a true parallel batch:
   ```ts
   // Phase 1 (at t=400ms after call): TRUE PARALLEL DISPATCH
   () => {
     setState(prev => ({ ...prev, phase: 'agents_dispatching', elapsed: elapsedRef.current }));
     const groupId = `parallel-${Date.now()}`;
     // Fire all 4 dispatches in the same React batch — same microsecond timestamp
     const t0 = Date.now();
     setState(prev => ({
       ...prev,
       events: [
         ...prev.events,
         { id: `${t0}-tri`,   timestamp: t0,     agent: 'Triage',     type: 'dispatch', message: 'Classify scenario complexity (MDAgents)…', parallelGroupId: groupId },
         { id: `${t0}-aed`,   timestamp: t0 + 1, agent: 'AED',        type: 'dispatch', message: 'Query nearest defibrillators with pads available…', parallelGroupId: groupId },
         { id: `${t0}-ems`,   timestamp: t0 + 2, agent: 'EMS',        type: 'dispatch', message: 'Request ALS unit dispatch via PSAP bridge…', parallelGroupId: groupId },
         { id: `${t0}-drone`, timestamp: t0 + 3, agent: 'Drone',      type: 'dispatch', message: 'Launch UAV-AED from Reagan Med Center (Schierbeck 2023)…', parallelGroupId: groupId },
       ],
     }));
     addEvent('Coordinator', 'dispatch', 'Parallel dispatch initiated — 4 specialist agents fanning out (Caputo et al. parallel-vs-sequential principle)');
   },
   ```

3. **Compress the phase timeline** from 16 seconds to ~8 seconds. Replace the `phaseTimes` array (currently `[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16]`) with:
   ```ts
   // Compressed demo timing — total ~8 seconds
   const phaseTimes = [0, 0.4, 1.2, 1.8, 2.4, 3.2, 4.5, 5.5, 6.5, 7.5, 8];
   ```
   And switch the `setInterval` from 1000ms ticks to 200ms ticks so sub-second phase boundaries actually fire:
   ```ts
   timerRef.current = setInterval(() => {
     elapsedRef.current += 0.2;
     setState(prev => ({ ...prev, elapsed: Math.round(elapsedRef.current * 10) / 10 }));
     while (phaseIndex < phases.length && elapsedRef.current >= phaseTimes[phaseIndex]) {
       phases[phaseIndex]();
       phaseIndex++;
     }
     if (phaseIndex >= phases.length && elapsedRef.current >= phaseTimes[phaseTimes.length - 1] + 1) {
       if (timerRef.current) clearInterval(timerRef.current);
     }
   }, 200);
   ```
   Note: change `elapsed` to a number with one decimal so the UI doesn't show jittery integer-only seconds.

4. **Reorder phases** so the new structure is: call_received(0) → parallel dispatch batch(0.4) → triage_complete(1.2) → aeds_located(1.8) → ems_en_route(2.4) → drone_launched(3.2) → coverage_calc(4.5) → voice_sync(5.5) → drone_en_route_update(6.5) → handoff_ready(7.5) → resolved(8). Keep all existing event content; just fold the four "dispatch" events into the parallel batch and adjust the response events into the later phases.

5. **Triage event before the parallel dispatch:** the parallel batch issues a `Triage 'dispatch'` event AND the response comes later in phase `triage_complete`. Make sure both exist — the dispatch belongs in the parallel group, the response is unbatched.

**Fix in `components/AgentActivityFeed.tsx`:**

1. **Group consecutive events with the same `parallelGroupId`** and render them under a vertical bracket on the left edge with a "PARALLEL" label. Add this preprocessing step before the events.map():
   ```tsx
   // Build groups: consecutive events sharing parallelGroupId become one cluster
   type Cluster = { kind: 'single'; event: AgentEvent } | { kind: 'parallel'; groupId: string; events: AgentEvent[] };
   const clusters: Cluster[] = [];
   for (const ev of events) {
     if (ev.parallelGroupId) {
       const last = clusters[clusters.length - 1];
       if (last && last.kind === 'parallel' && last.groupId === ev.parallelGroupId) {
         last.events.push(ev);
       } else {
         clusters.push({ kind: 'parallel', groupId: ev.parallelGroupId, events: [ev] });
       }
     } else {
       clusters.push({ kind: 'single', event: ev });
     }
   }
   ```

2. **Render each cluster.** Singles render as today. Parallel clusters render with a left vertical bar in `bg-cyan-500/40` width-1px, a small "⚡ PARALLEL × N" label at the top, and the inner events indented 12px:
   ```tsx
   {clusters.map((cluster, i) =>
     cluster.kind === 'single'
       ? <SingleEventRow key={cluster.event.id} event={cluster.event} index={i} />
       : (
         <div key={cluster.groupId} className="relative pl-3 ml-1 my-2">
           <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-cyan-500/60 rounded-full" />
           <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
             <span>⚡</span>
             <span>PARALLEL × {cluster.events.length}</span>
             <span className="text-cyan-700 font-normal normal-case ml-1">Caputo et al. — concurrent dispatch</span>
           </div>
           <div className="space-y-1.5">
             {cluster.events.map((ev, j) => <SingleEventRow key={ev.id} event={ev} index={i * 100 + j} />)}
           </div>
         </div>
       )
   )}
   ```
   Extract the existing event row JSX into `SingleEventRow` so both branches render identical row markup.

3. **Auto-scroll behavior unchanged.**

### Problem 3 (LOW — quality polish) — Defensive guards

**Add these belt-and-suspenders fixes while you're in the file:**

1. **`useBusTelemetry.ts`** — In `runScenario`, before scheduling the new interval, explicitly call `clearInterval` on the old one. This already happens via `reset()` → `stop()`, but make it explicit at the top of `runScenario` to prevent any race:
   ```ts
   const runScenario = useCallback((scenarioId: string) => {
     const scenario = SCENARIOS[scenarioId];
     if (!scenario) {
       console.warn(`[CardiacLink] Unknown scenario: ${scenarioId}`);
       return;
     }
     reset();  // existing — clears state and timers
     // (rest unchanged)
   }, [addEvent, reset]);
   ```

2. **`DemoEmergencyMap.tsx`** — Validate the Mapbox token at component mount. If missing, render a clear fallback panel instead of letting the Map fail silently:
   ```tsx
   const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

   if (!MAPBOX_TOKEN) {
     return (
       <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
         <div className="text-sm font-semibold mb-2">Mapbox token missing</div>
         <div className="text-xs">Set <code className="bg-zinc-800 px-1 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code className="bg-zinc-800 px-1 py-0.5 rounded">.env.local</code></div>
         <div className="text-xs text-zinc-600 mt-3">Activity feed continues to work.</div>
       </div>
     );
   }
   ```

3. **No new dependencies.** Don't add deck.gl, don't add @turf packages that aren't already there. The current setup uses `@turf/circle` + `@turf/helpers`, both already imported. Keep it that way.

### What NOT to do

- Don't migrate to deck.gl. The current pure Mapbox approach works once the gating is fixed.
- Don't add new scenarios. Four are enough.
- Don't refactor the 4 scenario definitions in `SCENARIOS`. Their data is correct.
- Don't touch `app/cpr/`, `app/emergency/*`, `app/page.tsx`, or any backend file. Bystander flow stays untouched.
- Don't modify `bus/` (the Python uAgents). The frontend doesn't reach into the bus directly in this demo.
- Don't change the layout (`app/demo/page.tsx`). Only the three component files and the hook need editing.
- Don't introduce a new state-management library. `useState` + `useRef` are enough.
- Don't change the four agent colors or icons in `AgentActivityFeed.tsx`. They're consistent with the rest of the codebase.
- Don't put the parallel batch's events on the SAME `Date.now()` value — Mapbox/React lists need stable, unique keys. Use offset milliseconds (`t0`, `t0+1`, `t0+2`, `t0+3`) so timestamps are distinguishable even if rendering is batched.

### Acceptance criteria

You're done when ALL of the following hold (verify in the browser at `http://localhost:3000/demo`):

1. **Crash gone.** Hover over the map repeatedly, including over 3D buildings — no console error, no red Next.js overlay.
2. **3D buildings visible** when `buildings3d` toggle is on (default). The map pitches to 45° with subtle bearing rotation.
3. **No crash even when token is missing** — the fallback panel renders; activity feed still works.
4. **Click "Run Scenario" on Royce Hall.** Within ~400ms of clicking, the activity feed shows a single "PARALLEL × 4" cluster bracket containing Triage / AED / EMS / Drone dispatch lines, with the Caputo citation in the bracket header.
5. **Total scenario runtime ~8 seconds**, not 16. Verify by watching the elapsed counter in the top bar.
6. **All four scenarios still work** (Royce Hall, Pauley Pavilion, Bruin Walk, Drake Stadium) — the parallel cluster appears in each.
7. **Toggle `buildings3d` off then on** — map flips between top-down and 3D pitch without crashing.
8. **Toggle other layers** (AEDs, Coverage, EMS, Drone, Hospital) — each visibly turns on/off without errors.
9. **Click Reset** — map clears all data, returns to standby; clicking Run again starts fresh with `0` events at the start.
10. **No new packages installed.** `package.json` unchanged except possibly version bumps if any.
11. **Bystander flow unaffected.** Visit `http://localhost:3000/`, click EMERGENCY, walk through `/emergency/location` → `/emergency/dispatch` → `/emergency/cpr`. Everything still works as before.

### Files you'll touch

- `components/DemoEmergencyMap.tsx` — gate sources/layers behind `mapLoaded`, add `interactiveLayerIds`, `onError` guard, token fallback.
- `lib/useBusTelemetry.ts` — add `parallelGroupId`, restructure phase timing, compress to 8 seconds, add scenario validation log.
- `components/AgentActivityFeed.tsx` — cluster rendering for parallel groups with bracket UI.

### Files you must NOT touch

- `app/cpr/page.tsx`, `app/emergency/**`, `app/page.tsx`, `app/api/**`, `app/volunteer/**`, `app/layout.tsx`
- `components/Call911Banner.tsx`, `EmergencyEtaBadge.tsx`, `NearbyAedMap.tsx`, `AEDCard.tsx`, `AEDMap.tsx`, `EmergencyMap.tsx`, `LocationMap.tsx`, `CPRQRCode.tsx`, `TriggerButton.tsx`, `CoordinatorPanel.tsx`, `AgentCard.tsx`, `components/ui/**`
- `bus/**`, `backend/**`, `arduino/**`, `supabase/**`
- Any of the markdown docs at the repo root (`README.md`, `BUILD_SUMMARY.md`, etc.)

### Final deliverable

Return:

- One line per file touched with line-count delta.
- Confirmation that the demo runs through to completion without console errors.
- Confirmation that the PARALLEL bracket renders in the activity feed for each of the four scenarios.
- A 30-second demo script you'd say while showing this view to a judge — what to point at, in what order, and which papers to name-drop (Caputo, Buter 2024, Schierbeck Lancet 2023, MDAgents NeurIPS 2024).
- Any deviations from this prompt and why.
