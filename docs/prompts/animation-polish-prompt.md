# Claude Code prompt — Polish demo map animation: convergent volunteers + drone-AED handoff

> Paste everything below the `---` line into Claude Code.
> Run from the repo root: `/Users/emilysun/Downloads/CardicLinkNew-master/`.
> Switch to Opus 4.6 first: `/model claude-opus-4-6`.

---

## CardiacLink — Polish the demo map animation

### Mission

The `/demo` map currently shows EMS as a static dashed line and a single drone path. The judge can't easily see "what happens, in what order, who brings the AED." We need to make the convergence visually narrative-driven so a judge watching for 8 seconds understands the chain of care immediately.

Three specific upgrades, all visual / animation only:

1. **5 volunteers converging from different parts of campus** — purple dots that start at distinct UCLA buildings and move toward the emergency on staggered timing, with the nearest arriving first.
2. **Drone visibly carrying an AED, then dropping it** — drone marker has a small glowing AED package attached. When drone reaches emergency, the package "drops" with a brief bounce animation and remains on the ground as a yellow AED icon. Emergency marker changes state to "AED on scene".
3. **EMS unit driving from a real LAFD station** — replace the static dashed line with an animated red ambulance icon moving along the route, arriving last (slowest).

The narrative judges should be able to read off the screen:
- *t≈0s*: Red pulse appears at Royce Hall. Coordinator fires PARALLEL × 4.
- *t≈1s*: 5 purple volunteer dots start moving from Boelter, Anderson, De Neve, Drake, Kerckhoff. Cyan drone launches from Ronald Reagan Medical Center carrying a glowing AED package. Red EMS unit pulls out of LAFD Station 37.
- *t≈2.5s*: Drone arrives first. Package detaches, bounces down, becomes a static AED icon on the ground. Emergency dot's outer ring turns gold.
- *t≈3-4s*: Closest volunteer (Kerckhoff, ~250m) reaches emergency. Volunteer dot pulses gold to indicate "on scene".
- *t≈4-6s*: Other volunteers continue arriving from farther buildings.
- *t≈6s*: EMS arrives. Hospital marker (Reagan UCLA) pulses purple to indicate handoff readiness.
- *t≈7-8s*: Bundle persisted to MongoDB (existing logic). Scenario resolves.

### Scope strictly limited to

**Files you may modify:**
- `components/DemoEmergencyMap.tsx` (the main /demo map)
- `lib/useEmergencyTelemetry.ts` (add animation state + volunteer/drone/EMS positions)
- `lib/data/volunteers.ts` (NEW — volunteer pool definition)

**Files you may NOT modify:**
- `components/CompactEmergencyMap.tsx` — stays simple, the compact dispatch-page map doesn't need this animation
- `app/emergency/cpr/page.tsx` — metronome / voice / Web Audio untouched
- `components/AgentActivityFeed.tsx` — feed UI untouched
- `components/OrchestrationDrawer.tsx` — drawer untouched
- `lib/mongo/*`, `lib/fhir/*` — MongoDB integration untouched
- `bus/**`, `backend/**` — Python/FastAPI untouched

The animation lives entirely in the /demo full-screen map, not the compact dispatch map.

### Phase 1 — Volunteer pool data (15 min)

Create `lib/data/volunteers.ts`:

```typescript
// Synthetic volunteer responder pool for the /demo orchestration view.
// Schema mirrors PulsePoint Respond's responder model so the integration shape
// matches a production Good Samaritan dispatch system.
//
// For the hackathon: positions are real UCLA campus buildings; identifiers are
// synthetic. Production would source these from a verified responder registry.

export interface DemoVolunteer {
  id: string;
  name: string;            // anonymized: "Volunteer A", etc.
  startLat: number;
  startLon: number;
  startBuilding: string;
  trainingLevel: 'BLS' | 'ACLS' | 'EMR' | 'Lay';
  hasAed: boolean;         // does this volunteer carry their own AED?
  walkSpeedMps: number;    // ~1.4 m/s normal, 1.8 m/s urgent jog
  arrivalDelaySeconds: number; // delay before they "see" the alert and start moving
}

// 5 volunteers scattered across UCLA campus. Distinct buildings so animation
// trajectories don't overlap visually.
export const UCLA_VOLUNTEERS: DemoVolunteer[] = [
  {
    id: 'vol-a',
    name: 'Volunteer A',
    startBuilding: 'Kerckhoff Hall',
    startLat: 34.0709,
    startLon: -118.4436,
    trainingLevel: 'BLS',
    hasAed: false,
    walkSpeedMps: 1.8,
    arrivalDelaySeconds: 0.2,
  },
  {
    id: 'vol-b',
    name: 'Volunteer B',
    startBuilding: 'Boelter Hall',
    startLat: 34.0691,
    startLon: -118.4431,
    trainingLevel: 'EMR',
    hasAed: true,         // EMR carries their own AED — backup if drone delayed
    walkSpeedMps: 1.7,
    arrivalDelaySeconds: 0.3,
  },
  {
    id: 'vol-c',
    name: 'Volunteer C',
    startBuilding: 'Anderson School of Management',
    startLat: 34.0743,
    startLon: -118.4434,
    trainingLevel: 'BLS',
    hasAed: false,
    walkSpeedMps: 1.6,
    arrivalDelaySeconds: 0.5,
  },
  {
    id: 'vol-d',
    name: 'Volunteer D',
    startBuilding: 'De Neve Plaza',
    startLat: 34.0732,
    startLon: -118.4512,
    trainingLevel: 'Lay',
    hasAed: false,
    walkSpeedMps: 1.5,
    arrivalDelaySeconds: 0.6,
  },
  {
    id: 'vol-e',
    name: 'Volunteer E',
    startBuilding: 'Drake Stadium',
    startLat: 34.0677,
    startLon: -118.4486,
    trainingLevel: 'ACLS',
    hasAed: false,
    walkSpeedMps: 1.7,
    arrivalDelaySeconds: 0.4,
  },
];
```

### Phase 2 — Telemetry hook: add per-frame animation state (45 min)

In `lib/useEmergencyTelemetry.ts`:

#### 2a. New types

Add to the type definitions block:

```typescript
export interface VolunteerState {
  id: string;
  name: string;
  startLat: number;
  startLon: number;
  currentLat: number;
  currentLon: number;
  startBuilding: string;
  trainingLevel: string;
  hasAed: boolean;
  status: 'standby' | 'en_route' | 'arrived';
  progress: number;        // 0..1 — percent of journey
  etaSeconds: number;      // computed from distance / speed
}

export interface AedDeliveryState {
  // Set when drone has delivered an AED, or when a volunteer-carried AED arrives
  deliveredAt: number | null;     // Date.now() of delivery moment
  deliveredBy: 'drone' | 'volunteer' | null;
  position: { lat: number; lon: number } | null;
}
```

Extend `ScenarioState`:

```typescript
volunteers: VolunteerState[];
aedDelivery: AedDeliveryState;
emsPosition: { lat: number; lon: number; progress: number } | null;
// drone state already exists; just ensure DroneState includes:
//   path: [number, number][]; status: 'launched'|'en_route'|'delivered'; lat/lon updated each frame
```

#### 2b. Animation loop

Add a `useEffect` that runs a `requestAnimationFrame` loop while `state.phase` is between `agents_dispatching` and `resolved`. Each frame:

1. Compute `elapsedSec = (Date.now() - scenarioStartedAt) / 1000`.
2. For each volunteer, compute distance from start to emergency, ETA = distance / walkSpeedMps + arrivalDelaySeconds. Set `progress = min(1, max(0, (elapsedSec - delay) / etaSeconds))`. Set `currentLat/Lon` by linear interp from start to emergency. When `progress === 1`, set status `'arrived'`.
3. For drone (if launched), compute ETA from Reagan to emergency at 50 km/h (Schierbeck 2023). Set lat/lon by linear interp. When progress === 1, fire one-shot AED delivery: set `aedDelivery = { deliveredAt: Date.now(), deliveredBy: 'drone', position: { lat: emergencyLat, lon: emergencyLon } }`.
4. For EMS (if dispatched), compute ETA from LAFD station to emergency. Linear interp.
5. Stop the RAF loop when phase === 'resolved' or scenario reset.

Use `cancelAnimationFrame` cleanup. Don't leak loops between scenarios.

**Important:** the existing 1-second-tick scenario timeline keeps firing event messages (Triage Complete, AED Located, etc.) — don't replace that. The RAF loop runs IN PARALLEL with the existing timeline; it only updates positions, not events. Events stay on their existing schedule.

#### 2c. Initialize volunteers on scenario start

In `runScenario`, after computing emergency location:

```typescript
import { UCLA_VOLUNTEERS } from './data/volunteers';

const initialVolunteers: VolunteerState[] = UCLA_VOLUNTEERS.map(v => ({
  id: v.id,
  name: v.name,
  startLat: v.startLat,
  startLon: v.startLon,
  currentLat: v.startLat,
  currentLon: v.startLon,
  startBuilding: v.startBuilding,
  trainingLevel: v.trainingLevel,
  hasAed: v.hasAed,
  status: 'standby',
  progress: 0,
  etaSeconds: haversineM(v.startLat, v.startLon, loc.lat, loc.lon) / v.walkSpeedMps + v.arrivalDelaySeconds,
}));

// Set initial state
setState(prev => ({
  ...prev,
  volunteers: initialVolunteers,
  aedDelivery: { deliveredAt: null, deliveredBy: null, position: null },
  emsPosition: null,
}));
```

When parallel dispatch phase fires (the one with the PARALLEL bracket events), flip volunteers from `standby` → `en_route`:

```typescript
setState(prev => ({
  ...prev,
  volunteers: prev.volunteers.map(v => ({ ...v, status: 'en_route' })),
}));
```

### Phase 3 — Map: render the new visual elements (90 min)

In `components/DemoEmergencyMap.tsx`:

#### 3a. Volunteer markers

For each `state.volunteers` entry, render a Mapbox `<Marker>` at `currentLat, currentLon`. Marker visual:

- Status `'standby'`: small purple ring (12px), 50% opacity, no animation.
- Status `'en_route'`: purple dot (16px) with a small trailing comet effect via CSS `:before` pseudo-element with `box-shadow` and `transform`. Subtle pulse (1.6s cycle).
- Status `'arrived'`: gold dot (20px), no pulse, with a small "✓" in white inside.
- Hover (or always-on label for volunteers carrying AED): small text label below the dot showing training level and "🩹 AED" badge if `hasAed`.

Color: `#a855f7` (purple-500) base for volunteers; `#fbbf24` (amber-400) when arrived.

#### 3b. Volunteer trail lines (optional but high-impact)

For each volunteer in `'en_route'` status, render a `<Source>` + `<Layer>` showing a thin line from their start position to current position. Color: same purple as their dot, opacity 30%, line-width 1.5px, line-cap round. This creates the visual "5 trails converging" effect.

When `arrived`, the trail gradually fades (opacity 30 → 5%) over 1 second then is removed.

```typescript
// Build a single GeoJSON FeatureCollection of all active volunteer trails
const volunteerTrails = useMemo(() => ({
  type: 'FeatureCollection' as const,
  features: state.volunteers
    .filter(v => v.status !== 'standby' && v.progress > 0.05)
    .map(v => ({
      type: 'Feature' as const,
      properties: {
        id: v.id,
        progress: v.progress,
        arrived: v.status === 'arrived',
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [v.startLon, v.startLat],
          [v.currentLon, v.currentLat],
        ],
      },
    })),
}), [state.volunteers]);

// Render as a Mapbox source + line layer (gated behind mapLoaded)
<Source id="volunteer-trails" type="geojson" data={volunteerTrails}>
  <Layer
    id="volunteer-trails-line"
    type="line"
    paint={{
      'line-color': '#a855f7',
      'line-width': 1.5,
      'line-opacity': ['case', ['get', 'arrived'], 0.1, 0.35],
    }}
    layout={{ 'line-cap': 'round' }}
  />
</Source>
```

#### 3c. Drone marker with AED package

Replace the existing simple drone dot with a richer composite marker:

```tsx
{state.drone && state.drone.status !== 'delivered' && (
  <Marker latitude={state.drone.lat} longitude={state.drone.lon} anchor="center">
    <div className="relative flex flex-col items-center">
      {/* AED package attached above the drone */}
      <div className="w-3.5 h-3.5 bg-amber-400 border border-amber-200 rounded-sm flex items-center justify-center mb-0.5 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-[pulse_2s_ease-in-out_infinite]">
        <span className="text-[7px] font-bold text-amber-900">AED</span>
      </div>
      {/* small dotted line connecting package to drone */}
      <div className="w-px h-1 bg-cyan-300/60" />
      {/* drone body */}
      <div className="w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-lg shadow-cyan-400/50" />
    </div>
  </Marker>
)}

{/* AED drop animation — when delivery happens, show a bouncing AED at emergency */}
{state.aedDelivery.deliveredAt && state.aedDelivery.position && (
  <Marker
    latitude={state.aedDelivery.position.lat}
    longitude={state.aedDelivery.position.lon}
    anchor="bottom"
    offset={[0, 0]}
  >
    <DroppedAedIcon
      deliveredAt={state.aedDelivery.deliveredAt}
      deliveredBy={state.aedDelivery.deliveredBy}
    />
  </Marker>
)}
```

Implement `DroppedAedIcon` as a small inline component:

```tsx
function DroppedAedIcon({ deliveredAt, deliveredBy }: { deliveredAt: number; deliveredBy: 'drone' | 'volunteer' | null }) {
  const [age, setAge] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAge(Date.now() - deliveredAt), 50);
    return () => clearInterval(id);
  }, [deliveredAt]);

  const justDropped = age < 800; // bounce window
  return (
    <div className="flex flex-col items-center">
      {justDropped && (
        <div className="text-[9px] font-bold text-amber-300 mb-0.5 animate-[fadeOut_800ms_ease-out_forwards]">
          {deliveredBy === 'drone' ? '📦 DROP' : 'ARRIVED'}
        </div>
      )}
      <div
        className={`w-5 h-5 bg-amber-400 border-2 border-amber-200 rounded-md flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.7)] ${justDropped ? 'animate-[bounceDrop_800ms_cubic-bezier(0.34,1.56,0.64,1)]' : ''}`}
      >
        <span className="text-[8px] font-bold text-amber-900">AED</span>
      </div>
    </div>
  );
}
```

Add the keyframes to `app/globals.css` (or wherever Tailwind global styles live):

```css
@keyframes bounceDrop {
  0% { transform: translateY(-40px) scale(0.7); opacity: 0.4; }
  60% { transform: translateY(8px) scale(1.15); opacity: 1; }
  80% { transform: translateY(-4px) scale(1); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes fadeOut {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
}
```

#### 3d. Emergency marker reacts to AED arrival

Modify the existing emergency pulse marker to show "AED on scene" once `state.aedDelivery.deliveredAt !== null`:

```tsx
{state.emergencyLocation && (
  <Marker latitude={state.emergencyLocation.lat} longitude={state.emergencyLocation.lon} anchor="center">
    <div className="relative flex items-center justify-center">
      <div className="absolute w-12 h-12 bg-red-500 rounded-full animate-ping opacity-40" />
      {/* NEW: gold ring when AED has arrived */}
      {state.aedDelivery.deliveredAt && (
        <div className="absolute w-10 h-10 bg-amber-400 rounded-full animate-pulse opacity-50" />
      )}
      <div className="absolute w-8 h-8 bg-red-500 rounded-full animate-pulse opacity-60" />
      <div className="relative w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg shadow-red-500/50" />
    </div>
  </Marker>
)}
```

#### 3e. EMS marker — animated unit moving along route

Currently you have an EMS marker at a static `state.emsUnits[0]` lat/lon. Update it to animate along the route from LAFD Station 37 to emergency.

Use the same pattern as drone: in the RAF loop, compute EMS progress (slower than drone — use 25 km/h average in city traffic). Update `state.emsPosition`. Render a marker at that position with a 🚑 icon and ETA badge.

When `progress === 1`, change the marker to "ON SCENE" badge in green.

#### 3f. Hospital handoff pulse

When `phase === 'handoff_ready'`, the hospital marker should briefly pulse (3 cycles, ~2 seconds total). Use a CSS `animate-pulse` toggled by checking `state.phase`.

### Phase 4 — Legend update (15 min)

The existing legend in the bottom-left of the map shows: Emergency, AED (pads OK), AED (unavailable), Drone, Hospital.

Add three more entries to the legend so judges can decode the new visuals:
- 🟣 Volunteer (en route)
- 🟡 Volunteer (arrived) / AED on scene
- 🚑 EMS (animated)

Don't bloat the legend — keep entries to a single line each, total ≤ 8 entries.

### Phase 5 — Demo timing tune-up (15 min)

Verify the animation timeline matches the existing scenario phase timing. The 8-second compressed timeline you already have is a good baseline. Specifically check:

| Time | Visual event |
|------|--------------|
| 0.0s | Emergency pulse appears |
| 0.4s | PARALLEL × 4 fires (volunteers go en_route, drone launches, EMS dispatched) |
| 1.0-3.5s | Volunteers + drone + EMS animate in parallel |
| 2.5s | Drone arrives, AED drops at emergency |
| 3.5-5.0s | Closest volunteers arrive |
| 5.5-6.0s | EMS arrives |
| 7.0s | Hospital handoff pulse |
| 8.0s | Resolved + MongoDB persist |

If the existing scenario timeline doesn't match this, adjust the phase delays in `useEmergencyTelemetry.ts` so the visual events line up with the activity feed events. **Don't break the existing PARALLEL bracket grouping** — it must still happen in a single React batch with same-millisecond timestamps.

### Phase 6 — Reduced motion fallback (10 min)

Wrap all the new CSS keyframe animations in `@media (prefers-reduced-motion: no-preference)`:

```css
@media (prefers-reduced-motion: no-preference) {
  @keyframes bounceDrop { ... }
  @keyframes fadeOut { ... }
}
@media (prefers-reduced-motion: reduce) {
  .animate-bounceDrop, .animate-fadeOut { animation: none !important; }
}
```

For users with `prefers-reduced-motion: reduce`, all positions still update (volunteers still appear at their current positions), but no bounce, no pulses, no trails. The narrative is still readable.

### Phase 7 — Verify (15 min)

Manual smoke test in browser at `http://localhost:3000/demo`:

1. Open `/demo`. Click any scenario. Click Run.
2. Within 1 second of clicking Run:
   - 5 purple volunteer dots visible at distinct campus locations (Kerckhoff, Boelter, Anderson, De Neve, Drake)
   - Drone marker visible at Reagan Med Center with attached AED package badge
   - EMS marker visible at LAFD Station 37
3. Within 0.5 seconds of PARALLEL bracket appearing in feed:
   - Volunteers start moving (purple trails appear behind each)
   - Drone moves toward emergency
   - EMS unit starts moving
4. ~2.5 seconds in:
   - Drone reaches emergency
   - AED package "drops" with bounce animation
   - "📦 DROP" label flashes briefly
   - Yellow AED icon stays on the ground
   - Emergency red pulse gains a gold outer ring
5. ~3.5 seconds in:
   - Closest volunteer (Kerckhoff) reaches emergency, dot turns gold with ✓
6. ~5-6 seconds in:
   - Other volunteers arrive at staggered times
   - EMS arrives, marker shows "ON SCENE"
7. ~7 seconds in:
   - Hospital marker (Reagan UCLA) pulses purple briefly
8. ~8 seconds in:
   - MongoDB persistence indicator in drawer footer flips to green
9. Click Reset:
   - All volunteers return to standby
   - AED drop icon disappears
   - Trails clear
10. Run scenario again — clean re-run, no leftover state

Test on a 1280×720 viewport. The trails and markers should not visually overlap so much that the map becomes unreadable.

#### Performance check

The RAF loop should run at 60fps without dropped frames. If you see jank:
- Make sure you're not creating new objects in render every frame (memoize the GeoJSON Feature collections).
- Make sure you're not calling `setState` more than ~30x/second.
- Throttle the position updates to once every 33ms (30fps) if needed — judges won't notice 30fps but will notice missed frames.

### What NOT to do

- Don't migrate to deck.gl. The current Mapbox + react-map-gl setup is fine; native Markers + Layer animations are sufficient for this polish.
- Don't add a turn-by-turn routing API. Straight-line linear interpolation is fine — this is a demo, not a real navigation app.
- Don't add a sound effect or audio cue (would conflict with the metronome/voice on the CPR page).
- Don't add the same animation to the compact dispatch map (`CompactEmergencyMap.tsx`). That stays simple.
- Don't add new dependencies. Use react-map-gl, mapbox-gl, and CSS — all already installed.
- Don't change the volunteer count from 5 (more dots clutter the map; fewer kills the "convergence" effect).
- Don't make volunteers smarter — no path-finding around buildings, just straight-line interp.
- Don't introduce new TypeScript errors. After the changes, `npx tsc --noEmit` must pass with the same baseline as before.
- Don't break the existing PARALLEL bracket logic. Volunteer state changes must NOT generate events that pollute the activity feed; they should change positions silently.
- Don't loop the animation — once arrived, volunteers stay at emergency. Don't bounce them or wiggle.

### Acceptance criteria

You're done when ALL of these hold:

1. `npm run dev` starts without errors.
2. `/demo` loads. Click any scenario → Run.
3. 5 volunteer dots visible at start, scattered across campus.
4. Volunteers visibly move from start positions to emergency over 2-5 seconds, with staggered arrival times.
5. Drone marker has a small AED package badge above it.
6. When drone arrives at emergency, AED package "drops" with bounce animation, then stays as a static yellow AED icon.
7. Emergency pulse gains a gold outer ring once AED is on scene.
8. EMS marker animates from LAFD Station 37 to emergency, slower than drone.
9. Hospital marker briefly pulses around t=7s.
10. Reset button clears all animations cleanly.
11. `prefers-reduced-motion: reduce` disables animations but positions still update.
12. No new TypeScript errors. No new dependencies. No console errors during scenario playback.
13. PARALLEL bracket in activity feed still works exactly as before — events same shape, same parallel grouping.
14. /demo MongoDB persistence indicator (added in earlier phase) still works.

### Final deliverable

Return:

- One line per file modified with line-count delta.
- Confirmation: "PARALLEL bracket grouping unchanged; metronome unaffected; MongoDB persistence still triggers at end."
- A short demo narrative — the 1-2 sentences you'd read aloud while showing this animation to a judge.
