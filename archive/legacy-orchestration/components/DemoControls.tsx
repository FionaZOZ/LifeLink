'use client';

import { useState } from 'react';
import type { ScenarioState } from '@/lib/useEmergencyTelemetry';
import { SCENARIOS } from '@/lib/useEmergencyTelemetry';

interface LayerToggles {
  aeds: boolean;
  coverage: boolean;
  emsRoute: boolean;
  dronePath: boolean;
  buildings3d: boolean;
  hospital: boolean;
}

interface DemoControlsProps {
  state: ScenarioState;
  onRunScenario: (id: string) => void;
  onReset: () => void;
  layers: LayerToggles;
  onToggleLayer: (layer: keyof LayerToggles) => void;
}

const PHASE_LABELS: Record<string, string> = {
  idle: 'IDLE',
  call_received: 'CALL RECEIVED',
  agents_dispatching: 'DISPATCHING',
  aeds_located: 'AEDs LOCATED',
  ems_en_route: 'EMS EN ROUTE',
  drone_launched: 'DRONE LAUNCHED',
  triage_complete: 'TRIAGE DONE',
  handoff_ready: 'HANDOFF READY',
  resolved: 'RESOLVED',
};

const PHASE_COLORS: Record<string, string> = {
  idle: 'bg-zinc-700',
  call_received: 'bg-red-600 animate-pulse',
  agents_dispatching: 'bg-orange-500 animate-pulse',
  aeds_located: 'bg-yellow-500',
  ems_en_route: 'bg-red-500',
  drone_launched: 'bg-cyan-500',
  triage_complete: 'bg-purple-500',
  handoff_ready: 'bg-green-500',
  resolved: 'bg-green-600',
};

export function DemoControls({ state, onRunScenario, onReset, layers, onToggleLayer }: DemoControlsProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('royce_hall');

  const scenarioEntries = Object.entries(SCENARIOS);

  return (
    <div className="space-y-4">
      {/* Phase Status */}
      <div className="bg-zinc-900/80 rounded-lg p-3 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Status</span>
          <span className="text-xs font-mono text-zinc-400">{state.elapsed}s</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PHASE_COLORS[state.phase]}`} />
          <span className="text-sm font-semibold text-white">
            {PHASE_LABELS[state.phase]}
          </span>
        </div>
        {state.triageLevel && (
          <div className="mt-1.5 text-xs text-purple-400 font-mono">
            Triage: {state.triageLevel}
          </div>
        )}
      </div>

      {/* Scenario Selector */}
      <div className="bg-zinc-900/80 rounded-lg p-3 border border-zinc-800">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Scenario</span>
        <div className="mt-2 space-y-1.5">
          {scenarioEntries.map(([id, scenario]) => (
            <button
              key={id}
              onClick={() => setSelectedScenario(id)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                selectedScenario === id
                  ? 'bg-red-600/20 border border-red-600/40 text-red-300'
                  : 'bg-zinc-800/50 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
            >
              <div className="font-semibold">{scenario.name}</div>
              <div className="text-[10px] mt-0.5 opacity-75">{scenario.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onRunScenario(selectedScenario)}
            disabled={state.phase !== 'idle' && state.phase !== 'resolved'}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-semibold py-2 px-3 rounded-md transition-colors"
          >
            {state.phase === 'idle' || state.phase === 'resolved' ? 'Run Scenario' : 'Running...'}
          </button>
          <button
            onClick={onReset}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold py-2 px-3 rounded-md transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="bg-zinc-900/80 rounded-lg p-3 border border-zinc-800">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Map Layers</span>
        <div className="mt-2 space-y-1">
          {([
            ['aeds', 'AED Devices', '⚡'],
            ['coverage', 'Coverage Rings', '🟡'],
            ['emsRoute', 'EMS Route', '🚑'],
            ['dronePath', 'Drone Path', '🛸'],
            ['hospital', 'Hospital', '🏥'],
            ['buildings3d', '3D Buildings', '🏢'],
          ] as [keyof LayerToggles, string, string][]).map(([key, label, icon]) => (
            <label
              key={key}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => onToggleLayer(key)}
                className="accent-red-500 w-3.5 h-3.5"
              />
              <span className="text-sm">{icon}</span>
              <span className="text-xs text-zinc-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Stats */}
      {state.phase !== 'idle' && (
        <div className="bg-zinc-900/80 rounded-lg p-3 border border-zinc-800">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Live Stats</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-400">{state.nearbyAeds.filter(a => a.padsAvailable).length}</div>
              <div className="text-[10px] text-zinc-500">AEDs Ready</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{state.emsUnits.length}</div>
              <div className="text-[10px] text-zinc-500">EMS Units</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400">{state.drone ? (state.drone.status === 'delivered' ? '✓' : `${state.drone.eta_seconds}s`) : '—'}</div>
              <div className="text-[10px] text-zinc-500">Drone ETA</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{state.hospital ? `${state.hospital.eta_minutes}m` : '—'}</div>
              <div className="text-[10px] text-zinc-500">Hospital ETA</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { LayerToggles };
