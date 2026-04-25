'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AgentEvent {
  id: string;
  timestamp: number;
  agent: string;
  type: 'dispatch' | 'response' | 'aed_located' | 'ems_dispatched' | 'drone_launched' | 'triage_complete' | 'handoff_ready' | 'voice_sync' | 'coverage_calc' | 'error';
  message: string;
  data?: Record<string, unknown>;
  parallelGroupId?: string;  // events sharing this id render under a PARALLEL bracket
}

export interface AedDevice {
  id: string;
  name: string;
  lat: number;
  lon: number;
  padsAvailable: boolean;
  distanceM?: number;
  walkMinutes?: number;
}

export interface EmsUnit {
  id: string;
  lat: number;
  lon: number;
  eta_minutes: number;
  unit_type: string;
}

export interface DroneState {
  id: string;
  lat: number;
  lon: number;
  eta_seconds: number;
  status: 'launched' | 'en_route' | 'delivered';
  path: [number, number][];
}

export interface HospitalInfo {
  name: string;
  lat: number;
  lon: number;
  cath_lab_24h: boolean;
  ecmo_capable: boolean;
  eta_minutes?: number;
}

export interface ScenarioState {
  phase: 'idle' | 'call_received' | 'agents_dispatching' | 'aeds_located' | 'ems_en_route' | 'drone_launched' | 'triage_complete' | 'handoff_ready' | 'resolved';
  emergencyLocation: { lat: number; lon: number } | null;
  nearbyAeds: AedDevice[];
  emsUnits: EmsUnit[];
  drone: DroneState | null;
  hospital: HospitalInfo | null;
  coverageRings: { center: [number, number]; walkRadiusM: number; bikeRadiusM: number }[];
  events: AgentEvent[];
  triageLevel: string | null;
  elapsed: number; // seconds since scenario start (can be fractional)
}

// ── Scenario Data ──────────────────────────────────────────────────────────

// UCLA campus AEDs (from bus/datasets/ucla_aeds.py)
const UCLA_AEDS: AedDevice[] = [
  { id: 'royce', name: 'Royce Hall - Main Entrance', lat: 34.0720, lon: -118.4424, padsAvailable: true },
  { id: 'powell', name: 'Powell Library - Info Desk', lat: 34.0722, lon: -118.4420, padsAvailable: true },
  { id: 'pauley', name: 'Pauley Pavilion - Lobby', lat: 34.0707, lon: -118.4459, padsAvailable: true },
  { id: 'ackerman', name: 'Ackerman Union - Main Floor', lat: 34.0704, lon: -118.4442, padsAvailable: true },
  { id: 'wooden', name: 'John Wooden Center', lat: 34.0714, lon: -118.4448, padsAvailable: true },
  { id: 'boelter', name: 'Boelter Hall - Lobby', lat: 34.0691, lon: -118.4431, padsAvailable: false },
  { id: 'eng-vi', name: 'Engineering VI', lat: 34.0688, lon: -118.4451, padsAvailable: true },
  { id: 'math-sci', name: 'Math Sciences Building', lat: 34.0690, lon: -118.4417, padsAvailable: true },
  { id: 'young', name: 'Court of Sciences / Young Hall', lat: 34.0695, lon: -118.4405, padsAvailable: true },
  { id: 'anderson', name: 'Anderson School', lat: 34.0730, lon: -118.4400, padsAvailable: true },
  { id: 'reagan', name: 'UCLA Ronald Reagan Medical Center', lat: 34.0654, lon: -118.4470, padsAvailable: true },
  { id: 'hedrick', name: 'Hedrick Hall', lat: 34.0727, lon: -118.4503, padsAvailable: true },
  { id: 'deneve', name: 'De Neve Plaza', lat: 34.0732, lon: -118.4512, padsAvailable: true },
  { id: 'bruin', name: 'Bruin Plaza', lat: 34.0715, lon: -118.4505, padsAvailable: true },
  { id: 'drake', name: 'Drake Stadium', lat: 34.0677, lon: -118.4486, padsAvailable: true },
  { id: 'sac', name: 'Student Activities Center', lat: 34.0707, lon: -118.4447, padsAvailable: false },
  { id: 'kerckhoff', name: 'Kerckhoff Hall', lat: 34.0709, lon: -118.4436, padsAvailable: true },
  { id: 'murphy', name: 'Murphy Hall', lat: 34.0713, lon: -118.4398, padsAvailable: true },
  { id: 'pub-affairs', name: 'Public Affairs Building', lat: 34.0737, lon: -118.4407, padsAvailable: true },
  { id: 'covel', name: 'Covel Commons', lat: 34.0722, lon: -118.4495, padsAvailable: true },
];

const HOSPITALS: HospitalInfo[] = [
  { name: 'UCLA Ronald Reagan Medical Center', lat: 34.0654, lon: -118.4470, cath_lab_24h: true, ecmo_capable: true },
  { name: 'Cedars-Sinai Medical Center', lat: 34.0754, lon: -118.3765, cath_lab_24h: true, ecmo_capable: true },
];

interface ScenarioDefinition {
  name: string;
  location: { lat: number; lon: number };
  description: string;
}

export const SCENARIOS: Record<string, ScenarioDefinition> = {
  royce_hall: {
    name: 'Royce Hall Collapse',
    location: { lat: 34.0727, lon: -118.4421 },
    description: 'Student collapses during a lecture at Royce Hall. Bystander calls 911.',
  },
  pauley_game: {
    name: 'Pauley Pavilion Game',
    location: { lat: 34.0703, lon: -118.4470 },
    description: 'Fan experiences cardiac arrest during a basketball game at Pauley Pavilion.',
  },
  bruin_walk: {
    name: 'Bruin Walk Incident',
    location: { lat: 34.0710, lon: -118.4445 },
    description: 'Jogger collapses on Bruin Walk near Ackerman Union.',
  },
  drake_stadium: {
    name: 'Drake Stadium Practice',
    location: { lat: 34.0677, lon: -118.4486 },
    description: 'Athlete has sudden cardiac arrest during track practice at Drake Stadium.',
  },
};

// ── Haversine distance ─────────────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Hook ───────────────────────────────────────────────────────────────────

const INITIAL_STATE: ScenarioState = {
  phase: 'idle',
  emergencyLocation: null,
  nearbyAeds: [],
  emsUnits: [],
  drone: null,
  hospital: null,
  coverageRings: [],
  events: [],
  triageLevel: null,
  elapsed: 0,
};

export function useBusTelemetry() {
  const [state, setState] = useState<ScenarioState>({ ...INITIAL_STATE });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef(0);

  const addEvent = useCallback((agent: string, type: AgentEvent['type'], message: string, data?: Record<string, unknown>) => {
    const event: AgentEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      agent,
      type,
      message,
      data,
    };
    setState(prev => ({ ...prev, events: [...prev.events, event] }));
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    stop();
    setState({ ...INITIAL_STATE });
  }, [stop]);

  const runScenario = useCallback((scenarioId: string) => {
    const scenario = SCENARIOS[scenarioId];
    if (!scenario) {
      console.warn(`[CardiacLink] Unknown scenario: ${scenarioId}`);
      return;
    }

    // Explicitly clear any running timer before reset
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    reset();

    const loc = scenario.location;

    // Sort AEDs by distance to emergency
    const sortedAeds = UCLA_AEDS.map(aed => ({
      ...aed,
      distanceM: haversineM(loc.lat, loc.lon, aed.lat, aed.lon),
      walkMinutes: Math.round((haversineM(loc.lat, loc.lon, aed.lat, aed.lon) / 80) * 10) / 10,
    })).sort((a, b) => a.distanceM - b.distanceM);

    const nearestHospital = HOSPITALS.reduce<HospitalInfo & { dist: number }>((best, h) => {
      const d = haversineM(loc.lat, loc.lon, h.lat, h.lon);
      return d < best.dist ? { ...h, dist: d, eta_minutes: Math.round(d / 500) } : best;
    }, { ...HOSPITALS[0], dist: Infinity, eta_minutes: 0 });

    // Generate drone path (from Ronald Reagan Medical Center to emergency)
    const droneOrigin: [number, number] = [-118.4470, 34.0654];
    const droneTarget: [number, number] = [loc.lon, loc.lat];
    const dronePath: [number, number][] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      dronePath.push([
        droneOrigin[0] + (droneTarget[0] - droneOrigin[0]) * t,
        droneOrigin[1] + (droneTarget[1] - droneOrigin[1]) * t,
      ]);
    }

    // EMS route from the west (simulated)
    const emsOrigin: [number, number] = [loc.lon - 0.012, loc.lat - 0.005];

    elapsedRef.current = 0;

    // ── Phase definitions ────────────────────────────────────────────────
    // Compressed ~8s timeline with true parallel dispatch at t=0.4s

    const phases = [
      // Phase 0 (t=0) — Call received
      () => {
        setState(prev => ({
          ...prev,
          phase: 'call_received',
          emergencyLocation: loc,
          elapsed: elapsedRef.current,
        }));
        addEvent('Coordinator', 'dispatch', `Emergency call received: ${scenario.description}`);
        addEvent('Coordinator', 'dispatch', `Location: ${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`);
      },

      // Phase 1 (t=0.4) — TRUE PARALLEL DISPATCH (Caputo et al.)
      () => {
        setState(prev => ({ ...prev, phase: 'agents_dispatching', elapsed: elapsedRef.current }));
        const groupId = `parallel-${Date.now()}`;
        const t0 = Date.now();
        // Fire all 4 dispatches in the same React batch — near-identical timestamps
        setState(prev => ({
          ...prev,
          events: [
            ...prev.events,
            { id: `${t0}-tri`,   timestamp: t0,     agent: 'Triage', type: 'dispatch' as const, message: 'Classify scenario complexity (MDAgents NeurIPS 2024)...', parallelGroupId: groupId },
            { id: `${t0}-aed`,   timestamp: t0 + 1, agent: 'AED',    type: 'dispatch' as const, message: 'Query nearest defibrillators with pads available...', parallelGroupId: groupId },
            { id: `${t0}-ems`,   timestamp: t0 + 2, agent: 'EMS',    type: 'dispatch' as const, message: 'Request ALS unit dispatch via PSAP bridge...', parallelGroupId: groupId },
            { id: `${t0}-drone`, timestamp: t0 + 3, agent: 'Drone',  type: 'dispatch' as const, message: 'Launch UAV-AED from Reagan Med Center (Schierbeck Lancet 2023)...', parallelGroupId: groupId },
          ],
        }));
        addEvent('Coordinator', 'dispatch', 'Parallel dispatch initiated — 4 specialist agents fanning out (Caputo et al. parallel-vs-sequential principle)');
      },

      // Phase 2 (t=1.2) — Triage result
      () => {
        addEvent('Triage', 'triage_complete', 'Classification: COMPLEX (multi-agent coordination required)');
        addEvent('Triage', 'response', 'MDAgents complexity: Level 3 — parallel specialist dispatch recommended');
        setState(prev => ({ ...prev, triageLevel: 'COMPLEX', elapsed: elapsedRef.current }));
      },

      // Phase 3 (t=1.8) — AEDs located
      () => {
        const topAeds = sortedAeds.filter(a => a.padsAvailable).slice(0, 5);
        setState(prev => ({
          ...prev,
          phase: 'aeds_located',
          nearbyAeds: sortedAeds,
          elapsed: elapsedRef.current,
        }));
        addEvent('AED', 'aed_located', `Found ${sortedAeds.length} AEDs on campus, ${sortedAeds.filter(a => a.padsAvailable).length} with pads available`);
        addEvent('AED', 'response', `Nearest: ${topAeds[0].name} (${topAeds[0].distanceM?.toFixed(0)}m, ~${topAeds[0].walkMinutes} min walk)`);
      },

      // Phase 4 (t=2.4) — EMS dispatched
      () => {
        const ems: EmsUnit = {
          id: 'ems-1',
          lat: emsOrigin[1],
          lon: emsOrigin[0],
          eta_minutes: 7,
          unit_type: 'ALS Ambulance',
        };
        setState(prev => ({
          ...prev,
          phase: 'ems_en_route',
          emsUnits: [ems],
          elapsed: elapsedRef.current,
        }));
        addEvent('EMS', 'ems_dispatched', 'ALS Ambulance dispatched — ETA 7 minutes');
        addEvent('EMS', 'response', 'LA County median response: 8.2 min. Unit approaching from west.');
      },

      // Phase 5 (t=3.2) — Drone launched
      () => {
        setState(prev => ({
          ...prev,
          phase: 'drone_launched',
          drone: {
            id: 'drone-1',
            lat: droneOrigin[1],
            lon: droneOrigin[0],
            eta_seconds: 120,
            status: 'launched',
            path: dronePath,
          },
          elapsed: elapsedRef.current,
        }));
        addEvent('Drone', 'drone_launched', 'UAV-AED launched from Ronald Reagan Medical Center');
        addEvent('Drone', 'response', 'Schierbeck 2023 protocol: AED payload, 120s ETA at 50 km/h');
      },

      // Phase 6 (t=4.5) — Coverage rings + Voice sync
      () => {
        const rings = sortedAeds.filter(a => a.padsAvailable).slice(0, 5).map(aed => ({
          center: [aed.lon, aed.lat] as [number, number],
          walkRadiusM: 310,
          bikeRadiusM: 710,
        }));
        setState(prev => ({
          ...prev,
          coverageRings: rings,
          elapsed: elapsedRef.current,
        }));
        addEvent('Optimizer', 'coverage_calc', 'Coverage analysis: 5 AEDs within walking range (Buter 2024: 310m walk, 710m bike)');
        addEvent('Voice', 'voice_sync', 'Real-time CPR coaching active — 110 BPM metronome guidance');
      },

      // Phase 7 (t=5.5) — Drone en route + triage complete
      () => {
        const progress = 0.4;
        setState(prev => ({
          ...prev,
          phase: 'triage_complete',
          drone: prev.drone ? {
            ...prev.drone,
            lat: droneOrigin[1] + (droneTarget[1] - droneOrigin[1]) * progress,
            lon: droneOrigin[0] + (droneTarget[0] - droneOrigin[0]) * progress,
            eta_seconds: 72,
            status: 'en_route',
          } : null,
          elapsed: elapsedRef.current,
        }));
        addEvent('Drone', 'response', 'Drone at 40% of route — ETA 72 seconds');
        addEvent('Triage', 'triage_complete', 'Full assessment complete: Witnessed OHCA, shockable rhythm likely, CPR in progress');
        addEvent('Coordinator', 'response', 'All specialist agents responding. Caputo parallel dispatch active.');
      },

      // Phase 8 (t=6.5) — Drone delivered
      () => {
        setState(prev => ({
          ...prev,
          drone: prev.drone ? {
            ...prev.drone,
            lat: droneTarget[1],
            lon: droneTarget[0],
            eta_seconds: 0,
            status: 'delivered',
          } : null,
          elapsed: elapsedRef.current,
        }));
        addEvent('Drone', 'response', 'AED delivered to scene! Bystander instructed to apply pads.');
        addEvent('Voice', 'voice_sync', 'Switching to AED guidance mode — "Follow AED voice prompts"');
      },

      // Phase 9 (t=7.5) — Handoff ready
      () => {
        setState(prev => ({
          ...prev,
          phase: 'handoff_ready',
          hospital: nearestHospital,
          elapsed: elapsedRef.current,
        }));
        addEvent('Handoff', 'handoff_ready', `FHIR R4 bundle prepared for ${nearestHospital.name}`);
        addEvent('Handoff', 'response', `${nearestHospital.ecmo_capable ? 'ECMO-capable' : 'Standard'} cath lab, ETA ${nearestHospital.eta_minutes} min by ambulance`);
      },

      // Phase 10 (t=8) — Resolved
      () => {
        setState(prev => ({ ...prev, phase: 'resolved', elapsed: elapsedRef.current }));
        addEvent('Coordinator', 'response', 'Emergency response coordinated. All agents standing by.');
        addEvent('Coordinator', 'response', `Time to AED: ~2 min (drone). EMS ETA: 5 min remaining. Hospital: ${nearestHospital.name}`);
      },
    ];

    // Compressed demo timing — total ~8 seconds
    const phaseTimes = [0, 0.4, 1.2, 1.8, 2.4, 3.2, 4.5, 5.5, 6.5, 7.5, 8];
    let phaseIndex = 0;

    // Execute phase 0 immediately
    phases[0]();
    phaseIndex = 1;

    // 200ms ticks so sub-second phase boundaries actually fire
    timerRef.current = setInterval(() => {
      elapsedRef.current += 0.2;
      setState(prev => ({ ...prev, elapsed: Math.round(elapsedRef.current * 10) / 10 }));

      // Fire all phases whose time has been reached (while loop catches up if multiple)
      while (phaseIndex < phases.length && elapsedRef.current >= phaseTimes[phaseIndex]) {
        phases[phaseIndex]();
        phaseIndex++;
      }

      // Stop after all phases complete + 1s buffer
      if (phaseIndex >= phases.length && elapsedRef.current >= phaseTimes[phaseTimes.length - 1] + 1) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 200);
  }, [addEvent, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    state,
    runScenario,
    reset,
    scenarios: SCENARIOS,
  };
}
