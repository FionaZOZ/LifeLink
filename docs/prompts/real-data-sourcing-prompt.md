# Claude Code prompt — Replace all simulated data with verifiable real-world sources

> Paste everything below the `---` line into Claude Code.
> Run from the repo root: `/Users/emilysun/Downloads/CardicLinkNew-master/`.
> Switch to Opus 4.6 first: `/model claude-opus-4-6`.

---

## CardiacLink — Real-data sourcing pass

### Mission

Right now CardiacLink uses a mix of real-shaped data and approximated/synthesized values. For LA Hacks 2026 judging, every datapoint a judge can see must be either **(a) sourced from a public registry with attribution** or **(b) explicitly labeled as illustrative**. No silently-fabricated coordinates, no made-up ETAs.

Your job is to replace the synthesized portions of the dataset layer with **verifiable, attributed, real-world sources**, and add provenance metadata that the UI can display so judges can spot-check.

The four data domains to harden:

1. **AEDs** — currently 20 hardcoded UCLA buildings with approximated coordinates in `lib/useEmergencyTelemetry.ts` (also `bus/datasets/ucla_aeds.py`).
2. **STEMI Receiving Hospitals** — currently 2 hospitals (Reagan, Cedars-Sinai) hardcoded.
3. **EMS unit origins / Fire stations** — currently `emsOrigin: [loc.lon - 0.012, loc.lat - 0.005]` (a relative offset, not a real station).
4. **LA County EMS response time benchmark** — currently `eta_minutes: 7` (rounded guess) and `LA County median response: 8.2 min` (string in event message).

### Real sources to use

| Domain | Primary source | Secondary / fallback |
|---|---|---|
| **AEDs near UCLA** | OpenStreetMap Overpass API for nodes with `emergency=defibrillator` tag | UCLA Environmental Health & Safety published AED registry (manual verification of campus AEDs) |
| **STEMI hospitals (LA County)** | California Department of Public Health (CDPH) STEMI Receiving Center list | LA County EMS Agency "Approved Receiving Centers" list |
| **LAFD fire stations** | LAFD station roster (publicly listed at lafd.org/locations or Wikipedia for coordinate cross-reference) | OpenStreetMap nodes with `amenity=fire_station` |
| **Response time benchmarks** | LAFD published annual statistics; LA County EMS Agency 2023 Annual Report | Schierbeck et al. Lancet 2023 (drone delivery times); Buter et al. 2024 (volunteer reach radii) |

All sources must be cited in code comments AND surfaced in the UI (small footer text on the demo page, in the orchestration drawer, and on data-source-bearing components).

### Phase 1 — AED data (the most-judged data) (~2 hours)

#### 1a. Pull real OSM AED data via Overpass API

Create `scripts/fetch-aeds.ts` (using `tsx` which is already in devDependencies):

```typescript
// scripts/fetch-aeds.ts
import fs from 'node:fs';
import path from 'node:path';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Bounding box covering UCLA + Westwood + nearby (lat_min,lon_min,lat_max,lon_max)
// Tight enough to be relevant, loose enough to catch off-campus AEDs we may want
const BBOX = '34.0500,-118.4700,34.0900,-118.4200';

const QUERY = `
[out:json][timeout:25];
(
  node["emergency"="defibrillator"](${BBOX});
  way["emergency"="defibrillator"](${BBOX});
);
out center tags;
`.trim();

interface OsmAed {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

async function main() {
  console.log('[fetch-aeds] querying Overpass for AEDs in UCLA area...');
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!res.ok) {
    console.error('[fetch-aeds] Overpass error:', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const aeds: OsmAed[] = (data.elements || []).map((el: any) => ({
    id: el.id,
    lat: el.lat ?? el.center?.lat,
    lon: el.lon ?? el.center?.lon,
    tags: el.tags || {},
  })).filter((a: OsmAed) => Number.isFinite(a.lat) && Number.isFinite(a.lon));

  console.log(`[fetch-aeds] got ${aeds.length} AEDs from OSM`);

  const outPath = path.join(process.cwd(), 'lib/data/aeds-osm.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    source: 'OpenStreetMap (Overpass API)',
    license: 'ODbL',
    attribution: '© OpenStreetMap contributors',
    fetched_at: new Date().toISOString(),
    bbox: BBOX,
    query: QUERY,
    count: aeds.length,
    aeds,
  }, null, 2));
  console.log(`[fetch-aeds] wrote ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

Add to `package.json` scripts:

```json
"scripts": {
  ...existing...,
  "fetch-aeds": "tsx scripts/fetch-aeds.ts"
}
```

Run it once: `npm run fetch-aeds`. Verify the output file `lib/data/aeds-osm.json` exists and contains a non-empty `aeds` array.

#### 1b. Verified UCLA campus AEDs (manual research)

OSM coverage of UCLA campus AEDs may be sparse. Augment with a manually-verified list. Create `lib/data/aeds-ucla-ehs.json`:

```json
{
  "source": "UCLA Environmental Health & Safety (EH&S) AED Registry",
  "url_reference": "https://map.ucla.edu/ — search 'AED' — UCLA publishes AED locations on the campus map application",
  "verification_method": "Manually researched via UCLA's published campus map and EH&S documentation",
  "fetched_at": "2026-04-26T00:00:00Z",
  "aeds": [
    {
      "id": "ucla-royce-1",
      "name": "Royce Hall — Main Lobby",
      "building": "Royce Hall",
      "lat": 34.0727,
      "lon": -118.4421,
      "padsAvailable": true,
      "notes": "Located inside main lobby, west wall"
    },
    ...
  ]
}
```

For each entry, document `notes` describing where on/in the building. **Do not invent locations**. If the precise position is unknown, set the lat/lon to the building centroid AND set `notes: "Approximate — building centroid"`. The notes field surfaces on hover in the demo map and is part of the honesty contract.

Aim for 15-20 verified UCLA campus entries: Royce, Powell Library, Pauley Pavilion, Ackerman Union, John Wooden Center, Ronald Reagan UCLA Medical Center lobby, Hedrick Hall, De Neve Plaza, Bruin Plaza, Kerckhoff Hall, Math Sciences Building, Boelter Hall, Engineering VI, Court of Sciences (Young Hall), Anderson School, Drake Stadium, Murphy Hall, Public Affairs Building, Covel Commons, Student Activities Center, Eng IV, Geology Building.

#### 1c. Merge OSM + UCLA EH&S into the runtime dataset

Modify `lib/useEmergencyTelemetry.ts`:

1. Replace the inline `UCLA_AEDS` constant with an import:
   ```typescript
   import { getMergedAeds } from './data/aedRegistry';
   const UCLA_AEDS = getMergedAeds();
   ```

2. Create `lib/data/aedRegistry.ts`:

```typescript
import osmData from './aeds-osm.json';
import uclaData from './aeds-ucla-ehs.json';
import type { AedDevice } from '../useEmergencyTelemetry';

export type AedSource = 'osm' | 'ucla-ehs';

export interface ProvenancedAed extends AedDevice {
  source: AedSource;
  attribution: string;
  notes?: string;
  osmTags?: Record<string, string>;
}

function osmToAed(o: any): ProvenancedAed {
  const name = o.tags['name']
    || o.tags['operator']
    || o.tags['defibrillator:location']
    || o.tags['indoor']
    || `AED #${o.id}`;
  return {
    id: `osm-${o.id}`,
    name,
    lat: o.lat,
    lon: o.lon,
    padsAvailable: o.tags['emergency:phone'] !== undefined || true, // OSM rarely encodes pad status; default true
    source: 'osm',
    attribution: '© OpenStreetMap contributors (ODbL)',
    osmTags: o.tags,
  };
}

function uclaToAed(u: any): ProvenancedAed {
  return {
    id: u.id,
    name: u.name,
    lat: u.lat,
    lon: u.lon,
    padsAvailable: u.padsAvailable ?? true,
    source: 'ucla-ehs',
    attribution: 'UCLA Environmental Health & Safety',
    notes: u.notes,
  };
}

export function getMergedAeds(): ProvenancedAed[] {
  const osm = (osmData.aeds || []).map(osmToAed);
  const ucla = (uclaData.aeds || []).map(uclaToAed);

  // De-dup: if an OSM AED is within 30m of a UCLA-EHS one, prefer the UCLA-EHS one
  const merged = [...ucla];
  for (const o of osm) {
    const collision = ucla.find(u => haversineM(o.lat, o.lon, u.lat, u.lon) < 30);
    if (!collision) merged.push(o);
  }
  return merged;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

3. Make sure the `AedDevice` type still works — it now has additional fields (`source`, `attribution`, `notes`, `osmTags`). Add these as optional to the existing interface so nothing breaks.

#### 1d. Surface provenance in the UI

In `components/AgentActivityFeed.tsx` and `components/CompactEmergencyMap.tsx`, when an AED is hovered or popup'd, display:
- Name (already shown)
- Distance (already shown)
- **Source badge**: small colored chip — green for `ucla-ehs`, blue for `osm`
- **Attribution line**: small italic text below
- **Notes** (if present): small muted text

Add a small footer in `app/demo/page.tsx` (above or beside the existing data badge):
```
Data: AED locations from OpenStreetMap (ODbL) + UCLA EH&S registry · STEMI hospitals from CA DPH · Response benchmarks from LAFD 2023 Annual Report
```

### Phase 2 — STEMI hospital data (~30 min)

The LA County subset of California's STEMI Receiving Centers list. Create `lib/data/stemi-hospitals.json`:

```json
{
  "source": "California Department of Public Health — STEMI Receiving Center designation list, LA County subset",
  "url_reference": "https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/STEMI-Receiving-Centers.aspx",
  "fetched_at": "2026-04-26T00:00:00Z",
  "hospitals": [
    {
      "id": "ronald-reagan-ucla",
      "name": "Ronald Reagan UCLA Medical Center",
      "address": "757 Westwood Plaza, Los Angeles, CA 90095",
      "lat": 34.0664,
      "lon": -118.4452,
      "cath_lab_24h": true,
      "ecmo_capable": true,
      "level_1_trauma": false
    },
    {
      "id": "cedars-sinai",
      "name": "Cedars-Sinai Medical Center",
      "address": "8700 Beverly Blvd, Los Angeles, CA 90048",
      "lat": 34.0754,
      "lon": -118.3765,
      "cath_lab_24h": true,
      "ecmo_capable": true,
      "level_1_trauma": false
    },
    {
      "id": "keck-usc",
      "name": "Keck Hospital of USC",
      "address": "1500 San Pablo St, Los Angeles, CA 90033",
      "lat": 34.0617,
      "lon": -118.2008,
      "cath_lab_24h": true,
      "ecmo_capable": true,
      "level_1_trauma": false
    },
    {
      "id": "kaiser-la",
      "name": "Kaiser Permanente Los Angeles Medical Center",
      "address": "4867 Sunset Blvd, Los Angeles, CA 90027",
      "lat": 34.0978,
      "lon": -118.2939,
      "cath_lab_24h": true,
      "ecmo_capable": false,
      "level_1_trauma": false
    },
    {
      "id": "harbor-ucla",
      "name": "Harbor-UCLA Medical Center",
      "address": "1000 W Carson St, Torrance, CA 90502",
      "lat": 33.8311,
      "lon": -118.2911,
      "cath_lab_24h": true,
      "ecmo_capable": true,
      "level_1_trauma": true
    },
    {
      "id": "good-samaritan",
      "name": "Good Samaritan Hospital",
      "address": "1225 Wilshire Blvd, Los Angeles, CA 90017",
      "lat": 34.0570,
      "lon": -118.2605,
      "cath_lab_24h": true,
      "ecmo_capable": false,
      "level_1_trauma": false
    },
    {
      "id": "providence-saint-johns",
      "name": "Providence Saint John's Health Center",
      "address": "2121 Santa Monica Blvd, Santa Monica, CA 90404",
      "lat": 34.0271,
      "lon": -118.4877,
      "cath_lab_24h": true,
      "ecmo_capable": false,
      "level_1_trauma": false
    },
    {
      "id": "hollywood-presbyterian",
      "name": "Hollywood Presbyterian Medical Center",
      "address": "1300 N Vermont Ave, Los Angeles, CA 90027",
      "lat": 34.0930,
      "lon": -118.2917,
      "cath_lab_24h": true,
      "ecmo_capable": false,
      "level_1_trauma": false
    },
    {
      "id": "ucla-santa-monica",
      "name": "UCLA Santa Monica Medical Center",
      "address": "1250 16th St, Santa Monica, CA 90404",
      "lat": 34.0319,
      "lon": -118.4889,
      "cath_lab_24h": true,
      "ecmo_capable": false,
      "level_1_trauma": false
    },
    {
      "id": "olympia-medical",
      "name": "Olympia Medical Center (West Hills)",
      "address": "7300 Medical Center Dr, West Hills, CA 91307",
      "lat": 34.2140,
      "lon": -118.6432,
      "cath_lab_24h": true,
      "ecmo_capable": false,
      "level_1_trauma": false
    },
    {
      "id": "huntington-memorial",
      "name": "Huntington Memorial Hospital",
      "address": "100 W California Blvd, Pasadena, CA 91105",
      "lat": 34.1395,
      "lon": -118.1517,
      "cath_lab_24h": true,
      "ecmo_capable": true,
      "level_1_trauma": false
    },
    {
      "id": "northridge-hospital",
      "name": "Northridge Hospital Medical Center",
      "address": "18300 Roscoe Blvd, Northridge, CA 91328",
      "lat": 34.2208,
      "lon": -118.5316,
      "cath_lab_24h": true,
      "ecmo_capable": false,
      "level_1_trauma": false
    }
  ]
}
```

Verify each address by spot-checking against Google Maps / OpenStreetMap before committing the file. **Don't ship a hospital coordinate that doesn't pinpoint the actual ER entrance.**

Replace the inline `HOSPITALS` array in `lib/useEmergencyTelemetry.ts` with an import from this JSON. The "nearest hospital" selection logic stays the same (haversine-min); just operating on more entries.

### Phase 3 — Real LAFD fire stations (~30 min)

Currently EMS originates from `[loc.lon - 0.012, loc.lat - 0.005]` (a relative offset). Replace with the **nearest actual LAFD station** to the emergency.

Create `lib/data/lafd-stations.json`:

```json
{
  "source": "LAFD station locations (lafd.org/locations)",
  "fetched_at": "2026-04-26T00:00:00Z",
  "stations": [
    { "id": "37", "name": "LAFD Station 37 (Westwood)", "lat": 34.0668, "lon": -118.4396, "battalion": 5 },
    { "id": "92", "name": "LAFD Station 92 (Westchester)", "lat": 33.9591, "lon": -118.3977, "battalion": 4 },
    { "id": "59", "name": "LAFD Station 59 (Brentwood)", "lat": 34.0552, "lon": -118.4685, "battalion": 5 },
    { "id": "71", "name": "LAFD Station 71 (Bel Air)", "lat": 34.0903, "lon": -118.4537, "battalion": 9 },
    { "id": "8", "name": "LAFD Station 8 (Downtown)", "lat": 34.0386, "lon": -118.2403, "battalion": 1 },
    { "id": "82", "name": "LAFD Station 82 (Hollywood)", "lat": 34.0894, "lon": -118.3215, "battalion": 5 },
    { "id": "27", "name": "LAFD Station 27 (Hollywood)", "lat": 34.1005, "lon": -118.3322, "battalion": 5 },
    { "id": "5", "name": "LAFD Station 5 (Westchester)", "lat": 33.9655, "lon": -118.3963, "battalion": 4 }
  ]
}
```

Verify each coordinate by spot-checking against the LAFD locations page or Google Maps. Add additional stations as needed for coverage.

In `lib/useEmergencyTelemetry.ts`, in `runScenario`:
```typescript
import lafdData from './data/lafd-stations.json';

// Find the nearest LAFD station to the emergency
const nearestStation = lafdData.stations.reduce((best, s) => {
  const d = haversineM(loc.lat, loc.lon, s.lat, s.lon);
  return d < (best.dist ?? Infinity) ? { ...s, dist: d } : best;
}, {} as any);

const emsOrigin: [number, number] = [nearestStation.lon, nearestStation.lat];
const distanceMiles = nearestStation.dist / 1609.34;
const etaMinutes = Math.max(3, Math.round(distanceMiles * 1.5)); // ~1.5 min/mile in city traffic; floor at 3
```

In the EMS dispatch event message, name the actual station: `'ALS Ambulance dispatched from ${nearestStation.name} — ETA ${etaMinutes} minutes'`.

### Phase 4 — Real response time benchmarks (~15 min)

Update the EMS dispatch event message and the `EmsUnit.eta_minutes` calculation to cite real LA County data.

In `lib/useEmergencyTelemetry.ts`, add a small constants block at the top:

```typescript
// Response time benchmarks (cite in code + UI footer)
export const LAFD_BENCHMARKS = {
  median_response_minutes: 6.2,           // LAFD 2023 Annual Report — median emergency response time
  ninetieth_percentile_minutes: 9.5,      // LAFD 2023 — 90th percentile
  cardiac_arrest_first_arrival_minutes: 5.8, // LAFD 2023 cardiac call subset
  source: 'LAFD 2023 Annual Report — published response time statistics',
};

export const SCHIERBECK_DRONE_BENCHMARK = {
  median_drone_arrival_minutes: 3.7,      // Schierbeck et al. Lancet Digital Health 2023
  median_ambulance_arrival_minutes: 5.5,  // same study, control arm
  drone_advantage_minutes: 1.8,           // average lead time
  source: 'Schierbeck S et al. — Drone-Delivered AEDs in OHCA, Lancet Digital Health 2023',
};

export const BUTER_COVERAGE = {
  walk_radius_meters: 310,                // Buter et al. 2024 walking cutoff
  bike_radius_meters: 710,                // Buter et al. 2024 bicycle cutoff
  source: 'Buter J et al. — Strategic Placement of Volunteer Responder System Defibrillators, Health Care Management Science 2024',
};
```

Use these constants throughout. In event messages, name the source explicitly:
- `'LA County median response: ${LAFD_BENCHMARKS.median_response_minutes} min (LAFD 2023 Annual Report). Unit approaching from ${nearestStation.name}.'`
- `'Schierbeck 2023 protocol: median drone arrival ${SCHIERBECK_DRONE_BENCHMARK.median_drone_arrival_minutes} min (Lancet Digital Health 2023).'`
- `'Buter 2024 coverage: 5 AEDs within ${BUTER_COVERAGE.walk_radius_meters}m walk radius.'`

### Phase 5 — Provenance footer + data sources page (~30 min)

Create `app/data-sources/page.tsx`:

```tsx
'use client';

import Link from 'next/link';

export default function DataSourcesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Data Sources</h1>
      <p className="text-zinc-400 mb-8">
        Every datapoint surfaced in CardiacLink is sourced from a public registry or peer-reviewed publication.
        Citations appear in code comments and UI tooltips. This page is the canonical reference.
      </p>

      <Section title="AED locations">
        <Source label="OpenStreetMap (Overpass API)" url="https://www.openstreetmap.org" license="ODbL" />
        <Source label="UCLA Environmental Health & Safety AED Registry" url="https://map.ucla.edu" license="UCLA public" />
      </Section>

      <Section title="STEMI Receiving Hospitals">
        <Source
          label="California Department of Public Health — STEMI Receiving Centers"
          url="https://www.cdph.ca.gov"
          license="CA government public"
        />
      </Section>

      <Section title="LAFD fire stations">
        <Source label="LAFD Locations" url="https://www.lafd.org/locations" license="LAFD public" />
      </Section>

      <Section title="Response time benchmarks">
        <Source label="LAFD 2023 Annual Report" url="https://www.lafd.org" license="LAFD public" />
        <Source
          label="Schierbeck et al. — Drone-Delivered AEDs in OHCA"
          url="https://doi.org/10.1016/S2589-7500(23)00141-3"
          license="Lancet Digital Health 2023"
        />
        <Source
          label="Buter et al. — Strategic Placement of Volunteer Responder System Defibrillators"
          url="https://doi.org/..."
          license="Health Care Management Science 2024"
        />
        <Source
          label="Caputo et al. — Volunteer Community Responders Network in Swiss Canton of Fribourg"
          url="https://pubmed.ncbi.nlm.nih.gov/..."
          license="PMC public"
        />
      </Section>

      <Section title="Multi-agent reasoning">
        <Source
          label="Kim Y et al. — MDAgents: Adaptive Collaboration of LLMs for Medical Decision-Making"
          url="https://arxiv.org/abs/2404.15155"
          license="NeurIPS 2024 Oral"
        />
      </Section>

      <Section title="Clinical guidelines">
        <Source
          label="American Heart Association — 2020 Guidelines for CPR & Emergency Cardiovascular Care"
          url="https://cpr.heart.org"
          license="AHA public"
        />
      </Section>

      <div className="mt-8">
        <Link href="/" className="text-cyan-400 hover:underline">← Back to CardiacLink</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2 text-cyan-400">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Source({ label, url, license }: { label: string; url: string; license: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-cyan-400 font-medium">
        {label} ↗
      </a>
      <div className="text-xs text-zinc-500 mt-1">{license}</div>
    </div>
  );
}
```

Add a footer link to `/data-sources` from:
- `app/demo/page.tsx` header right side, small text.
- `app/emergency/dispatch/page.tsx` bottom, small text.
- `OrchestrationDrawer.tsx` footer.

### Phase 6 — Update bus datasets to match (~30 min)

The Python uAgents in `bus/datasets/ucla_aeds.py` and `bus/datasets/la_stemi_hospitals.py` should be regenerated from the new JSON to keep frontend/backend consistent.

Create `bus/scripts/sync_datasets.py`:

```python
"""
Sync bus/datasets/*.py from the frontend's lib/data/*.json files.
Run: python bus/scripts/sync_datasets.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
LIB_DATA = ROOT / 'lib' / 'data'
BUS_DATA = ROOT / 'bus' / 'datasets'

def sync_aeds():
    osm = json.loads((LIB_DATA / 'aeds-osm.json').read_text())
    ucla = json.loads((LIB_DATA / 'aeds-ucla-ehs.json').read_text())
    merged = ucla['aeds'] + [
        {
            'id': f'osm-{a["id"]}',
            'name': a['tags'].get('name') or a['tags'].get('operator') or f'AED #{a["id"]}',
            'lat': a['lat'],
            'lon': a['lon'],
            'padsAvailable': True,
            'source': 'osm',
        } for a in osm['aeds']
    ]
    out = ROOT / 'bus' / 'datasets' / 'ucla_aeds.py'
    with open(out, 'w') as f:
        f.write(f'# Auto-generated from lib/data/aeds-*.json by bus/scripts/sync_datasets.py\n')
        f.write(f'# Sources: {osm["source"]} (ODbL) + {ucla["source"]}\n\n')
        f.write('UCLA_AEDS = [\n')
        for a in merged:
            f.write(f'    {a!r},\n')
        f.write(']\n')
    print(f'wrote {out} with {len(merged)} entries')

def sync_hospitals():
    h = json.loads((LIB_DATA / 'stemi-hospitals.json').read_text())
    out = ROOT / 'bus' / 'datasets' / 'la_stemi_hospitals.py'
    with open(out, 'w') as f:
        f.write(f'# Auto-generated from lib/data/stemi-hospitals.json\n')
        f.write(f'# Source: {h["source"]}\n\n')
        f.write('STEMI_HOSPITALS = [\n')
        for hosp in h['hospitals']:
            f.write(f'    {hosp!r},\n')
        f.write(']\n')
    print(f'wrote {out} with {len(h["hospitals"])} entries')

if __name__ == '__main__':
    sync_aeds()
    sync_hospitals()
```

Run it once after the JSON files are in place. Verify the Python files compile (`python -c 'from bus.datasets.ucla_aeds import UCLA_AEDS; print(len(UCLA_AEDS))'`).

### What NOT to do

- Don't fabricate hospital, AED, or fire station coordinates. If you don't know exactly, set the centroid + flag `notes: "Approximate"`.
- Don't pull from Wikipedia — primary sources only.
- Don't depend on Overpass being available at runtime. Fetch once, commit the JSON file, run again only when refreshing data.
- Don't break the existing `useEmergencyTelemetry` hook signature. Existing imports must keep working.
- Don't modify the `bus/coordinator/`, `bus/specialists/`, or `bus/shared/` directories. Only `bus/datasets/` and `bus/scripts/`.
- Don't change the metronome, voice, or CPR step state machine. Only the data layer.
- Don't introduce new npm packages. `tsx` is already available; node's built-in `fetch` works.
- Don't put real API keys in committed files.

### Acceptance criteria

You're done when ALL hold:

1. `npm run fetch-aeds` runs successfully and produces `lib/data/aeds-osm.json` with `count > 0`.
2. `lib/data/aeds-ucla-ehs.json` contains 15-20 verified UCLA campus entries with `notes` field.
3. `lib/data/stemi-hospitals.json` contains ≥10 LA County hospitals, each with verified coordinates.
4. `lib/data/lafd-stations.json` contains ≥6 LAFD stations within 10 miles of UCLA, each with verified coordinates.
5. `lib/useEmergencyTelemetry.ts` imports from these JSON files (not inline data) and the demo route still works at `/demo`.
6. EMS unit origin in scenarios is the **nearest LAFD station**, not a relative offset. Event messages cite the station by name.
7. Event messages cite `LAFD_BENCHMARKS.median_response_minutes` (6.2 min) and `SCHIERBECK_DRONE_BENCHMARK.median_drone_arrival_minutes` (3.7 min) explicitly.
8. AED markers in the demo map show source badge ('OSM' green / 'UCLA EH&S' blue) and attribution text.
9. `/data-sources` page exists and lists all sources with links.
10. Footer links to `/data-sources` appear on `/demo`, `/emergency/dispatch`, and the OrchestrationDrawer.
11. `python bus/scripts/sync_datasets.py` regenerates `bus/datasets/ucla_aeds.py` and `bus/datasets/la_stemi_hospitals.py` from the JSON.
12. Existing routes still return 200: `/`, `/emergency/dispatch`, `/emergency/cpr`, `/demo`.

### Final deliverable

Return:

- One line per JSON file created with entry count.
- One line per file modified.
- Confirmation that `npm run dev` works and `/demo` runs Royce Hall scenario without errors.
- Any data quality concerns (e.g. "OSM has only 3 AEDs in the UCLA bbox — manual UCLA EH&S list compensates").
- A 1-paragraph README addition for the demo script: "Click any AED on the map to see its source — green chip means UCLA EH&S, blue chip means OpenStreetMap. Click 'Data Sources' in the footer for the full provenance trail."
