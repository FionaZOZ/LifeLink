# CardiacLink — Fetch.ai LA Hacks Submission

## One-line pitch

A multi-agent system on Agentverse — **4 hosted agents, 8 logical handlers** — that turns a bystander's "someone collapsed" into a coordinated cardiac arrest response: locating the nearest AED, dispatching EMS, launching an AED drone, coaching CPR, triaging the patient, optimizing the helper's route, and delivering a FHIR R4 bundle to the receiving hospital — in real time, discoverable and runnable directly from ASI:One.

## Why this problem

Out-of-hospital cardiac arrest kills ~350,000 Americans every year. Every minute without defibrillation drops survival by ~10%. Today, when a bystander dials 911, the response is one phone call routed through one dispatcher, with no one tasking the AED in the building three doors down or pre-staging the hospital's cath lab. CardiacLink is what that response could look like if 8 specialist agents reasoned and acted in parallel.

## Architecture: 4 hosted agents, 8 logical handlers

Agentverse free tier caps at 4 hosted agents, so we consolidated. Each
external agent absorbs one or more "internal" handlers, preserving the full
multi-agent orchestration surface.

| Hosted agent (ASI:One name) | Internal handlers | Tool execution | Reasoning |
|---|---|---|---|
| **CardiacLink Emergency Coordinator** | Orchestrator + **Voice Coach** + **STEMI Triage** | MongoDB Atlas writes, Chat Protocol fan-out, ElevenLabs (optional) | Anthropic Claude Sonnet 4.5 (triage + orchestration) |
| **UCLA AED Locator + Route Optimizer** | AED locator + **Route Optimizer** | UCLA AED registry, H3 geospatial index, haversine + cardinal direction | Buter et al. 2024 coverage decay function |
| **LAFD EMS + AED Drone Dispatch** | EMS dispatcher + **Drone launcher** | What3Words API, haversine, drone pad registry | Nearest-unit selection (ground + air) |
| **FHIR R4 Hospital Handoff** | Bundle builder + persistence | MongoDB Atlas, FHIR R4 schema | — |

All 4 agents communicate via the **uAgents Chat Protocol** (`publish_manifest=True`). Each is independently discoverable and addressable on ASI:One. The 4 absorbed standalone files (`voice_agent.py`, `triage_agent.py`, `optimizer_agent.py`, `drone_agent.py`) live under `agentverse-deploy/_archive/` for reference and post-hackathon scale-up.

## Mapping to the Fetch.ai prize criteria

### ✅ Build on Agentverse

4 hosted agents deployed via the Agentverse "Chat Protocol Skeleton" template. Each agent's source is a single self-contained Python file in `agentverse-deploy/`. A `deploy.py` script pushes code + secrets through the Agentverse REST API in one command.

Live addresses (re-deployed 2026-04-26):
- **Coordinator**: `agent1qf39hy5w480wqetwekxy7z0hf8gkchdddf863thqhxsxsdynvqr9upx5q4f`
- **AED Locator + Optimizer**: `agent1qfedfdfe9l0cwejgrz30my4gmtjj8xjsam39hjzesa0khlhnsnmfg57k3p0`
- **EMS + Drone Dispatch**: `agent1qw3239g4tahjmw93fwqqp24hyhelljh70ee6wh59euqgrts0kdqfv8gtdll`
- **FHIR Hospital Handoff**: `agent1q2z070qakeu20musu62dcegcdykse3kx403tugtc4u09fwgu72gwsg8nc29`

### ✅ Discoverable via ASI:One

Each agent has:
- A keyword-rich `QuotaProtocol(name=...)` — e.g. `"UCLA AED Locator"`, `"FHIR R4 Hospital Handoff"`.
- A docstring with example queries.
- `publish_manifest=True` on `agent.include(...)`.
- A `ChatMessage` handler with a friendly natural-language response describing the agent and its role in the orchestration.

A judge searching ASI:One for "AED", "FHIR", "cardiac arrest", "CPR", "EMS dispatch", or "emergency response" will find the corresponding agents.

### ✅ Chat Protocol (mandatory)

Every agent implements the Chat Protocol via:
1. `ChatAgent()` from `uagents.experimental.chat_agent` — ASI-1 LLM auto-extracts typed messages from natural language.
2. An explicit `Protocol(spec=chat_protocol_spec)` with `ChatMessage` + `ChatAcknowledgement` handlers — for direct chat in ASI:One.

### ✅ Reasoning

- **Coordinator** uses Claude Sonnet 4.5 to decide orchestration order based on scenario context.
- **Triage agent** uses Claude Sonnet 4.5 to classify presentations as STEMI / presumptive arrest / stable, with a clinical rationale that is included in the FHIR Bundle.
- **AED Locator** runs the Buter 2024 coverage decay model — survival probability as a function of helper-to-AED travel time — to rank devices by clinical impact, not just distance.

### ✅ Tool execution

| Tool | Used by |
|---|---|
| Anthropic Claude API | Coordinator, Triage |
| ElevenLabs TTS | Voice Coach |
| What3Words API | EMS Dispatch |
| MongoDB Atlas (FHIR R4) | Coordinator (event log), Handoff (bundle persistence) |
| Mapbox GL JS | Frontend (live agent map) |
| H3 geospatial index | AED Locator |
| Haversine distance | All location-aware agents |

### ✅ Real-world problem with measurable outcomes

Out-of-hospital cardiac arrest:
- ~350,000 US deaths/year
- ~10% survival drop per minute without defibrillation
- AHA target: defib within 3–5 minutes of collapse

CardiacLink instruments end-to-end response time, AED coverage score, time-to-defib, and time-to-hospital-handoff. These are readable from the MongoDB `agent_events` collection after any run.

### ⚠️ Payment Protocol (optional — see "stretch" below)

Not implemented in v1. Natural fit: receiving hospital pays the Coordinator agent a small fee per validated FHIR Bundle delivery.

## Demo paths

### Path A — ASI:One direct chat (single agent)

1. Open ASI:One.
2. Search "AED" or "UCLA AED Locator".
3. Type: `find me the nearest AED at Royce Hall`.
4. Receive a ranked list with Buter coverage scores.

This proves the AED agent is discoverable, Chat Protocol-compliant, and does real reasoning.

### Path B — ASI:One direct chat (multi-agent)

1. Open ASI:One.
2. Search "Cardiac arrest" or "CardiacLink Emergency Coordinator".
3. Type: `Cardiac arrest at Royce Hall, dispatch everyone`.
4. Coordinator parses the intent, fans out to all 7 specialists, streams a narrative reply listing what each agent did.

This proves the multi-agent orchestration is real and runnable from ASI:One.

### Path C — CardiacLink frontend (full UX)

1. Open `cardiaclink.app` (Vercel) or `localhost:3000`.
2. Pick a scenario from the picker: `royce-hall` / `pauley-pavilion` / `bruin-walk`.
3. Watch the live agent activity feed: 8 color-coded agents, dispatch → AED located → EMS dispatched → drone launched → voice ready → triage → handoff resolved.
4. Confirm the FHIR R4 Bundle in MongoDB Atlas (`db.handoff_bundles.find().sort({ stored_at: -1 }).limit(1)`).

This proves the full product loop, with real Mapbox UCLA coordinates and live-streamed agent telemetry.

## Repo layout (for judges)

```
agentverse-deploy/                    ← 4 self-contained Python files
  ├─ coordinator.py                   ← orchestrator + Voice + Triage (Claude)
  ├─ aed_agent.py                     ← UCLA AED + Buter 2024 + route optimizer
  ├─ ems_agent.py                     ← LAFD ALS + What3Words + AED drone
  ├─ handoff_agent.py                 ← FHIR R4 → MongoDB Atlas
  ├─ deploy.py                        ← programmatic push to Agentverse API
  ├─ agents.toml                      ← deployment manifest (file → name → secrets)
  ├─ README.md                        ← deployment guide + addresses
  ├─ _chat_fallback_snippet.md        ← per-agent ASI:One handler template
  └─ _archive/                        ← absorbed standalone agents (reference)
      ├─ voice_agent.py
      ├─ triage_agent.py
      ├─ optimizer_agent.py
      └─ drone_agent.py

app/                                  ← Next.js frontend
  ├─ sos/map/page.tsx                 ← live emergency map (real Mapbox)
  ├─ api/emergency/start/route.ts     ← POST → Agentverse Coordinator
  └─ api/telemetry/[id]/route.ts      ← SSE bridge to MongoDB events

lib/
  ├─ scenarios.ts                     ← 3 UCLA cases (royce-hall, pauley, bruin)
  ├─ agentverse.ts                    ← thin Agentverse client
  ├─ mongo/client.ts                  ← event store
  └─ useEmergencyTelemetry.ts         ← SSE consumer + Mapbox state

components/
  ├─ AgentActivityFeed.tsx            ← color-coded live agent feed
  ├─ CompactEmergencyMap.tsx          ← Mapbox view
  └─ OrchestrationDrawer.tsx          ← drawer with full event log

FETCHAI_SUBMISSION.md                 ← this file
AGENTVERSE_WIRING_PROMPT.md           ← Claude Code prompt to wire frontend
```

## Stretch (if time permits)

- **Payment Protocol**: hospital pays Coordinator per validated FHIR Bundle. Implementation: Coordinator returns a payment URI on resolved emergency; hospital agent (TBD) settles via FET.
- **Volunteer reputation tokens**: helpers earn FET when their accepted-and-arrived count exceeds threshold; tied to the existing `acceptedCount` / `onSceneCount` in `useHelperFlow`.
- **Cross-campus federation**: deploy parallel coordinator agents for USC, Stanford, MIT campuses and let them route to each other when an emergency is on a boundary.

## Team

- **Emily Sun** (qirans3@uci.edu) — original architect, MongoDB + FHIR + telemetry stream
- **Paul Jiang** (bingxij@uci.edu) — backend integration, LifeLink design system
- (add others)

## Try it

- AED agent live on ASI:One: search "UCLA AED Locator"
- Demo video: [add link]
- Code: [add GitHub link]
- Live frontend: [add Vercel link]
