# Claude Code prompt — Add MongoDB Atlas for FHIR handoff persistence + clean up dead Supabase code

> Paste everything below the `---` line into Claude Code.
> Run from the repo root: `/Users/emilysun/Downloads/CardicLinkNew-master/`.
> Switch to Opus 4.6 first: `/model claude-opus-4-6`.
>
> **Prerequisites the user does FIRST (15 min, before pasting this prompt):**
> 1. Sign up at mongodb.com/cloud/atlas (free)
> 2. Create a free M0 cluster, region `aws / us-west-2`
> 3. Create a database user with username/password
> 4. Network Access → Add IP `0.0.0.0/0` (hackathon-only; tighten later)
> 5. Get the connection string from "Connect → Drivers → Node.js" — looks like `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true`
> 6. Paste it into `here/.env.local` as `MONGODB_URI=...`. **Do NOT prefix with NEXT_PUBLIC_** — this is server-side only.

---

## CardiacLink — MongoDB Atlas integration + Supabase dead-code cleanup

### Mission

Two things in one round, ordered to minimize blast radius:

**Part A (cleanup, 30 min):** Delete the 5 dead Supabase code files that are causing 252 TypeScript errors and blocking `npm run build`. They are NOT in the demo critical path — verified during audit. After deletion, `npm run build` should succeed.

**Part B (MongoDB integration, ~3 hours):** Wire MongoDB Atlas in as the persistence layer for FHIR R4 handoff bundles emitted at session end. This:
- Wins the **MLH × MongoDB Atlas** swag track (M5Stack IoT Kit per team member).
- Adds a real "medical-grade audit log" story to the pitch (FHIR R4 + MongoDB Atlas).
- Doesn't touch the demo-critical-path code (telemetry hook, dispatch page, CPR metronome stay untouched).

### Phases

Work through Phase 1 → 7 sequentially. Commit after each phase.

---

### Phase 1 — Verify and delete dead Supabase code (30 min)

**Goal:** make `npm run build` succeed by removing files that don't compile and aren't used.

#### 1a. Verify each file is truly unused

For each of these files, run `grep -r` to confirm nothing imports them outside their own directory:

```bash
cd /Users/emilysun/Downloads/CardicLinkNew-master

# These should each return ZERO results (other than the file itself):
grep -r "from '@/lib/agents/aed'"        --include="*.tsx" --include="*.ts" .
grep -r "from '@/lib/agents/cpr'"        --include="*.tsx" --include="*.ts" .
grep -r "from '@/lib/agents/location'"   --include="*.tsx" --include="*.ts" .
grep -r "from '@/lib/agents/responder'"  --include="*.tsx" --include="*.ts" .
grep -r "TriggerButton"                  --include="*.tsx" --include="*.ts" .

# Also check for ./lib/agents/ relative imports
grep -r "lib/agents/aed"        --include="*.tsx" --include="*.ts" .
grep -r "lib/agents/cpr"        --include="*.tsx" --include="*.ts" .
grep -r "lib/agents/location"   --include="*.tsx" --include="*.ts" .
grep -r "lib/agents/responder"  --include="*.tsx" --include="*.ts" .
```

**If a grep returns ANY non-self results**, do NOT delete that file — instead, report which file imports it and stop the phase. The user will decide whether the import is meaningful or also dead.

**If all greps come back clean**, proceed to deletion.

#### 1b. Delete the dead files

```bash
git rm lib/agents/aed.ts
git rm lib/agents/cpr.ts
git rm lib/agents/location.ts
git rm lib/agents/responder.ts
git rm components/TriggerButton.tsx

# If lib/agents/ becomes empty, leave it for now — Phase 2 might reuse the path
ls lib/agents/   # report what's left
```

#### 1c. Fix the leaflet CSS import error in NearbyAedMap

`components/NearbyAedMap.tsx` line 62 imports `'leaflet/dist/leaflet.css'` in a way that fails Next.js's typing. Replace the dynamic `import()` with a static side-effect import at the top of the file:

```typescript
// At top of NearbyAedMap.tsx, alongside other imports:
import 'leaflet/dist/leaflet.css';

// Remove the inline dynamic import on line 62
```

#### 1d. Verify the build

```bash
npm run build 2>&1 | tail -30
```

Expected outcome: build succeeds OR fails with ≤5 remaining errors. If ≥10 errors remain, something else is wrong — report and stop.

If a small number of errors remain, fix them inline (likely they're related to the Supabase deletions cascading). Do NOT add `// @ts-ignore` — fix properly.

#### Commit

```bash
git add -A
git commit -m "phase 1: delete dead Supabase code, fix leaflet CSS import — build passes"
```

---

### Phase 2 — MongoDB Atlas client setup (30 min)

**Goal:** server-side MongoDB connection with proper Next.js connection pooling.

#### 2a. Install the MongoDB driver

```bash
npm install mongodb
```

Do NOT install Mongoose — we don't need a schema layer; FHIR Bundles are well-typed in TypeScript already and benefit from MongoDB's flexible document model.

#### 2b. Create `lib/mongo/client.ts`

Next.js + MongoDB best practice: cache the client across hot-reloads in dev and across Lambda invocations in prod.

```typescript
// lib/mongo/client.ts
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'cardiaclink';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient(): Promise<MongoClient> | null {
  if (!uri) {
    // Graceful degradation — handoff persistence is optional
    return null;
  }
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(dbName);
}

export const HANDOFF_COLLECTION = 'handoff_bundles';
```

The `getDb()` function returns `null` when MONGODB_URI is unset. **Every caller MUST handle null gracefully** — if MongoDB is down or unconfigured, the app continues working without persistence. This is critical for demo robustness.

#### 2c. Update `.env.local.example`

Add these lines (don't remove existing ones):

```
# MongoDB Atlas (for FHIR R4 handoff bundle persistence)
# Get a free M0 cluster at https://cloud.mongodb.com/
# IMPORTANT: Set 0.0.0.0/0 in Atlas Network Access for demo. Tighten for prod.
# Server-side only — do NOT add NEXT_PUBLIC_ prefix.
MONGODB_URI=
MONGODB_DB=cardiaclink

# Twilio (used by FastAPI backend for volunteer notifications)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TEXTBELT_API_KEY=

# Redis (future: for SSE pub/sub when bus runs separately)
REDIS_URL=
```

#### 2d. Quick connection test

Create `scripts/test-mongo.ts`:

```typescript
import 'dotenv/config';
import { getDb } from '../lib/mongo/client';

(async () => {
  const db = await getDb();
  if (!db) { console.error('MONGODB_URI not set'); process.exit(1); }
  const result = await db.command({ ping: 1 });
  console.log('Mongo ping:', result);
  process.exit(0);
})();
```

Add to `package.json` scripts:

```json
"scripts": {
  ...,
  "test:mongo": "tsx --env-file=.env.local scripts/test-mongo.ts"
}
```

Run `npm run test:mongo`. Expected output: `Mongo ping: { ok: 1 }`. If it fails, report the error and stop the phase — don't continue if the connection isn't proven.

#### Commit

```bash
git add -A
git commit -m "phase 2: MongoDB client + env config + connection ping test"
```

---

### Phase 3 — FHIR R4 Bundle builder (45 min)

**Goal:** convert a `ScenarioState` (from `useEmergencyTelemetry`) into a properly-shaped FHIR R4 Bundle ready for MongoDB storage.

#### 3a. Type definitions

Create `lib/fhir/types.ts`:

```typescript
// Minimal FHIR R4 types — just the resources we use.
// Reference: https://www.hl7.org/fhir/R4

export interface FhirReference {
  reference: string;     // e.g. "Patient/anon-12345"
}

export interface FhirCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  // No PII — anonymous record only
}

export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'finished' | 'in-progress';
  class: { code: 'EMER'; display: 'emergency' };
  subject: FhirReference;
  period: { start: string; end?: string };
  location?: Array<{
    location: FhirReference;
    period?: { start: string; end?: string };
  }>;
  serviceProvider?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final' | 'preliminary';
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
}

export interface FhirProcedure {
  resourceType: 'Procedure';
  id: string;
  status: 'completed' | 'in-progress';
  code: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  performedPeriod?: { start: string; end?: string };
}

export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirPatient | FhirEncounter | FhirObservation | FhirProcedure;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'document' | 'message' | 'transaction' | 'collection';
  timestamp: string;
  entry: FhirBundleEntry[];
}
```

#### 3b. Bundle builder

Create `lib/fhir/buildBundle.ts`:

```typescript
import type { ScenarioState } from '../useEmergencyTelemetry';
import type {
  FhirBundle,
  FhirPatient,
  FhirEncounter,
  FhirObservation,
  FhirProcedure,
  FhirBundleEntry,
} from './types';

function uuid() {
  // Simple UUID-ish — not cryptographically secure, but distinct.
  return crypto.randomUUID();
}

export function buildHandoffBundle(state: ScenarioState, scenarioName: string): FhirBundle {
  const bundleId = uuid();
  const patientId = `anon-${uuid()}`;
  const encounterId = uuid();
  const startTime = new Date(Date.now() - state.elapsed * 1000).toISOString();
  const endTime = new Date().toISOString();

  const patient: FhirPatient = {
    resourceType: 'Patient',
    id: patientId,
    identifier: [
      { system: 'urn:cardiaclink:session', value: bundleId },
    ],
  };

  const encounter: FhirEncounter = {
    resourceType: 'Encounter',
    id: encounterId,
    status: 'finished',
    class: { code: 'EMER', display: 'emergency' },
    subject: { reference: `Patient/${patientId}` },
    period: { start: startTime, end: endTime },
    location: state.hospital ? [{
      location: { reference: `Location/${state.hospital.name.replace(/\s+/g, '-')}` },
    }] : undefined,
    reasonCode: [{
      coding: [{
        system: 'http://snomed.info/sct',
        code: '410429000',
        display: 'Cardiac arrest',
      }],
      text: scenarioName,
    }],
  };

  const observations: FhirObservation[] = [];

  // Compression rate observation (CPR was at 110 BPM)
  observations.push({
    resourceType: 'Observation',
    id: uuid(),
    status: 'final',
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '8867-4',
        display: 'Heart rate',
      }],
      text: 'CPR compression rate (target)',
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: endTime,
    valueQuantity: { value: 110, unit: '/min', system: 'http://unitsofmeasure.org', code: '/min' },
  });

  // Compressions delivered (estimate: 110 BPM * elapsed_minutes_during_cpr)
  // For demo simplicity: assume CPR was active for half the elapsed time
  const cprMinutes = (state.elapsed / 60) * 0.5;
  observations.push({
    resourceType: 'Observation',
    id: uuid(),
    status: 'final',
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: '67708-4',
        display: 'CPR compressions delivered',
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: endTime,
    valueQuantity: { value: Math.round(cprMinutes * 110), unit: 'compressions' },
  });

  // AED used flag
  observations.push({
    resourceType: 'Observation',
    id: uuid(),
    status: 'final',
    code: {
      coding: [{
        system: 'urn:cardiaclink:event',
        code: 'aed-deployed',
        display: 'AED deployed by drone',
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    effectiveDateTime: endTime,
    valueBoolean: state.drone?.status === 'delivered',
  });

  // Drone delivery time observation
  if (state.drone) {
    observations.push({
      resourceType: 'Observation',
      id: uuid(),
      status: 'final',
      code: {
        coding: [{
          system: 'urn:cardiaclink:event',
          code: 'drone-delivery-eta',
          display: 'Drone-delivered AED ETA at session start',
        }],
      },
      subject: { reference: `Patient/${patientId}` },
      encounter: { reference: `Encounter/${encounterId}` },
      effectiveDateTime: endTime,
      valueQuantity: { value: state.drone.eta_seconds, unit: 's' },
    });
  }

  // CPR procedure
  const procedure: FhirProcedure = {
    resourceType: 'Procedure',
    id: uuid(),
    status: 'completed',
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: '89666000',
        display: 'Cardiopulmonary resuscitation',
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    performedPeriod: { start: startTime, end: endTime },
  };

  const entries: FhirBundleEntry[] = [
    { fullUrl: `urn:uuid:${patientId}`, resource: patient },
    { fullUrl: `urn:uuid:${encounterId}`, resource: encounter },
    ...observations.map(o => ({ fullUrl: `urn:uuid:${o.id}`, resource: o })),
    { fullUrl: `urn:uuid:${procedure.id}`, resource: procedure },
  ];

  return {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp: endTime,
    entry: entries,
  };
}
```

#### Commit

```bash
git add -A
git commit -m "phase 3: FHIR R4 Bundle builder + types"
```

---

### Phase 4 — API routes for handoff persistence (30 min)

**Goal:** server-side endpoints to write and read FHIR Bundles in MongoDB.

#### 4a. POST /api/handoff — write a new bundle

Create `app/api/handoff/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getDb, HANDOFF_COLLECTION } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';

interface PostBody {
  bundle: object;        // FhirBundle — already validated client-side
  scenario: string;
  receivingHospital?: string;
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.bundle || typeof body.bundle !== 'object') {
    return NextResponse.json({ error: 'missing_bundle' }, { status: 400 });
  }

  const db = await getDb();
  if (!db) {
    // Graceful degradation — return success but flag that persistence is unavailable
    return NextResponse.json({
      stored: false,
      reason: 'mongo_unconfigured',
      hint: 'Set MONGODB_URI in .env.local to enable persistence',
    }, { status: 200 });
  }

  const doc = {
    bundle: body.bundle,
    scenario: body.scenario,
    receivingHospital: body.receivingHospital ?? null,
    storedAt: new Date(),
  };

  const result = await db.collection(HANDOFF_COLLECTION).insertOne(doc);

  return NextResponse.json({
    stored: true,
    id: String(result.insertedId),
    storedAt: doc.storedAt.toISOString(),
  });
}

export async function GET() {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ available: false, count: 0, recent: [] });
  }

  const total = await db.collection(HANDOFF_COLLECTION).countDocuments();
  const recent = await db.collection(HANDOFF_COLLECTION)
    .find({}, { projection: { 'bundle.id': 1, scenario: 1, receivingHospital: 1, storedAt: 1 } })
    .sort({ storedAt: -1 })
    .limit(10)
    .toArray();

  return NextResponse.json({
    available: true,
    count: total,
    recent: recent.map(r => ({
      id: String(r._id),
      bundleId: (r as any).bundle?.id,
      scenario: r.scenario,
      receivingHospital: r.receivingHospital,
      storedAt: r.storedAt,
    })),
  });
}
```

#### 4b. GET /api/handoff/[id] — fetch a specific bundle (for the data-sources page)

Create `app/api/handoff/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, HANDOFF_COLLECTION } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  if (!db) return NextResponse.json({ available: false }, { status: 200 });

  let oid: ObjectId;
  try { oid = new ObjectId(params.id); }
  catch { return NextResponse.json({ error: 'invalid_id' }, { status: 400 }); }

  const doc = await db.collection(HANDOFF_COLLECTION).findOne({ _id: oid });
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json(doc);
}
```

#### Commit

```bash
git add -A
git commit -m "phase 4: handoff API routes — POST to persist, GET to list/fetch FHIR bundles"
```

---

### Phase 5 — Wire telemetry hook to persist on resolution (30 min)

**Goal:** when a scenario reaches `phase === 'resolved'`, automatically POST the handoff bundle to MongoDB.

#### 5a. Modify `lib/useEmergencyTelemetry.ts`

Add at the top of the file:

```typescript
import { buildHandoffBundle } from './fhir/buildBundle';
```

Add a new state field to `ScenarioState`:

```typescript
// In the ScenarioState interface, add:
persistence: {
  status: 'idle' | 'persisting' | 'persisted' | 'failed' | 'unavailable';
  recordId: string | null;
  error?: string;
};
```

Initialize it in `INITIAL_STATE`:

```typescript
persistence: { status: 'idle', recordId: null },
```

In the phase callback that sets `phase: 'resolved'` (the last phase in the playback), after setting state, fire the persist call:

```typescript
// After existing setState call that sets phase: 'resolved':
const bundle = buildHandoffBundle(
  { ...state, phase: 'resolved' },  // pass current snapshot
  scenario.name,
);

setState(prev => ({ ...prev, persistence: { status: 'persisting', recordId: null } }));

fetch('/api/handoff', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bundle,
    scenario: scenario.name,
    receivingHospital: state.hospital?.name,
  }),
})
  .then(r => r.json())
  .then(result => {
    if (result.stored) {
      setState(prev => ({ ...prev, persistence: { status: 'persisted', recordId: result.id } }));
    } else if (result.reason === 'mongo_unconfigured') {
      setState(prev => ({ ...prev, persistence: { status: 'unavailable', recordId: null } }));
    } else {
      setState(prev => ({ ...prev, persistence: { status: 'failed', recordId: null, error: result.error } }));
    }
  })
  .catch(err => {
    setState(prev => ({ ...prev, persistence: { status: 'failed', recordId: null, error: String(err) } }));
  });
```

**Important constraints**:
- The metronome / Web Audio code is NOT touched.
- The agent activity feed is NOT touched.
- The Mapbox map is NOT touched.
- The persistence call is fire-and-forget; failure does NOT block UI updates.

#### Commit

```bash
git add -A
git commit -m "phase 5: telemetry hook persists FHIR bundle to MongoDB on resolution"
```

---

### Phase 6 — Demo-visible UI (45 min)

**Goal:** judges should SEE that MongoDB is being used. Two surfaces.

#### 6a. OrchestrationDrawer footer badge

In `components/OrchestrationDrawer.tsx`, add a small status row at the bottom of the drawer (above existing footer if any):

```tsx
{/* Persistence status — visible during demo */}
<div className="border-t border-zinc-800 px-3 py-2 flex items-center gap-2 text-[10px]">
  {state.persistence.status === 'idle' && (
    <span className="text-zinc-600">FHIR R4 audit log: pending session end</span>
  )}
  {state.persistence.status === 'persisting' && (
    <>
      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      <span className="text-yellow-400">Persisting FHIR Bundle to MongoDB Atlas…</span>
    </>
  )}
  {state.persistence.status === 'persisted' && (
    <>
      <div className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-emerald-400">FHIR R4 Bundle stored in MongoDB Atlas</span>
      <span className="text-zinc-500 font-mono ml-1">id: {state.persistence.recordId?.slice(-8)}</span>
    </>
  )}
  {state.persistence.status === 'unavailable' && (
    <span className="text-zinc-500">MongoDB not configured (set MONGODB_URI)</span>
  )}
  {state.persistence.status === 'failed' && (
    <>
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-red-400">Persistence failed</span>
    </>
  )}
</div>
```

This row makes the persistence visible to anyone watching the drawer during the pitch. The state pulses yellow → green over ~1 second when the resolution event fires.

#### 6b. Recent handoffs section on /data-sources

In `app/data-sources/page.tsx`, add a new section at the top (or after the "AED locations" section):

```tsx
'use client';
// ... existing imports
import { useEffect, useState } from 'react';

// Inside the component:
const [handoffs, setHandoffs] = useState<{ available: boolean; count: number; recent: any[] }>({
  available: false,
  count: 0,
  recent: [],
});

useEffect(() => {
  fetch('/api/handoff').then(r => r.json()).then(setHandoffs);
}, []);

return (
  <div /* existing wrapper */>
    {/* New section, near the top: */}
    <Section title="Patient handoff bundles (FHIR R4 · MongoDB Atlas)">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        {!handoffs.available && (
          <div className="text-xs text-zinc-500">
            MongoDB Atlas not configured. Set <code className="bg-zinc-800 px-1 py-0.5 rounded">MONGODB_URI</code>
            in <code className="bg-zinc-800 px-1 py-0.5 rounded">.env.local</code> to enable.
          </div>
        )}
        {handoffs.available && (
          <>
            <div className="text-sm text-zinc-200 font-medium mb-2">
              {handoffs.count} bundle{handoffs.count === 1 ? '' : 's'} persisted to MongoDB Atlas
            </div>
            {handoffs.recent.length === 0 && (
              <div className="text-xs text-zinc-500">No bundles stored yet — run a scenario at /demo and let it complete.</div>
            )}
            {handoffs.recent.length > 0 && (
              <div className="space-y-1.5">
                {handoffs.recent.map((h) => (
                  <div key={h.id} className="text-xs flex items-center justify-between border-t border-zinc-800/60 pt-1.5">
                    <div>
                      <span className="text-zinc-300">{h.scenario}</span>
                      <span className="text-zinc-600 ml-2">→ {h.receivingHospital ?? 'no hospital'}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {new Date(h.storedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-[10px] text-zinc-600">
              Each bundle contains Patient, Encounter, Observation, and Procedure resources.
              Persisted on session end. Shape conforms to HL7 FHIR R4 Bundle.
            </div>
          </>
        )}
      </div>
    </Section>

    {/* ... existing Sections ... */}
  </div>
);
```

#### 6c. Demo header counter

In `app/demo/page.tsx`, add a small badge in the top bar that fetches the bundle count once on mount:

```tsx
const [bundleCount, setBundleCount] = useState<number | null>(null);

useEffect(() => {
  fetch('/api/handoff')
    .then(r => r.json())
    .then(d => setBundleCount(d.available ? d.count : null));
}, []);

// In the JSX header, alongside the "8 agents online" indicator:
{bundleCount !== null && (
  <span className="text-[10px] text-zinc-500 font-mono">
    {bundleCount} FHIR bundle{bundleCount === 1 ? '' : 's'} in Mongo
  </span>
)}
```

#### Commit

```bash
git add -A
git commit -m "phase 6: demo-visible MongoDB persistence — drawer badge + data-sources section + header counter"
```

---

### Phase 7 — Demo script update + final verification (30 min)

#### 7a. Update DEMO_SCRIPT.md

Add a new section between the existing "Auto-advance to CPR" and "Show Demo Orchestration View" beats:

```markdown
### 3.5 Show MongoDB persistence (5s, optional but recommended)

After the CPR scenario completes (auto-advances to /emergency/complete or returns to dashboard), open the Orchestration Drawer one more time.

- Footer shows green dot + "FHIR R4 Bundle stored in MongoDB Atlas · id: a8f3b2c1"
- Open a second tab to https://cloud.mongodb.com — show the actual document in the cardiaclink.handoff_bundles collection
- Each bundle contains Patient, Encounter, Observation, and Procedure resources matching HL7 FHIR R4

**Talking point**: "When the session ends, the handoff agent persists a FHIR R4 Bundle to MongoDB Atlas. This is the same shape a hospital EHR would consume via FHIR — it's our integration story for chain-of-care continuity."
```

Also add a new bullet to "Key talking points":

```markdown
- **MongoDB Atlas + FHIR R4**: Each session writes a HL7 FHIR-compliant Bundle to MongoDB. Demonstrates the medical-grade audit trail and chain-of-care integration. (MLH × MongoDB Atlas track.)
```

#### 7b. Update INTEGRATION_REPORT.md

Add a new section at the bottom:

```markdown
## MongoDB Atlas Integration (Phase 8)

| File | Purpose |
|------|---------|
| `lib/mongo/client.ts` | MongoDB connection with Next.js connection pooling |
| `lib/fhir/types.ts` | FHIR R4 type definitions |
| `lib/fhir/buildBundle.ts` | ScenarioState → FHIR Bundle converter |
| `app/api/handoff/route.ts` | POST persist + GET list |
| `app/api/handoff/[id]/route.ts` | GET single bundle |

Persistence is fire-and-forget on `phase === 'resolved'`. If MONGODB_URI is unset, persistence is gracefully skipped — the demo still works. Demo-visible UI in OrchestrationDrawer footer + /data-sources section + header counter.

Wins MLH × MongoDB Atlas track.
```

#### 7c. Smoke test

Run through this manually:

1. `npm run dev` — server starts, no errors.
2. Open `http://localhost:3000/demo`. Run any scenario. Watch the Orchestration Drawer.
3. After the scenario completes (~8 seconds), the drawer footer should show "FHIR R4 Bundle stored in MongoDB Atlas".
4. Visit `http://localhost:3000/data-sources`. Should see "1 bundle persisted" and the recent entry.
5. Visit `http://localhost:3000/api/handoff` directly in browser — should return JSON with `count: 1` and the recent record.
6. Run another scenario, verify count increments.
7. Open https://cloud.mongodb.com → your cluster → Browse Collections → `cardiaclink.handoff_bundles`. Should see the documents.

If any of these fail, fix before committing the phase.

#### 7d. Final build check

```bash
npm run build 2>&1 | tail -20
```

Must succeed with 0 errors.

#### Commit

```bash
git add -A
git commit -m "phase 7: demo script + integration report updates + smoke test verified"
```

---

### Final deliverable (return at end)

```
PHASES COMPLETED: <N> / 7

DEAD CODE DELETED:
- lib/agents/aed.ts (X lines)
- lib/agents/cpr.ts (X lines)
- ...

NEW FILES:
- lib/mongo/client.ts (X lines)
- lib/fhir/types.ts (X lines)
- ...

MODIFIED FILES:
- lib/useEmergencyTelemetry.ts (+X lines)
- components/OrchestrationDrawer.tsx (+X lines)
- ...

BUILD STATUS: <pass / fail>
MONGO PING: <success / failed>
SMOKE TEST: <X of 7 manual steps passed>

NEXT MANUAL STEPS for the user:
1. Verify a real bundle appears in MongoDB Atlas UI
2. Update Vercel env vars (MONGODB_URI) before deploy
3. Record DEMO_SCRIPT walkthrough including the new MongoDB beat
4. Tighten Atlas Network Access from 0.0.0.0/0 to specific IPs after demo
```

### What NOT to do

- Don't migrate `app/api/emergency/start` route from Supabase to MongoDB. Leave that route as-is even if it has Supabase imports — only delete the files explicitly listed in Phase 1.
- Don't replace sessionStorage with MongoDB. SessionStorage handles cross-page state during the bystander flow — that's a different concern from audit persistence.
- Don't add Mongoose. MongoDB native driver is faster and avoids schema overhead.
- Don't store PII in the Patient resource. The `id: anon-<uuid>` pattern is intentional.
- Don't expose MONGODB_URI on the client. Server-side only. No NEXT_PUBLIC_ prefix.
- Don't modify `useBusTelemetry` (already renamed in earlier phases — should be `useEmergencyTelemetry`).
- Don't modify the metronome scheduler, voice agent, or Mapbox layers.
- Don't break /demo, /emergency/dispatch, /emergency/cpr, or any existing route.
- Don't try to write to MongoDB from the browser — always go through the `/api/handoff` route.
- Don't make persistence blocking. If MongoDB takes 30 seconds to respond, the UI must NOT freeze.
- Don't create a fake Mongo connection during build — the `getMongoClient` function should return null when MONGODB_URI is unset, and all callers must handle null.
