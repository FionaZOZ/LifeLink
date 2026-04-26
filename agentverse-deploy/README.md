# Agentverse Deployment Guide — CardiacLink (4-agent edition)

Agentverse free tier caps you at **4 hosted agents**, so we consolidated 8 → 4. Voice + Triage moved into Coordinator as internal handlers; Optimizer merged into AED; Drone merged into EMS. Story stays "multi-agent" — 4 agents, 8 logical handlers.

The 4 absorbed standalone files live under `_archive/` for reference / future scale-up.

## The 4 hosted agents

| File | ASI:One name | Required secrets | What it does |
|---|---|---|---|
| `coordinator.py` | **CardiacLink Emergency Coordinator** | `ASI1_API_KEY`, `ANTHROPIC_API_KEY`, `MONGODB_URI`, `MONGODB_DB`, `AED_AGENT_ADDRESS`, `EMS_AGENT_ADDRESS`, `HANDOFF_AGENT_ADDRESS`, `ELEVENLABS_API_KEY` (optional) | Receives emergency, runs Triage (Claude) + Voice scripts inline, fans out to AED + EMS + Handoff agents, writes events to MongoDB |
| `aed_agent.py` | **UCLA AED Locator + Route Optimizer** | `ASI1_API_KEY` | Buter 2024 coverage decay over UCLA AED registry + helper-to-AED route in one response |
| `ems_agent.py` | **LAFD EMS + AED Drone Dispatch** | `ASI1_API_KEY`, `WHAT3WORDS_API_KEY` (optional) | Nearest LAFD ALS unit + AED-payload drone launch in one response |
| `handoff_agent.py` | **FHIR R4 Hospital Handoff** | `ASI1_API_KEY`, `MONGODB_URI`, `MONGODB_DB` | Builds FHIR R4 Bundle, persists to MongoDB Atlas |

## Already deployed

- **AED agent** at `agent1qf4pes4jhlnrrrfcqsz9r4fxhf3dnsq4vnkq8kpzf7zm6x8rprakjd93qg0`. Currently running the v0 Square example — replace with `aed_agent.py`.

## Addresses (re-deployed 2026-04-26)

```
COORDINATOR_AGENT_ADDRESS=agent1qf39hy5w480wqetwekxy7z0hf8gkchdddf863thqhxsxsdynvqr9upx5q4f
AED_AGENT_ADDRESS        =agent1qfedfdfe9l0cwejgrz30my4gmtjj8xjsam39hjzesa0khlhnsnmfg57k3p0
EMS_AGENT_ADDRESS        =agent1qw3239g4tahjmw93fwqqp24hyhelljh70ee6wh59euqgrts0kdqfv8gtdll
HANDOFF_AGENT_ADDRESS    =agent1q2z070qakeu20musu62dcegcdykse3kx403tugtc4u09fwgu72gwsg8nc29
```

Older addresses (superseded — delete from Agentverse to stay under quota):
- Original AED Square stub: `agent1qf4pes4jhlnrrrfcqsz9r4fxhf3dnsq4vnkq8kpzf7zm6x8rprakjd93qg0`
- First-pass deploy: `agent1q2xtpl2guq322sm23lyl3ukw0229qwh54j3uyvlljc2s96pr059r7y2h3xz` (Coordinator), `agent1qtwzxzycn4y…` (AED), `agent1q2hunle9n7s…` (EMS), `agent1qdyjhlre8vs…` (Handoff)

## Deploy options

**Option 1 — manual (works today)**: Agentverse → New hosted agent → Chat Protocol Skeleton → paste a `*.py` file → set Secrets → Deploy. Repeat 4 times.

**Option 2 — programmatic via `deploy.py`**: see below. Pushes code + secrets through the Agentverse REST API. Requires an `AGENTVERSE_API_KEY`.

## Programmatic deployment

```bash
# 1. Get your Agentverse API key from https://agentverse.ai (Profile → API Keys)
export AGENTVERSE_API_KEY=sk_...

# 2. Set every per-agent secret in your shell or a .env file
export ASI1_API_KEY=...
export ANTHROPIC_API_KEY=...
export MONGODB_URI=mongodb+srv://...
export MONGODB_DB=cardiaclink
export ELEVENLABS_API_KEY=        # optional
export WHAT3WORDS_API_KEY=        # optional

# 3. Run the deploy script
python agentverse-deploy/deploy.py

# It creates / updates 4 agents and prints their addresses.
# Copy the printed addresses back into this README and into .env.local.
```

The deploy script reads `agents.toml` to know which file → which agent name → which secrets, then walks the Agentverse REST API. See `deploy.py` for the URLs (they're the parts most likely to drift — verify on docs.agentverse.ai if anything 404s).

## Event flow (4-agent edition)

```
Browser → POST /api/emergency/start (Next.js)
       → POST agentverse.ai/.../{coordinator_address}     [HTTPS]
       → Coordinator handler runs:
           ├─ run_triage()  ── INLINE (Claude)        ──▶ MongoDB event
           ├─ get_cpr_script()  ── INLINE             ──▶ MongoDB event
           ├─ ctx.send(AED_AGENT_ADDRESS, AedQuery)
           │   └─ AED returns devices + embedded route ──▶ MongoDB events (×2)
           ├─ ctx.send(EMS_AGENT_ADDRESS, EmsRequest)
           │   └─ EMS returns unit + embedded drone    ──▶ MongoDB events (×2)
           └─ ctx.send(HANDOFF_AGENT_ADDRESS, HandoffRequest)
               └─ Handoff stores FHIR Bundle           ──▶ MongoDB event
Browser ◀ SSE /api/telemetry/{id} (Next.js) ◀ MongoDB change stream
```

Same 8 agent-tagged events show up in the live activity feed as before — frontend doesn't need to change.
