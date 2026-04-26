# CardiacLink Fetch.ai Agent Bus

Multi-agent orchestration system for emergency cardiac response, built on Fetch.ai uAgents with Almanac discovery.

## Architecture

- **Coordinator Agent**: Entry point, uses Claude for reasoning and tool orchestration
- **7 Specialist Agents**:
  - **Voice**: ElevenLabs CPR narration
  - **AED**: Location finder with H3 indexing + Buter 2024 coverage scoring
  - **EMS**: LA County Fire Department dispatch simulation
  - **Handoff**: Hospital selection + FHIR R4 audit trail
  - **Optimizer**: AED placement optimization (Buter 2024 + GRASP)
  - **Triage**: MDAgents complexity classification
  - **Drone**: UAV-AED delivery (Schierbeck 2023 Lancet trial)

- **Event Bus**: Publishes lifecycle events (request/result/error/heartbeat) to SSE endpoint
- **Event Server**: FastAPI server on `:8010` streaming events to Next.js frontend

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate agent seeds (8 random hex strings):
   ```bash
   python -c "import secrets; [print(f'{name}_SEED={secrets.token_hex(16)}') for name in ['COORDINATOR', 'VOICE', 'AED', 'EMS', 'HANDOFF', 'OPTIMIZER', 'TRIAGE', 'DRONE']]"
   ```
   Paste into `.env`.

3. Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

4. (Optional) Add ElevenLabs for voice, What3Words for EMS:
   ```
   ELEVENLABS_API_KEY=...
   WHAT3WORDS_API_KEY=...
   ```

5. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Bus

Start all 8 agents + event server in one process:

```bash
python scripts/run_all.py
```

You should see:
- 8 agent addresses printed
- "Event server started at http://localhost:8010"
- Almanac discovery logs for each specialist

The event server exposes:
- `GET /events/{emergency_id}` - SSE stream
- `GET /health` - Agent heartbeats and uptime
- `GET /emergencies` - List of active emergency IDs

## Verification

### 1. Check agent heartbeats

```bash
curl http://localhost:8010/health
```

Should show 8 agents with `last_heartbeat` timestamps updating every 5 seconds.

### 2. Run the smoke test

```bash
python scripts/smoke_publish.py
```

This:
- Connects to the event server
- Publishes 5 test events to a synthetic emergency ID
- Subscribes to the SSE stream and verifies events are received
- Exits with code 0 if ≥3 events received

### 3. Test from the frontend

1. Start Next.js: `npm run dev` (in project root)
2. Start FastAPI backend: `python backend/main.py`
3. Open http://localhost:3000/dev/dashboard
4. Check that all 3 services show green "OK" badges
5. Click "POST /api/emergency/start" to trigger a test emergency
6. Watch the "Recent Bus Events" section fill with coordinator/AED/EMS events

## Event Schema

Every event published to the bus has this shape:

```json
{
  "ts": "2026-04-25T19:30:00.123456Z",
  "emergency_id": "royce-hall-12345",
  "agent": "aed",
  "capability": "aed-location",
  "phase": "result",
  "summary": "Found 3 AEDs within 500m",
  "data": {
    "count": 3,
    "h3_cell": "8928308280fffff"
  }
}
```

- **phase**: `request | result | error | heartbeat`
- **agent**: One of the 8 agent names
- **capability**: What the agent does (e.g., `aed-location`, `ems-dispatch`)
- **summary**: Human-readable description
- **data**: Agent-specific payload (optional)

## Scenarios

Three canonical scenarios defined in `shared/scenarios.py` (mirrored in `lib/scenarios.ts`):

1. **royce-hall**: Student collapses during lecture
2. **pauley-pavilion**: Fan cardiac arrest during game
3. **bruin-walk**: Jogger collapses near Ackerman

Pass `scenario_id` when starting an emergency to pre-seed location and narrative.

## Redis (Optional)

For production or distributed setups, set `BUS_REDIS_URL` in `.env`:

```
BUS_REDIS_URL=redis://localhost:6379/0
```

The event bus will use Redis pub/sub instead of in-memory queues.

## Troubleshooting

**"Could not discover {capability}"**
- Agents take ~5s to register with Almanac after startup
- Re-discovery runs every 60s
- Check that all 8 agent seeds are set in `.env`

**Event server not starting**
- Check `BUS_EVENT_PORT` (default 8010) isn't in use
- Verify `uvicorn` and `fastapi` are installed

**No events in frontend**
- Check `BUS_EVENT_URL` in Next.js `.env.local` matches the event server (default `http://localhost:8010`)
- Open browser dev tools → Network → check SSE connection to `/api/telemetry/{emergencyId}`
- Frontend will fall back to demo events if bus is unreachable

## References

- Fetch.ai uAgents: https://fetch.ai/docs/agents
- Buter et al. 2024 (Health Care Management Science): Coverage decay function
- Schierbeck et al. 2023 (Lancet Digital Health): Drone-AED delivery trial
- MDAgents (Stanford 2024): Medical triage complexity scoring
