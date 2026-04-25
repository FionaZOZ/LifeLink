// scripts/fetch-aeds.ts
// Fetches AED locations near UCLA from OpenStreetMap via the Overpass API.
// Run: npm run fetch-aeds
// Output: lib/data/aeds-osm.json

import fs from 'node:fs';
import path from 'node:path';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Bounding box covering greater Westside LA (south,west,north,east)
// Wider than campus-only since OSM AED coverage is sparse near UCLA
const BBOX = '33.95,-118.55,34.15,-118.35';

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
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'CardiacLink/1.0 (LA Hacks 2026 project)',
    },
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
    attribution: '\u00a9 OpenStreetMap contributors',
    fetched_at: new Date().toISOString(),
    bbox: BBOX,
    query: QUERY,
    count: aeds.length,
    aeds,
  }, null, 2));
  console.log(`[fetch-aeds] wrote ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
