# LifeLink Quick Start 🚀

## Frontend

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

## Optional FastAPI backend

Required for backend-driven emergency notifications and patient-profile handoff from the Arduino/Web Serial flow.

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend URL: **http://localhost:8000**

## Optional local Fetch.ai bus

Required for local multi-agent telemetry testing.

```bash
cd bus
pip install -r requirements.txt
python scripts/run_all.py
```

Event server URL: **http://localhost:8010**

## Current demo flow

1. Open `/`.
2. Hold the emergency button to enter `/sos`.
3. Follow dispatcher status through `/sos/dispatch/...`.
4. Open `/sos/map` to view responders and AED routing.
5. Continue to `/sos/cpr/tutorial` or `/sos/cpr/assist` for CPR guidance.
6. Use `/patient/hardware` to test Arduino / Apple Watch hardware state.

## Key routes

- `/` — home
- `/profile` — role/profile setup
- `/sos` — emergency flow
- `/sos/map` — responder map
- `/sos/cpr/tutorial` — CPR tutorial
- `/sos/cpr/assist` — CPR assist
- `/patient/hardware` — hardware connection screen
- `/dev/dashboard` — developer health dashboard

## Environment

```bash
cp .env.local.example .env.local
```

Fill only the services you plan to demo: Mapbox, MongoDB, ElevenLabs, Agentverse, FastAPI backend, and/or Fetch.ai bus.

More notes: `README.md` and `docs/CLEANUP_REPORT.md`.

🫀 **Every second counts.**
