'use client';

import { useMemo } from 'react';
import type { ScenarioState } from '@/lib/useEmergencyTelemetry';

// ── Types ──────────────────────────────────────────────────────────────────

type CardKey = '911' | 'ems' | 'drone' | 'volunteers' | 'aed' | 'hospital';

interface EmergencyStatusCardsProps {
  state: ScenarioState;
  visibleCards?: CardKey[];
  layout?: 'grid' | 'row';
}

// ── Card config ────────────────────────────────────────────────────────────

interface CardDef {
  key: CardKey;
  icon: string;
  label: string;
  color: string;     // tailwind text color
  bgColor: string;   // tailwind bg color for icon ring
  getValue: (s: ScenarioState) => string;
  getSub: (s: ScenarioState) => string;
  isActive: (s: ScenarioState) => boolean;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return 'On scene';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PHASE_ORDER = ['idle', 'call_received', 'agents_dispatching', 'aeds_located', 'ems_en_route', 'drone_launched', 'triage_complete', 'handoff_ready', 'resolved'];

function isPastPhase(current: string, target: string): boolean {
  return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

const CARD_DEFS: CardDef[] = [
  {
    key: '911',
    icon: '\uD83D\uDCDE',
    label: '911',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    getValue: (s) => isPastPhase(s.phase, 'call_received') ? 'Confirmed' : 'Calling...',
    getSub: (s) => isPastPhase(s.phase, 'call_received') ? 'PSAP-LA-37 \u2713' : 'Connecting to dispatch',
    isActive: (s) => s.phase === 'call_received',
  },
  {
    key: 'ems',
    icon: '\uD83D\uDE91',
    label: 'EMS',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    getValue: (s) => s.emsUnits[0] ? formatEta(s.emsUnits[0].eta_minutes * 60) : 'Standby',
    getSub: (s) => s.emsUnits[0] ? `${s.emsUnits[0].unit_type} \u00B7 LA County FD` : 'Awaiting dispatch',
    isActive: (s) => s.phase === 'ems_en_route',
  },
  {
    key: 'drone',
    icon: '\uD83D\uDEF8',
    label: 'DRONE',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    getValue: (s) => s.drone ? (s.drone.status === 'delivered' ? 'Delivered' : formatEta(s.drone.eta_seconds)) : 'Standby',
    getSub: (s) => s.drone ? 'UAV-AED \u00B7 50 km/h (Schierbeck 2023)' : 'Awaiting launch',
    isActive: (s) => s.phase === 'drone_launched',
  },
  {
    key: 'volunteers',
    icon: '\uD83D\uDC65',
    label: 'VOLUNTEERS',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    getValue: () => '5 alerted',
    getSub: () => 'PulsePoint Respond pool',
    isActive: (s) => isPastPhase(s.phase, 'agents_dispatching') && !isPastPhase(s.phase, 'ems_en_route'),
  },
  {
    key: 'aed',
    icon: '\u26A1',
    label: 'NEAREST AED',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    getValue: (s) => {
      const nearest = s.nearbyAeds.filter(a => a.padsAvailable)[0];
      return nearest ? `${nearest.distanceM?.toFixed(0) ?? '?'}m` : 'Searching...';
    },
    getSub: (s) => {
      const nearest = s.nearbyAeds.filter(a => a.padsAvailable)[0];
      return nearest ? nearest.name : 'Scanning campus AEDs';
    },
    isActive: (s) => s.phase === 'aeds_located',
  },
  {
    key: 'hospital',
    icon: '\uD83C\uDFE5',
    label: 'HOSPITAL',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    getValue: (s) => s.hospital ? (s.hospital.name.split(' ').slice(0, 2).join(' ')) : 'Standby',
    getSub: (s) => s.hospital ? `${s.hospital.ecmo_capable ? 'ECMO \u2713' : 'Standard'} \u00B7 ${s.hospital.eta_minutes ?? '?'} min` : 'Awaiting assignment',
    isActive: (s) => s.phase === 'handoff_ready',
  },
];

// ── Detect recent event for glow pulse ────────────────────────────────────

const EVENT_TYPE_TO_CARD: Record<string, CardKey> = {
  dispatch: '911',
  ems_dispatched: 'ems',
  drone_launched: 'drone',
  aed_located: 'aed',
  handoff_ready: 'hospital',
  triage_complete: 'volunteers',
};

function hasRecentEvent(state: ScenarioState, cardKey: CardKey): boolean {
  const now = Date.now();
  return state.events.some(e => {
    const mapped = EVENT_TYPE_TO_CARD[e.type];
    return mapped === cardKey && (now - e.timestamp) < 1500;
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export function EmergencyStatusCards({
  state,
  visibleCards = ['911', 'ems', 'drone', 'volunteers'],
  layout = 'grid',
}: EmergencyStatusCardsProps) {
  const cards = useMemo(
    () => CARD_DEFS.filter(c => visibleCards.includes(c.key)),
    [visibleCards],
  );

  const containerClass = layout === 'grid'
    ? 'grid grid-cols-2 gap-3 w-full'
    : 'flex items-stretch gap-2 w-full overflow-x-auto';

  return (
    <div className={containerClass}>
      {cards.map(card => {
        const value = card.getValue(state);
        const sub = card.getSub(state);
        const active = card.isActive(state);
        const recentGlow = hasRecentEvent(state, card.key);

        return (
          <div
            key={card.key}
            className={`
              relative rounded-xl border p-3 transition-all duration-300
              ${layout === 'row' ? 'min-w-[120px] flex-1' : ''}
              ${active || recentGlow
                ? `border-current/30 ${card.bgColor} ring-2 ring-current/20 animate-pulse`
                : 'border-zinc-800 bg-zinc-900/60'}
            `}
            style={{ '--tw-ring-color': undefined } as React.CSSProperties}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm" aria-hidden="true">{card.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {card.label}
              </span>
            </div>
            <div className={`text-lg font-bold tabular-nums leading-tight ${card.color}`}>
              {value}
            </div>
            <div className="text-[11px] text-zinc-500 leading-snug mt-0.5 truncate">
              {sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
