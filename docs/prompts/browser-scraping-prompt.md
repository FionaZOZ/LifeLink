# Browser-use prompt — Scrape real AED / hospital / fire station data for CardiacLink

> Paste everything below the `---` line into your browser-use agent (browser-use, Claude in Chrome, Playwright agent, etc.).
> Output files land in `/Users/emilysun/Downloads/CardicLinkNew-master/lib/data/`.

---

## Mission

Scrape verifiable real-world data from public web sources and output four JSON files for the CardiacLink hackathon project. **Speed over perfection** — we have a 36-hour deadline. Aim for ~80% coverage, mark the rest with `notes: "Approximate"` rather than getting stuck.

You are a browser automation agent. Your job is to navigate, search, extract structured data, and write JSON files. Do **not** fabricate data — if a source is gated, captcha-locked, or missing, mark the entry as such and move on.

## Output files (target paths)

You'll produce these four files. Each must include source URL, license/attribution, fetch timestamp, and an array of typed entries.

```
/Users/emilysun/Downloads/CardicLinkNew-master/lib/data/
├── aeds-ucla-ehs.json          # Task 1 — UCLA campus AEDs
├── aeds-osm-verified.json      # Task 2 — OSM AEDs cross-checked via openaedmap.org
├── lafd-stations.json          # Task 3 — LAFD stations near UCLA
└── stemi-hospitals.json        # Task 4 — CA DPH STEMI Receiving Centers (LA County)
```

---

## Task 1 — UCLA campus AEDs (highest priority, ~30 min)

### Goal
Identify ~15-20 AEDs on UCLA campus with verified building locations and approximate coordinates.

### Strategy

**Primary attempt — map.ucla.edu**

1. Navigate to `https://map.ucla.edu`.
2. Use the search box to query "AED". Expect a list of results — each result is a campus building with an AED.
3. For each AED result:
   - Click it to open the location detail panel.
   - Capture the **building name**, the **specific room/floor location** if shown (e.g. "1st Floor Lobby", "Outside Room 211"), and the **lat/lon** of the building marker (you can read coordinates from the URL after clicking — UCLA's map encodes them as URL params, OR from the marker's HTML data attributes).
   - Take note of any "service hours" or "accessibility" info.
4. If the search returns no results, try alternative queries: "defibrillator", "AED registry", "emergency cardiac".

**Fallback attempt 1 — UCLA EH&S website**

1. Navigate to `https://www.ehs.ucla.edu` (UCLA Environmental Health & Safety).
2. Search "AED" or "defibrillator" in the site search.
3. Look for "AED Registry", "AED Program", or similar pages. They often have a PDF list.
4. If a PDF is found:
   - Open it inline in the browser.
   - Extract building names and floor locations from the PDF text.
   - Use UCLA's main campus map (map.ucla.edu) to find coordinates for each building.

**Fallback attempt 2 — UCLA Recreation / Athletics AEDs**

UCLA Rec, Pauley Pavilion, Drake Stadium, John Wooden Center likely all have AEDs. Search:
- `https://recreation.ucla.edu` for AED info.
- `https://uclabruins.com` for Pauley/Drake AED announcements (often required to publish for game-day safety).

**Fallback attempt 3 — manual confidence list**

If the above fails, use this minimum confidence list of 12 buildings that almost certainly have AEDs (every UCLA building of significant occupancy is required to under California state code). For each, look up the building's centroid coordinates via Google Maps (search building name + "UCLA"):

- Royce Hall
- Powell Library
- Pauley Pavilion
- Ackerman Union
- John Wooden Center
- Hedrick Hall (residence)
- De Neve Plaza (residence)
- Bruin Plaza
- Kerckhoff Hall
- Math Sciences Building
- Boelter Hall
- Engineering VI
- Court of Sciences (Young Hall)
- Anderson School of Management
- Drake Stadium
- Murphy Hall
- Public Affairs Building
- Covel Commons
- Ronald Reagan UCLA Medical Center (lobby AED)

### Output schema

```json
{
  "source": "UCLA Environmental Health & Safety AED Registry",
  "url_reference": "https://map.ucla.edu",
  "verification_method": "Browser-scraped from UCLA campus map and EH&S website",
  "fetched_at": "2026-04-26T<ISO>Z",
  "aeds": [
    {
      "id": "ucla-royce",
      "name": "Royce Hall — Main Lobby",
      "building": "Royce Hall",
      "lat": 34.0727,
      "lon": -118.4421,
      "padsAvailable": true,
      "notes": "1st floor main lobby, west wall (verified via UCLA campus map)",
      "verified": true
    }
  ]
}
```

For each entry, set `verified: true` only if you actually saw a record on a UCLA-owned page (map.ucla.edu, ehs.ucla.edu, recreation.ucla.edu, etc.). If the entry is from the manual confidence list and you only have a building centroid from Google Maps, set `verified: false` and `notes: "Building has AED per CA state code; precise location not verified — coordinates are building centroid"`.

---

## Task 2 — Cross-verify via openaedmap.org (15 min)

### Goal
Compare the UCLA list against OpenAEDMap (the OSM-backed AED database) to flag any AEDs that exist in OSM but we missed manually, AND to flag any UCLA list entries that conflict with OSM data.

### Strategy

1. Navigate to `https://openaedmap.org`.
2. In the search box or via the map, navigate to UCLA / Westwood, Los Angeles. URL-direct: `https://openaedmap.org/#map=16/34.0689/-118.4452`.
3. Pan/zoom to encompass UCLA campus and immediate Westwood surroundings.
4. Count visible AED pins. For each pin within UCLA campus boundary (roughly 34.0660 to 34.0760 lat, -118.4500 to -118.4380 lon):
   - Click the pin.
   - Capture: name (if any), exact lat/lon, OSM node ID, last update date.
5. Cross-reference each OSM AED against the UCLA EH&S list from Task 1:
   - If OSM AED is within 30m of a Task 1 entry: tag it as `cross_verified: true` in the Task 1 entry.
   - If OSM AED has no Task 1 match: add it as a new entry with `source: "osm"` and a note explaining it.
   - If a Task 1 entry has no OSM match: tag it `osm_match: false` (this is expected — OSM coverage is sparse on private campuses).

### Output schema

```json
{
  "source": "OpenAEDMap (OpenStreetMap-backed)",
  "url_reference": "https://openaedmap.org",
  "license": "ODbL",
  "attribution": "© OpenStreetMap contributors",
  "fetched_at": "2026-04-26T<ISO>Z",
  "bbox": { "south": 34.0660, "west": -118.4500, "north": 34.0760, "east": -118.4380 },
  "aeds": [
    {
      "osm_id": 123456789,
      "lat": 34.0708,
      "lon": -118.4441,
      "name": "Ackerman Union",
      "tags": { "emergency": "defibrillator", "operator": "UCLA", "indoor": "yes" },
      "ucla_ehs_match_id": "ucla-ackerman"
    }
  ]
}
```

---

## Task 3 — LAFD fire stations (~20 min)

### Goal
Capture real coordinates for ≥8 LAFD stations within 10 miles of UCLA. These will be used as EMS unit origins in the demo.

### Strategy

1. Navigate to `https://www.lafd.org/locations` (or `https://www.lafd.org/about/lafd-fire-stations` if the first URL has moved).
2. The page should list all 106 LAFD stations. Focus on stations 1-100 in the West LA / Westside / South LA area.
3. For each station within ~10 miles of UCLA (34.0689, -118.4452):
   - Capture station number, name, address, battalion.
   - If lat/lon is not directly provided on the page, click through to a detail page or use the station's address to look up coordinates via Google Maps (search the address, copy lat/lon from URL).
4. Target stations near UCLA (high priority — these are likely first-responders for our demo):
   - Station 37 — Westwood (the closest to UCLA)
   - Station 92 — West LA / Sawtelle
   - Station 59 — Brentwood
   - Station 71 — Bel Air
   - Station 69 — Pacific Palisades
   - Station 19 — Brentwood / 405
   - Station 5 — Westchester
   - Station 95 — Mar Vista
   - Station 27 — Hollywood (broader West LA)
   - Station 82 — Hollywood

### Output schema

```json
{
  "source": "LAFD Locations — official station roster",
  "url_reference": "https://www.lafd.org/locations",
  "verification_method": "Browser-scraped; coordinates verified via Google Maps address search",
  "fetched_at": "2026-04-26T<ISO>Z",
  "stations": [
    {
      "id": "37",
      "name": "LAFD Station 37 (Westwood)",
      "address": "1090 Veteran Ave, Los Angeles, CA 90024",
      "lat": 34.0668,
      "lon": -118.4396,
      "battalion": 5
    }
  ]
}
```

---

## Task 4 — California STEMI Receiving Centers, LA County subset (~20 min)

### Goal
Capture ≥10 LA County hospitals designated as STEMI Receiving Centers. These are the hospitals our demo will route patients to.

### Strategy

**Primary — CDPH PDF or HTML page**

1. Navigate to `https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/STEMI-Receiving-Centers.aspx` or search "California STEMI Receiving Centers".
2. CDPH typically publishes the list as a PDF or HTML table by county.
3. Filter to LA County entries.
4. For each LA County hospital, capture:
   - Name
   - Address
   - Designated since (date)
   - Special capabilities if listed (cath lab 24/7, ECMO, etc.)
5. For each hospital, look up lat/lon via Google Maps (search address, copy coordinates).

**Fallback — LA County EMS Agency**

If the CDPH source is incomplete, navigate to `https://dhs.lacounty.gov/ems/` and look for "Approved Receiving Centers" or "STEMI Centers". This local source often has the same data with more LA-specific detail.

**Hospitals to ensure are captured (well-known LA County STEMI centers):**

- Ronald Reagan UCLA Medical Center (Westwood)
- UCLA Santa Monica Medical Center
- Cedars-Sinai Medical Center
- Keck Hospital of USC
- Kaiser Permanente Los Angeles Medical Center
- Harbor-UCLA Medical Center
- Good Samaritan Hospital (Downtown LA)
- Providence Saint John's Health Center (Santa Monica)
- Hollywood Presbyterian Medical Center
- Huntington Memorial Hospital (Pasadena)
- Northridge Hospital Medical Center
- Long Beach Memorial Medical Center
- LAC+USC Medical Center
- Children's Hospital Los Angeles (pediatric STEMI)
- Providence Holy Cross Medical Center

### Output schema

```json
{
  "source": "California Department of Public Health — STEMI Receiving Center designation list, LA County subset",
  "url_reference": "https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/STEMI-Receiving-Centers.aspx",
  "verification_method": "Browser-scraped; coordinates verified via Google Maps address search",
  "fetched_at": "2026-04-26T<ISO>Z",
  "hospitals": [
    {
      "id": "ronald-reagan-ucla",
      "name": "Ronald Reagan UCLA Medical Center",
      "address": "757 Westwood Plaza, Los Angeles, CA 90095",
      "lat": 34.0664,
      "lon": -118.4452,
      "cath_lab_24h": true,
      "ecmo_capable": true,
      "level_1_trauma": false,
      "designated_since": "2008",
      "verification": "CDPH list + Google Maps address lookup"
    }
  ]
}
```

---

## Coordinate verification protocol (apply to all tasks)

For every coordinate you capture, perform a sanity check before writing it to the JSON:

1. **Google Maps spot-check**: paste `"<lat>, <lon>"` into Google Maps. The pin should land within 30m of the address you have. If it lands on a parking lot two blocks away, the coordinate is wrong — search the address directly and use the result.
2. **Bounding box check**: every coordinate must fall within California (lat 32–42, lon -125 to -114). Reject anything outside.
3. **UCLA bbox check**: every UCLA AED must fall within (34.066–34.078, -118.452–-118.438). Reject anything outside.
4. **Decimals**: aim for 4 decimal places (~10m precision). More is fine. Less than 4 is suspicious.

If a coordinate fails verification, mark the entry with `verified: false` and `notes: "Coordinate not verified — please double-check"`. Don't ship a bad coordinate as if it were verified.

---

## What to skip (don't waste time)

- Login walls — skip the source.
- Captchas — skip and try a different source.
- PDF documents that aren't text-extractable (image-only scans) — skip the entries you can't read.
- Sources that require API keys you don't have — skip.
- Sources that explicitly require a payment — skip.
- Don't try to scrape any government emergency dispatch system, NG911 platform, or PulsePoint internal data. Those are gated for legal reasons.

If a task hits 5 consecutive failures, stop and write what you have. Mark missing entries clearly.

---

## File-write protocol

After completing each task:

1. Write the JSON file to the target path under `lib/data/`.
2. Validate the JSON parses (no trailing commas, no syntax errors).
3. Print a one-line summary: `Task N: wrote <path> with <count> entries (<verified_count> verified).`
4. Move to the next task.

If you can write to the local file system directly (Playwright + node:fs, or a tool that writes files), do that. If not (browser-only sandbox), output the JSON to stdout/console and tag it clearly with the target filename so the user can copy-paste.

---

## Final summary (return at end)

Return a short report:

```
Task 1 (UCLA AEDs):       <count> entries, <verified_count> verified, <fallback_count> from confidence list
Task 2 (OSM verification): <count> OSM AEDs found, <matched_count> matched UCLA list
Task 3 (LAFD stations):    <count> stations, all verified
Task 4 (STEMI hospitals):  <count> hospitals, all verified

Coverage gaps:
- <list any sources that failed or returned partial data>

Estimated time: <minutes elapsed>
```

---

## Appendix — sources NOT to use

- Wikipedia (secondary source — avoid for coordinates).
- Yelp / Google reviews (unreliable AED claims).
- Random "AED locator" apps (most are PulsePoint-derived and not authoritative for our purposes).
- Reddit / forum mentions (unverifiable).

Stick to:
- Official UCLA pages
- LAFD.org
- CDPH.ca.gov
- LA County DHS
- OpenStreetMap (via openaedmap.org)
- Google Maps (only for coordinate lookup of known addresses)
