# Integration Report — Orchestration into Bystander Flow

## Summary

7-phase integration weaving the Fetch.ai multi-agent orchestration demo into the CardiacLink bystander product flow. Two surfaces share a single telemetry hook: bystanders see calm status cards; judges tap a microscope pill to see the full agent activity feed and map.

## Phases Completed

| Phase | Description | Commit | Files Changed |
|-------|-------------|--------|---------------|
| 0 | Pre-integration checkpoint | `9cc6d7b` | 0 (tag only) |
| 1 | Rename hook + add live mode stub | `a404c0a` | 5 (hook + 4 importers) |
| 2 | Shared integration components | `364a3c2` | 4 new components |
| 3 | Rebuild dispatch screen | `5cbdca8` | 1 (dispatch page) |
| 4 | Layer ETAs onto CPR screen | `676a934` | 1 (cpr page) |
| 5 | Polish demo route + session state | `143bcc7` | 1 (demo page) |
| 6 | SSE telemetry endpoint stub | `7cc65f5` | 1 new API route |

## New Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `lib/useEmergencyTelemetry.ts` | ~545 | Shared telemetry hook (playback + live SSE + sessionStorage) |
| `components/EmergencyStatusCards.tsx` | ~183 | 2x2 grid / horizontal row status cards |
| `components/OrchestrationPill.tsx` | ~60 | Floating microscope button with unseen badge |
| `components/OrchestrationDrawer.tsx` | ~183 | Slide-in drawer with Activity + Map tabs |
| `components/CompactEmergencyMap.tsx` | ~226 | Embedded Mapbox map (no 3D, no scroll zoom) |
| `app/api/telemetry/[emergencyId]/route.ts` | ~106 | SSE endpoint for live mode |

## Files Modified

| File | Change |
|------|--------|
| `app/emergency/dispatch/page.tsx` | Rebuilt with status cards, compact map, orchestration drawer, auto-advance |
| `app/emergency/cpr/page.tsx` | Added sticky ETA strip, orchestration pill/drawer |
| `app/demo/page.tsx` | Renamed header, added "Switch to Bystander View", mode badge |
| `components/DemoEmergencyMap.tsx` | Updated import path |
| `components/DemoControls.tsx` | Updated import path |
| `components/AgentActivityFeed.tsx` | Updated import path |

## Protected Files (NOT modified)

- `lib/compressionBeatSound.ts` (Web Audio / metronome)
- `app/emergency/cpr-hardware/page.tsx`
- `app/emergency/assessment/page.tsx`
- `app/emergency/complete/page.tsx`
- `components/CoordinatorPanel.tsx` (preserved, import commented out)
- `bus/*`, `backend/*`, `arduino/*`, `supabase/*`

## Architecture

```
┌─────────────────────────────────────────────┐
│           useEmergencyTelemetry             │
│  (playback | live SSE | sessionStorage)     │
├──────────────┬──────────────────────────────┤
│  Bystander   │        Judge / Demo          │
│  Surface     │        Surface               │
│              │                              │
│  StatusCards │  OrchestrationDrawer          │
│  (2x2 grid)  │  ├─ AgentActivityFeed       │
│              │  └─ CompactEmergencyMap       │
│  CPR ETA     │                              │
│  (sticky row)│  DemoEmergencyMap (full)     │
└──────────────┴──────────────────────────────┘
```

## Route Verification

| Route | Status |
|-------|--------|
| `/` | 200 |
| `/demo` | 200 |
| `/emergency/dispatch` | 200 |
| `/emergency/cpr` | 200 |
| `/emergency/cpr-hardware` | 200 |
| `/emergency/assessment` | 200 |
| `/emergency/complete` | 200 |
| `/api/telemetry/test-123` (SSE) | Streaming |

## Session State Flow

```
dispatch (persist:true) ──sessionStorage──> cpr (persist:true)
                                            │
                                            ▼
                                      ETA strip hydrates
                                      from saved state
```

## MongoDB Atlas + FHIR R4 Integration (Post-Integration)

7-phase MongoDB Atlas integration adding FHIR R4 handoff persistence and cleaning up dead Supabase code.

### Phases

| Phase | Description | Key Files |
|-------|-------------|-----------|
| 1 | Delete dead Supabase code, fix build | Deleted 5 files, fixed coordinator stubs, Supabase lazy-init proxy, Suspense boundary |
| 2 | MongoDB Atlas client | `lib/mongo/client.ts`, `scripts/test-mongo.ts` |
| 3 | FHIR R4 Bundle builder + types | `lib/fhir/types.ts`, `lib/fhir/buildBundle.ts` |
| 4 | API routes for handoff persistence | `app/api/handoff/route.ts`, `app/api/handoff/[id]/route.ts` |
| 5 | Wire telemetry hook to persist | `lib/useEmergencyTelemetry.ts` — fire-and-forget POST on resolved |
| 6 | Demo-visible UI | OrchestrationDrawer badge, demo header counter, data-sources section |
| 7 | Demo script + verification | `DEMO_SCRIPT.md`, `INTEGRATION_REPORT.md` |

### New Files

| File | Purpose |
|------|---------|
| `lib/mongo/client.ts` | MongoDB connection (dev global, prod module-level, null when unconfigured) |
| `lib/fhir/types.ts` | Minimal FHIR R4 type definitions |
| `lib/fhir/buildBundle.ts` | Builds FHIR R4 Bundle from ScenarioState (anonymous Patient, SNOMED/LOINC coded) |
| `app/api/handoff/route.ts` | POST (persist bundle) + GET (list recent) |
| `app/api/handoff/[id]/route.ts` | GET single bundle by ObjectId |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/handoff` | POST | Persist FHIR R4 bundle to MongoDB Atlas |
| `/api/handoff` | GET | List recent bundles (count + last 10) |
| `/api/handoff/[id]` | GET | Fetch single bundle document |

### Graceful Degradation

All MongoDB callers return null/unavailable when `MONGODB_URI` is unset. The app continues to work without persistence.

## Known Pre-existing Issues

- `luma.gl` console warning from Mapbox GL internals — cosmetic only
