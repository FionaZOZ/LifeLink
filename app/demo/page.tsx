'use client';

import { useState } from 'react';
import { useBusTelemetry } from '@/lib/useBusTelemetry';
import { DemoEmergencyMap } from '@/components/DemoEmergencyMap';
import { AgentActivityFeed } from '@/components/AgentActivityFeed';
import { DemoControls, type LayerToggles } from '@/components/DemoControls';
import Link from 'next/link';

export default function DemoPage() {
  const { state, runScenario, reset, scenarios } = useBusTelemetry();

  const [layers, setLayers] = useState<LayerToggles>({
    aeds: true,
    coverage: true,
    emsRoute: true,
    dronePath: true,
    buildings3d: true,
    hospital: true,
  });

  const toggleLayer = (key: keyof LayerToggles) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">CL</span>
            </div>
            <span className="text-sm font-bold tracking-tight">CardiacLink</span>
          </Link>
          <span className="text-zinc-600">|</span>
          <span className="text-xs text-zinc-400 font-medium">Demo Orchestration View</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${state.phase !== 'idle' ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-[10px] text-zinc-400 font-mono">
              {state.phase !== 'idle' ? '8 agents online' : 'standby'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-600 font-mono">Fetch.ai uAgents + Mapbox + deck.gl</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Controls + Activity Feed */}
        <aside className="w-80 shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-800">
          {/* Controls */}
          <div className="p-3 border-b border-zinc-800 overflow-y-auto max-h-[55%]">
            <DemoControls
              state={state}
              onRunScenario={runScenario}
              onReset={reset}
              layers={layers}
              onToggleLayer={toggleLayer}
            />
          </div>

          {/* Activity Feed */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Agent Activity</span>
                <span className="text-[10px] text-zinc-600 font-mono">{state.events.length} events</span>
              </div>
            </div>
            <AgentActivityFeed
              events={state.events}
              className="flex-1 p-2 min-h-0"
            />
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <DemoEmergencyMap state={state} layers={layers} />
        </main>
      </div>
    </div>
  );
}
