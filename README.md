# LifeLink

LifeLink is a cardiac-emergency response demo that connects a patient/bystander flow, nearby helper routing, CPR guidance, Arduino pressure-sensor feedback, a FastAPI emergency backend, and Fetch.ai/Agentverse multi-agent orchestration.

The active app is a Next.js mobile-style interface. Supporting runtimes live in separate folders so the repo can be run as a frontend-only demo, a frontend + FastAPI demo, or a full agent-orchestration demo.

## Active project layout

```text
app/                    Next.js App Router pages and API routes
components/lifelink/    Current mobile UI components used by the active app
components/ui/          Shared UI primitives used by /dev/dashboard
lib/                    Current app hooks, CPR logic, voice helpers, Mongo client, scenarios
backend/                FastAPI emergency backend
bus/                    Local Fetch.ai/uAgents event bus and specialist agents
agentverse-deploy/      4-agent hosted Agentverse deployment files
arduino/                RP-S40-ST pressure-sensor sketch
public/                 Static CPR guide images
scripts/                Seed/test/data scripts
supabase/               Database migration
docs/                   Project notes, reports, and archived prompts
archive/                Legacy code kept for reference, excluded from active TypeScript builds
```

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For CPR profile handoff / backend testing:

```bash
cd backend
pip install -r requirements.txt
python main.py
```

For the local Fetch.ai event bus:

```bash
cd bus
pip install -r requirements.txt
python scripts/run_all.py
```

## Main routes

- `/` — patient/guest/volunteer home
- `/profile` — role and patient profile setup
- `/sos` — emergency start flow
- `/sos/dispatch/conscious` and `/sos/dispatch/unconscious` — dispatcher flows
- `/sos/map` — live responder map
- `/sos/cpr/tutorial` — CPR tutorial
- `/sos/cpr/assist` — CPR assist with sensor/voice support
- `/patient/hardware` — Apple Watch / Arduino hardware setup
- `/dev/dashboard` — service health and developer dashboard

## Environment

Copy `.env.local.example` to `.env.local` and fill only the services you need. The frontend works in demo mode with missing optional service keys, but Mapbox, MongoDB, ElevenLabs, Agentverse, and the FastAPI backend each require their corresponding environment variables for full functionality.

## Cleanup notes

See `docs/CLEANUP_REPORT.md` for what was deleted, archived, and left at the repo root.
