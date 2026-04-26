# Cleanup Report

Generated after repo organization pass.

## Deleted as unnecessary generated/local files

- `.next/` — Next.js build/cache output. Recreated by `npm run dev` or `npm run build`.
- `.git/` — Git history and refs. Not needed inside a handoff zip.

- `utils/compressor.py` — standalone local utility not imported by the app, backend, bus, or deploy scripts.

## Archived instead of deleted

The following TypeScript modules were not reachable from the current Next.js App Router entrypoints, API routes, or root scripts. They were moved under `archive/legacy-orchestration/` so they do not affect active builds but remain available for recovery.

- `components/AEDCard.tsx`
- `components/AEDMap.tsx`
- `components/AgentActivityFeed.tsx`
- `components/AgentCard.tsx`
- `components/CPRQRCode.tsx`
- `components/Call911Banner.tsx`
- `components/CompactEmergencyMap.tsx`
- `components/CoordinatorPanel.tsx`
- `components/DemoControls.tsx`
- `components/DemoEmergencyMap.tsx`
- `components/EmergencyEtaBadge.tsx`
- `components/EmergencyMap.tsx`
- `components/EmergencyStatusCards.tsx`
- `components/LocationMap.tsx`
- `components/NearbyAedMap.tsx`
- `components/OrchestrationDrawer.tsx`
- `components/OrchestrationPill.tsx`
- `components/TriggerButton.tsx`
- `components/ui/dialog.tsx`
- `components/ui/sonner.tsx`
- `lib/agentColors.ts`
- `lib/agents/coordinator.ts`
- `lib/agents/dispatch.ts`
- `lib/agents/family.ts`
- `lib/cpr/detector.ts`
- `lib/cpr/metronome.ts`
- `lib/cpr/voice.ts`
- `lib/data/aedRegistry.ts`
- `lib/data/volunteers.ts`
- `lib/fhir/buildBundle.ts`
- `lib/fhir/types.ts`
- `lib/supabase/client.ts`
- `lib/uclaAedsMock.ts`
- `lib/useBusTelemetry.ts`
- `lib/useEmergencyLocation.ts`
- `lib/useEmergencyTelemetry.ts`
- `lib/utils/distance.ts`

## Documentation organization

Kept at the root:

- `README.md`
- `QUICK_START.md`
- `.env.local.example`
- project config files (`package.json`, `tsconfig.json`, `next.config.mjs`, Tailwind/PostCSS/ESLint config, etc.)

Moved to `docs/`:

- build/deployment/runbook/testing/submission notes

Moved to `docs/prompts/`:

- one-off Claude/Mapbox/MongoDB/recovery/integration prompt files

## Active source folders left in place

- `app/`
- `components/lifelink/`
- `components/ui/` primitives still used by `/dev/dashboard`
- `lib/` active CPR, voice, Mongo, scenario, and hardware hooks
- `backend/`
- `bus/`
- `agentverse-deploy/`
- `arduino/`
- `public/`
- `scripts/`
- `supabase/`

## Dependency/path adjustments

- Removed obsolete active global import of `leaflet/dist/leaflet.css` because Leaflet-based maps were archived.
- Added `archive` and `docs` to `tsconfig.json` `exclude` so archived `.tsx` files are not typechecked as active source.
- Updated `package.json` / `package-lock.json` package name from `cardiaclink` to `lifelink`.
- No active import paths needed changes after archiving; archived files retain their original imports for reference only.
