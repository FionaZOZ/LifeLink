# CardiacLink Demo Script (30 seconds)

> For LA Hacks 2026 judges. Start with the dev server running (`npm run dev`).

## Setup

```bash
cd /Users/emilysun/Downloads/CardicLinkNew-master
npm run dev          # Next.js on :3000
# Optional: python3 -m uvicorn backend.main:app --reload --port 8000
```

## Flow (30s)

### 1. Start at Dispatch (5s)

Open **http://localhost:3000/emergency/dispatch**

- You see a dark emergency screen with:
  - **911 banner** at the top
  - **4 status cards** (911, EMS, Drone, Volunteers) in a 2x2 grid
  - **Compact Mapbox map** showing emergency location, AED dots, EMS route, drone path
  - **Volunteer alert cards** with Twilio call/SMS status (simulated)
  - After ~4s, volunteers A and B show "Accepted"

### 2. Open Orchestration Drawer (5s)

Tap the **microscope pill** (bottom-right corner).

- A slide-in drawer shows the **Agent Activity Feed**:
  - Events appear in real-time with PARALLEL brackets
  - Switch to **Map** tab to see the compact map in the drawer
- Close with Esc or tap backdrop

### 3. Auto-advance to CPR (5s)

The page auto-navigates to `/emergency/cpr` after 10 seconds (or tap "Continue to CPR Coach").

- **Sticky ETA strip** at top shows EMS, Drone, AED, Hospital status
- The **microscope pill** is still available for judges to peek at orchestration
- Walk through consent -> responsive -> breathing -> hand placement -> compressions
- **Metronome** runs at 110 BPM with 30:2 cycle

### 4. Show Demo Orchestration View (5s)

Open **http://localhost:3000/demo**

- Full-screen split view: controls + activity feed on the left, Mapbox map on the right
- Click **"Royce Hall Cardiac Arrest"** to run the scenario
- Watch 8 agents dispatch in parallel, AEDs appear, drone launches, EMS routes draw
- "Switch to Bystander View" link in header takes you back to dispatch

### 5. Live Mode (optional, 10s)

Open **http://localhost:3000/emergency/dispatch?mode=live**

- Status cards and drawer now receive events via SSE from `/api/telemetry/[id]`
- Events stream in every 2.5 seconds (demo stub; would be Redis pub/sub in production)

### 6. MongoDB Atlas Persistence (5s)

After a scenario resolves (either via demo or bystander flow):

- In the **demo header**, a green badge shows **"N bundles in Atlas"** — the count increments live
- In the **OrchestrationDrawer** footer, a green dot confirms **"MongoDB Atlas — record abc123..."**
- Open **http://localhost:3000/api/handoff** to see the raw JSON list of persisted bundles
- Each bundle is a FHIR R4 document: Patient, Encounter, Observations (CPR rate, AED status, drone ETA), Procedure

### 7. Data Sources (5s)

Open **http://localhost:3000/data-sources**

- New **"Handoff Persistence (MongoDB Atlas)"** section with FHIR R4 + MongoDB Atlas citations
- Every datapoint in the app is sourced and cited

## Key talking points

- **Two surfaces, one hook**: `useEmergencyTelemetry` powers both bystander UI and judge demo
- **8 Fetch.ai uAgents** coordinate in parallel (coordinator, AED, EMS, drone, triage, hospital, optimizer, voice)
- **SessionStorage persistence** carries state from dispatch to CPR seamlessly
- **MongoDB Atlas** persists FHIR R4 bundles automatically on scenario resolution (MLH swag track)
- **FHIR R4 compliance** — Patient (anonymous), Encounter (SNOMED cardiac arrest), Observations (LOINC heart rate), Procedure (SNOMED CPR)
- **No layout shift** — ETA strip uses `position: sticky`, metronome is untouched
