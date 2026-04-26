# CardiacLink Runbook — How to Start Everything

Complete guide to running the full CardiacLink stack: FastAPI backend, Fetch.ai bus, and Next.js frontend.

---

## Three-Terminal Setup

### Terminal 1: FastAPI Backend (port 8000)

```bash
# From project root
cd backend
python main.py
```

**What it does:**
- Handles emergency triggers via `/api/emergency/trigger`
- Manages volunteer notifications (Twilio calls + Textbelt SMS)
- Stores patient profile data from Web Serial handoff
- Exposes health check at `/health`

**Expected output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Verify:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","version":"0.2.0","twilio_configured":false,...}
```

---

### Terminal 2: Fetch.ai Bus + Event Server (port 8010)

```bash
# From project root
cd bus
python scripts/run_all.py
```

**What it does:**
- Starts 8 uAgents (Coordinator, Voice, AED, EMS, Handoff, Optimizer, Triage, Drone)
- Runs Almanac discovery to wire agents together
- Launches event server on `:8010` for SSE streaming
- Publishes heartbeat events every 5 seconds per agent

**Expected output:**
```
================================================================================
CardiacLink agents up. Register these on agentverse.ai:
--------------------------------------------------------------------------------
Coordinator   agent1q...   "Cardiac emergency dispatch orchestrator"
Voice         agent1q...   "ElevenLabs CPR voice narration"
AED           agent1q...   "AED locator (UCLA + OpenAEDMap, H3-ranked)"
EMS           agent1q...   "911 / EMS dispatch handoff"
Handoff       agent1q...   "Hospital handoff + FHIR audit log"
Optimizer     agent1q...   "AED placement optimizer (Buter 2024 / GRASP)"
Triage        agent1q...   "MDAgents complexity classifier"
Drone         agent1q...   "UAV-AED delivery (Schierbeck 2023)"
================================================================================

Starting event server on port 8010...
Event server started at http://localhost:8010
Press Ctrl+C to stop.
```

**Verify:**
```bash
curl http://localhost:8010/health
# Should return: {"status":"ok","agents":[...8 agents...],"uptime_s":...}

# Run smoke test (publishes 5 test events and subscribes to verify):
python scripts/smoke_publish.py
# Should exit with code 0 if ≥3 events received
```

---

### Terminal 3: Next.js Frontend (port 3000)

```bash
# From project root
npm run dev
```

**What it does:**
- Serves the CardiacLink UI on `http://localhost:3000`
- Proxies bus telemetry via `/api/telemetry/{emergencyId}` (SSE)
- Aggregates health checks via `/api/health`
- Provides dev dashboard at `/dev/dashboard` (development mode only)

**Expected output:**
```
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.1s
```

**Verify:**
Open http://localhost:3000 in your browser. You should see the LifeLink landing page with role cards.

---

## Developer Dashboard

Once all three terminals are running:

1. Open http://localhost:3000/dev/dashboard
2. You should see three green "OK" badges for Next.js, FastAPI, and Fetch.ai bus
3. The "Agents" section should show 8 agents with recent heartbeat timestamps
4. Click **"POST /api/emergency/start"** to trigger a test emergency
5. Watch the "Recent Bus Events" section fill with coordinator/AED/EMS events

### Dashboard Features

- **Status Pills**: Real-time health for Next.js, FastAPI backend, and bus
- **Agents Grid**: 8 agents with addresses, capabilities, and last heartbeat times
- **Manual Triggers**: Buttons to POST test emergencies through frontend or backend APIs
- **Event Log**: Live tail of last 50 bus events, filterable by agent/phase/summary
- **Emergency Switcher**: Dropdown to pin the log to a specific `emergency_id`
- **Auto-refresh**: Polls health every 3 seconds (pause/resume toggle)

---

## Verification Checklist

After starting all three terminals:

- [ ] FastAPI backend health check returns `status: "ok"`
- [ ] Bus health check shows 8 agents with recent `last_heartbeat` timestamps
- [ ] Next.js loads at http://localhost:3000
- [ ] Dev dashboard shows all three services green
- [ ] Clicking "POST /api/emergency/start" produces bus events in the dashboard
- [ ] Bus smoke test passes: `cd bus && python scripts/smoke_publish.py`
- [ ] Next.js build succeeds: `npm run build` (warnings OK, no errors)

---

## Environment Setup

### `.env.local` (project root)

Copy `.env.local.example` to `.env.local` and configure:

```bash
# Required for Coordinator reasoning
ANTHROPIC_API_KEY=sk-ant-...

# Optional for Mapbox maps (falls back to Leaflet if missing)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# Bus event server (default shown)
BUS_EVENT_URL=http://localhost:8010
NEXT_PUBLIC_BUS_EVENT_URL=http://localhost:8010

# FastAPI backend (default shown)
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_CARDIACLINK_API_URL=http://localhost:8000

# Optional: Supabase for persistence
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### `bus/.env` (bus directory)

Copy `bus/.env.example` to `bus/.env` and configure:

```bash
# Generate 8 random seeds (one per agent):
python -c "import secrets; [print(f'{name}_SEED={secrets.token_hex(16)}') for name in ['COORDINATOR', 'VOICE', 'AED', 'EMS', 'HANDOFF', 'OPTIMIZER', 'TRIAGE', 'DRONE']]"
# Paste output here

# Required for Coordinator + Triage reasoning
ANTHROPIC_API_KEY=sk-ant-...

# Optional for voice narration
ELEVENLABS_API_KEY=...

# Optional for EMS What3Words (falls back to synthesized if missing)
WHAT3WORDS_API_KEY=...

# Optional: Redis for distributed event bus (in-memory by default)
BUS_REDIS_URL=

# Event server port (default: 8010)
BUS_EVENT_PORT=8010
```

---

## Common Issues

### "Could not discover {capability}"

**Problem**: Coordinator can't find specialist agents via Almanac.

**Solutions**:
- Wait 5-10 seconds after startup — discovery takes time
- Re-discovery runs every 60 seconds automatically
- Check all 8 agent seeds are set in `bus/.env`
- Verify agents are running: `curl http://localhost:8010/health` should show 8 agents

### Event server not starting / port 8010 in use

**Problem**: Port conflict or event server not spawning.

**Solutions**:
- Check what's using `:8010`: `lsof -i :8010` (macOS/Linux) or `netstat -ano | findstr :8010` (Windows)
- Change the port: set `BUS_EVENT_PORT=8011` in `bus/.env` and `BUS_EVENT_URL=http://localhost:8011` in Next.js `.env.local`
- Verify `uvicorn` and `fastapi` are installed: `pip install -r bus/requirements.txt`

### No events showing in frontend dashboard

**Problem**: Dashboard loads but event log stays empty.

**Solutions**:
- Check browser console for EventSource errors
- Verify bus is running: `curl http://localhost:8010/health`
- Test the SSE stream directly: `curl http://localhost:8010/events/test-123` (should hang waiting for events)
- If bus is unreachable, frontend falls back to demo events — check Network tab for `/api/telemetry/{id}` connections
- Ensure `BUS_EVENT_URL` matches in both `bus/.env` (as `BUS_EVENT_PORT`) and Next.js `.env.local`

### Twilio calls not working

**Problem**: Emergency trigger doesn't send calls/SMS.

**Solutions**:
- This is expected in demo mode — Twilio keys are optional
- Backend health check shows `twilio_configured: false` if keys are missing
- To enable: add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` to `backend/.env` (create from `.env.example`)
- Textbelt SMS works without config (uses demo key from code)

### Build fails with TypeScript errors

**Problem**: `npm run build` shows errors.

**Solutions**:
- The only critical errors were already fixed in this deliverable
- Warnings (like unused variables) are OK and don't block the build
- If you see new errors, run `npm run lint` to check
- Common fix: ensure all imports match the current file structure

---

## Production Deployment Notes

1. **Never commit secrets**: `.env`, `.env.local`, and `bus/.env` are gitignored
2. **Dev dashboard access**: In production, `/dev/dashboard` requires `?devKey={DEV_DASHBOARD_KEY}` query param
3. **Event bus scaling**: Set `BUS_REDIS_URL` in `bus/.env` to use Redis pub/sub instead of in-memory queues
4. **Next.js**: Run `npm run build` then `npm start` (not `npm run dev`)
5. **FastAPI**: Run with Gunicorn or similar: `gunicorn backend.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker`
6. **Bus**: Deploy agents separately or use Agentverse for hosted agents

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                                    │
│  • LifeLink UI                                                      │
│  • /dev/dashboard (developer monitoring)                            │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                │ SSE: /api/telemetry/{emergencyId}
                │ Aggregated health: /api/health
                ↓
┌───────────────────────────────────────────────────────────────────────┐
│  Next.js API Routes (server-side)                                    │
│  • Proxies bus events from :8010                                     │
│  • Fans out health checks to backend + bus                           │
└─────────┬─────────────────────────────────────────────────────────────┘
          │
          ├─→ FastAPI Backend (:8000)  ─────→  Twilio/Textbelt
          │   • Emergency triggers                (volunteer calls/SMS)
          │   • Patient profile storage
          │   • Health endpoint
          │
          └─→ Fetch.ai Bus (:8010)
              • Event Server (SSE streaming)
              • 8 uAgents:
                - Coordinator (Claude reasoning)
                - Voice (ElevenLabs CPR)
                - AED (H3 geospatial + Buter 2024)
                - EMS (LA County dispatch)
                - Handoff (FHIR audit)
                - Optimizer (GRASP placement)
                - Triage (MDAgents scoring)
                - Drone (Schierbeck 2023 UAV-AED)
```

---

## Quick Reference

| Component | Port | Health Check | Purpose |
|-----------|------|--------------|---------|
| Next.js | 3000 | http://localhost:3000 | Frontend UI |
| FastAPI | 8000 | http://localhost:8000/health | Emergency backend |
| Bus Event Server | 8010 | http://localhost:8010/health | SSE stream + agent heartbeats |
| Dev Dashboard | 3000/dev/dashboard | Combined view | Real-time monitoring |

**Three commands to run everything:**

```bash
# Terminal 1 - Backend
python backend/main.py

# Terminal 2 - Bus
cd bus && python scripts/run_all.py

# Terminal 3 - Frontend
npm run dev
```

Then open http://localhost:3000/dev/dashboard and confirm all three services are green ✓
