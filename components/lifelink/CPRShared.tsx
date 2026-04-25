'use client';
import * as React from 'react';
import Link from 'next/link';
import { X, FONT } from './tokens';
import { Icon } from './Icon';
import { useSosElapsed } from './sosTimer';

export function CPRToolbar({ metroOn = true, voiceOn = true, helpersInCall = 2 }: {
  metroOn?: boolean; voiceOn?: boolean; helpersInCall?: number;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: metroOn ? `${X.RED}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${metroOn ? X.RED : 'rgba(255,255,255,0.12)'}` }}>
        {metroOn && <span style={{ position: 'absolute', inset: -3, borderRadius: 999, border: `1px solid ${X.RED}55`, animation: 'll-pulse-ring 1.2s ease-out infinite', pointerEvents: 'none' }}/>}
        <Icon name="volume" size={14} color={metroOn ? '#fff' : 'rgba(255,255,255,0.55)'} stroke={2.2}/>
        <span style={{ fontSize: 9.5, fontFamily: FONT.mono, letterSpacing: 1, fontWeight: 700, color: metroOn ? '#fff' : 'rgba(255,255,255,0.55)' }}>BEAT {metroOn ? 'ON' : 'OFF'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: voiceOn ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)', border: `1px solid ${voiceOn ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)'}` }}>
        <Icon name="mic" size={14} color={voiceOn ? '#fff' : 'rgba(255,255,255,0.45)'} stroke={2.2}/>
        <span style={{ fontSize: 9.5, fontFamily: FONT.mono, letterSpacing: 1, fontWeight: 700, color: voiceOn ? '#fff' : 'rgba(255,255,255,0.45)' }}>HEY LIFELINK</span>
      </div>
      <button style={{ all: 'unset', position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: X.GREEN, border: `1px solid ${X.GREEN}`, cursor: 'pointer' }}>
        <Icon name="phone" size={14} color="#fff" stroke={2.2}/>
        <span style={{ fontSize: 9.5, fontFamily: FONT.mono, letterSpacing: 1, fontWeight: 800, color: '#fff' }}>JOIN CALL</span>
        <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#fff', color: X.GREEN, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{helpersInCall}</span>
      </button>
    </div>
  );
}

// ── Helper-flow simulation ────────────────────────────────────────────────
// Driven entirely off the global SOS elapsed clock so every screen sees
// the same evolving state. Anchors tuned for a believable demo cadence:
//   - EMS dispatched at t=4s (~immediately after the 911 slide).
//   - Marcus (closest, CPR Tier-2) accepts at t=8s, ETA 100s when accepted.
//   - Sarah (further, picks up AED) accepts at t=15s, ETA 165s.
// State strings update as ETAs cross human thresholds (EN ROUTE / ARRIVING / ON SCENE).

type HelperRow = {
  color: string;
  name: string;
  eta: string;       // M:SS, "PENDING", or "ON SCENE"
  status: string;    // "notified", "en route", "arriving", etc.
  etaColor: string;  // colour for the eta text — fades muted while pending
};

function fmtMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function helperState(t: number, opts: {
  acceptAt: number;
  etaInitialSec: number;
  enRouteCopy: string;
  arrivedCopy: string;
}, color: string, mutedColor: string): { eta: string; status: string; etaColor: string } {
  if (t < opts.acceptAt) {
    return { eta: 'PENDING', status: 'notified · awaiting accept', etaColor: mutedColor };
  }
  const remaining = Math.max(0, opts.etaInitialSec - (t - opts.acceptAt));
  if (remaining <= 0) return { eta: 'ON SCENE', status: opts.arrivedCopy, etaColor: color };
  if (remaining <= 25) return { eta: fmtMmSs(remaining), status: 'arriving', etaColor: color };
  return { eta: fmtMmSs(remaining), status: opts.enRouteCopy, etaColor: color };
}

export function CPRMiniLive({ dark = true }: { dark?: boolean }) {
  const t = useSosElapsed();
  const labelMono: React.CSSProperties = { fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.2, color: dark ? 'rgba(255,255,255,0.5)' : X.INK2 };
  const mutedColor = dark ? 'rgba(255,255,255,0.45)' : X.INK3;

  const marcus = helperState(t, { acceptAt: 8,  etaInitialSec: 100, enRouteCopy: 'en route',                 arrivedCopy: 'on scene · CPR' }, X.GREEN, mutedColor);
  const sarah  = helperState(t, { acceptAt: 15, etaInitialSec: 165, enRouteCopy: 'AED en route',             arrivedCopy: '+AED here' },     X.AMBER, mutedColor);
  const ems    = helperState(t, { acceptAt: 4,  etaInitialSec: 285, enRouteCopy: 'dispatched',               arrivedCopy: 'on scene · ALS' }, X.BLUE,  mutedColor);

  const accepted = [marcus, sarah, ems].filter(h => h.eta !== 'PENDING').length;
  const onScene = [marcus, sarah, ems].some(h => h.eta === 'ON SCENE');
  const headerStatus = onScene ? 'HELPER ON SCENE' : accepted === 0 ? 'ALERTING NEARBY HELPERS' : 'HELP IS COMING';
  const headerColor = onScene ? X.GREEN : accepted === 0 ? X.AMBER : X.GREEN;

  const rows: HelperRow[] = [
    { color: X.GREEN, name: 'Marcus · CPR',     ...marcus },
    { color: X.AMBER, name: 'Sarah · AED',      ...sarah },
    { color: X.BLUE,  name: 'EMS · ambulance',  ...ems },
  ];

  return (
    <Link href="/sos/map" style={{
      textDecoration: 'none', display: 'block',
      background: dark ? '#000' : '#fff',
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : X.LINE}`,
    }}>
      <div style={{ padding: '8px 14px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="ll-blink" style={{ width: 6, height: 6, borderRadius: 3, background: headerColor }}/>
        <span style={{ ...labelMono, color: headerColor, fontWeight: 700 }}>{headerStatus}</span>
        <span style={{ flex: 1 }}/>
        <span style={labelMono}>TAP TO EXPAND ↗</span>
      </div>
      <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '88px 1fr', gap: 12, alignItems: 'stretch' }}>
        <div style={{ position: 'relative', height: 80, borderRadius: 10, overflow: 'hidden', background: '#E8EAE6' }}>
          <svg viewBox="0 0 100 90" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
            <rect x="0" y="0" width="100" height="90" fill="#E8EAE6"/>
            <g fill="#DCDFD8">
              <rect x="2" y="4" width="40" height="22" rx="1"/>
              <rect x="46" y="4" width="50" height="22" rx="1"/>
              <rect x="2" y="32" width="35" height="26" rx="1"/>
              <rect x="44" y="32" width="22" height="26" rx="1"/>
              <rect x="72" y="32" width="24" height="40" rx="1"/>
              <rect x="2" y="64" width="60" height="24" rx="1"/>
              <rect x="68" y="78" width="28" height="10" rx="1"/>
            </g>
            <g stroke="#fff" strokeWidth="3" fill="none">
              <line x1="0" y1="29" x2="100" y2="29"/>
              <line x1="0" y1="61" x2="100" y2="61"/>
              <line x1="42" y1="0" x2="42" y2="90"/>
            </g>
            {/* responder dots fade in as each accepts; arrived dots ride to centre */}
            {[
              { x: 14, y: 74, c: X.GREEN, accepted: marcus.eta !== 'PENDING', arrived: marcus.eta === 'ON SCENE' },
              { x: 86, y: 14, c: X.AMBER, accepted: sarah.eta !== 'PENDING',  arrived: sarah.eta === 'ON SCENE' },
              { x: 84, y: 76, c: X.BLUE,  accepted: ems.eta !== 'PENDING',    arrived: ems.eta === 'ON SCENE' },
            ].map((d, i) => (
              <circle key={i}
                cx={d.arrived ? 50 : d.x} cy={d.arrived ? 45 : d.y} r="3.5"
                fill={d.accepted ? d.c : '#bfc4be'}
                stroke="#fff" strokeWidth="1"
                style={{ transition: 'cx 600ms ease-out, cy 600ms ease-out, fill 200ms linear' }}/>
            ))}
            <g stroke="#9095A0" strokeWidth="0.8" strokeDasharray="1.5 2" fill="none">
              <path d="M14 74 Q30 58 50 45"/>
              <path d="M86 14 Q70 28 50 45"/>
              <path d="M84 76 Q70 60 50 45"/>
            </g>
            <circle cx="50" cy="45" r="6" fill={X.RED} fillOpacity="0.2">
              <animate attributeName="r" values="5;9;5" dur="1.6s" repeatCount="indefinite"/>
              <animate attributeName="fill-opacity" values="0.35;0;0.35" dur="1.6s" repeatCount="indefinite"/>
            </circle>
            <circle cx="50" cy="45" r="4" fill={X.RED} stroke="#fff" strokeWidth="1.2"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: r.eta === 'PENDING' ? mutedColor : r.color, transition: 'background 200ms linear' }}/>
              <span style={{ flex: 1, color: dark ? '#fff' : X.INK, fontWeight: 600, opacity: r.eta === 'PENDING' ? 0.6 : 1 }}>{r.name}</span>
              <span style={{ ...labelMono, color: r.etaColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.eta}</span>
              <span style={{ ...labelMono, opacity: 0.65, minWidth: 88, textAlign: 'right' }}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
