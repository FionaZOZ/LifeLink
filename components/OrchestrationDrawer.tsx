'use client';

import { useEffect, useRef, useState } from 'react';
import { AgentActivityFeed } from './AgentActivityFeed';
import Link from 'next/link';
import type { ScenarioState } from '@/lib/useEmergencyTelemetry';
import type { LayerToggles } from './DemoControls';

// ── Lazy-load the map to avoid pulling Mapbox into initial dispatch bundle ──
import dynamic from 'next/dynamic';
const CompactEmergencyMap = dynamic(
  () => import('./CompactEmergencyMap').then(m => ({ default: m.CompactEmergencyMap })),
  { ssr: false, loading: () => <div className="h-[320px] bg-zinc-900 animate-pulse rounded-lg" /> },
);

// ── Types ──────────────────────────────────────────────────────────────────

interface OrchestrationDrawerProps {
  open: boolean;
  onClose: () => void;
  state: ScenarioState;
  layers?: LayerToggles;
  mode?: 'playback' | 'live';
}

const DEFAULT_LAYERS: LayerToggles = {
  aeds: true,
  coverage: true,
  emsRoute: true,
  dronePath: true,
  buildings3d: false,
  hospital: true,
};

// ── Component ──────────────────────────────────────────────────────────────

export function OrchestrationDrawer({
  open,
  onClose,
  state,
  layers = DEFAULT_LAYERS,
  mode = 'playback',
}: OrchestrationDrawerProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'map'>('activity');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap focus and handle Esc
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the drawer when it opens
    drawerRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-50
          bg-black/40 backdrop-blur-sm
          transition-opacity duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Live Orchestration"
        tabIndex={-1}
        className={`
          fixed top-0 right-0 bottom-0 z-50
          w-full sm:w-[480px]
          bg-zinc-950 border-l border-zinc-800
          flex flex-col
          transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">{'\uD83D\uDD2C'}</span>
            <span className="text-sm font-bold text-white">Live Orchestration</span>
            <span className={`
              text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
              ${mode === 'live'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-zinc-800 text-zinc-500'}
            `}>
              {mode === 'live' ? 'LIVE' : 'PLAYBACK'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close orchestration drawer"
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'activity'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'map'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Map
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {activeTab === 'activity' ? (
            <AgentActivityFeed
              events={state.events}
              className="h-full p-3"
            />
          ) : (
            <div className="p-3">
              <CompactEmergencyMap state={state} layers={layers} />
            </div>
          )}
        </div>

        {/* Footer — citation strip */}
        <div className="px-4 py-2 border-t border-zinc-800 shrink-0">
          <div className="text-[9px] text-zinc-600 text-center tracking-wide">
            Caputo &middot; Buter &middot; Schierbeck &middot; MDAgents
          </div>
          <div className="text-center mt-1">
            <Link href="/data-sources" className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors underline">
              All Data Sources
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
