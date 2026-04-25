'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
// CoordinatorPanel retired in favor of OrchestrationDrawer (Phase 3 integration). File preserved for reference.
// import { CoordinatorPanel } from '@/components/CoordinatorPanel';
import { Call911Banner } from '@/components/Call911Banner';
import { EmergencyStatusCards } from '@/components/EmergencyStatusCards';
import { OrchestrationPill } from '@/components/OrchestrationPill';
import { OrchestrationDrawer } from '@/components/OrchestrationDrawer';
import { useEmergencyTelemetry } from '@/lib/useEmergencyTelemetry';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Lazy-load the compact map to avoid pulling Mapbox into initial bundle
const CompactEmergencyMap = dynamic(
  () => import('@/components/CompactEmergencyMap').then(m => ({ default: m.CompactEmergencyMap })),
  { ssr: false, loading: () => <div className="h-[280px] bg-zinc-900 animate-pulse rounded-lg" /> },
);

// ── Twilio polling types (preserved from original) ────────────────────────

interface EmergencyStatus {
  location: { lat: number; lng: number; address: string };
  notifications_sent: Array<{
    phone: string;
    method: 'call' | 'sms';
    status: 'calling' | 'sent' | 'accepted' | 'declined' | 'no_answer';
    name: string;
    distance: string;
    eta?: string;
  }>;
  volunteers_responded: number;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DispatchStatus() {
  const router = useRouter();

  // ?mode=live switches to live SSE mode (default: playback for demo safety)
  const [urlMode, setUrlMode] = useState<'playback' | 'live'>('playback');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'live') setUrlMode('live');
  }, []);

  // Telemetry hook — drives status cards, map, and orchestration drawer
  const { state } = useEmergencyTelemetry({
    mode: urlMode,
    scenarioId: 'royce_hall',
    persist: true,
  });

  // Orchestration drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const lastSeenRef = useRef(0);

  useEffect(() => {
    if (!drawerOpen && state.events.length > lastSeenRef.current) {
      setUnseenCount(state.events.length - lastSeenRef.current);
    }
  }, [state.events.length, drawerOpen]);

  const openDrawer = () => {
    setDrawerOpen(true);
    setUnseenCount(0);
    lastSeenRef.current = state.events.length;
  };

  // ── Twilio polling (preserved from original) ────────────────────────────

  const [twilioStatus, setTwilioStatus] = useState<EmergencyStatus>({
    location: { lat: 33.6846, lng: -117.8265, address: '3200 California Ave, Irvine CA' },
    notifications_sent: [
      { phone: '+19495190927', method: 'call', status: 'calling', name: 'Volunteer A', distance: '150m away', eta: '2 min' },
      { phone: '+19493440799', method: 'sms', status: 'sent', name: 'Volunteer B', distance: '280m away', eta: '3 min' },
      { phone: '+19492223333', method: 'call', status: 'calling', name: 'Volunteer C', distance: '320m away', eta: '4 min' },
    ],
    volunteers_responded: 0,
  });

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/emergency/status');
        if (response.ok) {
          const data = await response.json();
          setTwilioStatus(prev => ({ ...prev, ...data }));
        }
      } catch {
        // Backend not available — use demo data
      }
    }, 3000);

    const simulateResponses = setTimeout(() => {
      setTwilioStatus(prev => ({
        ...prev,
        notifications_sent: prev.notifications_sent.map((notif, idx) =>
          idx < 2 ? { ...notif, status: 'accepted' as const } : notif
        ),
        volunteers_responded: 2,
      }));
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(simulateResponses);
    };
  }, []);

  // ── Auto-advance to CPR after drone_launched + 10s ──────────────────────

  const dispatchStartRef = useRef(Date.now());
  const [autoAdvanceReady, setAutoAdvanceReady] = useState(false);

  useEffect(() => {
    if (state.phase === 'drone_launched' || state.phase === 'triage_complete' || state.phase === 'handoff_ready' || state.phase === 'resolved') {
      const elapsed = (Date.now() - dispatchStartRef.current) / 1000;
      if (elapsed >= 10) {
        setAutoAdvanceReady(true);
      } else {
        const remaining = (10 - elapsed) * 1000;
        const timer = setTimeout(() => setAutoAdvanceReady(true), remaining);
        return () => clearTimeout(timer);
      }
    }
  }, [state.phase]);

  useEffect(() => {
    if (autoAdvanceReady) {
      router.push('/emergency/cpr');
    }
  }, [autoAdvanceReady, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* 911 Banner */}
      <Call911Banner />

      {/* Header */}
      <header className="px-4 py-4 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Dispatching response &mdash; agents en route</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {new Date().toLocaleTimeString('en-US', { hour12: false })} &middot; Powered by Fetch.ai uAgents
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4 pb-20">
        {/* Status Cards */}
        <EmergencyStatusCards
          state={state}
          visibleCards={['911', 'ems', 'drone', 'volunteers']}
          layout="grid"
        />

        {/* Compact Map */}
        <CompactEmergencyMap state={state} height={280} />

        {/* Volunteer Twilio Status (preserved) */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Volunteer Alerts</span>
            <span className="text-[10px] font-mono text-zinc-600">
              {twilioStatus.volunteers_responded}/{twilioStatus.notifications_sent.length} responding
            </span>
          </div>
          <div className="space-y-2">
            {twilioStatus.notifications_sent.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-zinc-800/50 rounded-lg">
                <span className="text-sm">{v.method === 'call' ? '\uD83D\uDCDE' : '\uD83D\uDCAC'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-zinc-200">{v.name}</div>
                  <div className="text-[10px] text-zinc-500">{v.distance}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold ${
                    v.status === 'accepted' ? 'text-green-400' :
                    v.status === 'calling' || v.status === 'sent' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {v.status === 'accepted' ? 'Accepted \u2713' :
                     v.status === 'calling' ? 'Calling...' :
                     v.status === 'sent' ? 'SMS Sent' :
                     v.status}
                  </div>
                  {v.status === 'accepted' && v.eta && (
                    <div className="text-[10px] text-zinc-500">ETA: {v.eta}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Continue to CPR button */}
        <button
          type="button"
          onClick={() => router.push('/emergency/cpr')}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg shadow-lg"
        >
          Continue to CPR Coach &rarr;
        </button>

        <div className="text-center mt-3">
          <Link href="/data-sources" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
            Data Sources &amp; Attribution
          </Link>
        </div>
      </main>

      {/* Orchestration Pill + Drawer */}
      <OrchestrationPill
        onClick={openDrawer}
        unseenCount={unseenCount}
      />
      <OrchestrationDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); lastSeenRef.current = state.events.length; }}
        state={state}
        mode={urlMode}
      />
    </div>
  );
}
