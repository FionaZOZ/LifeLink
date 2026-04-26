'use client';
import * as React from 'react';
import Link from 'next/link';
import { X, FONT } from './tokens';
import { Icon } from './Icon';
import { useHelperFlow } from './helperFlow';
import { useT } from './i18n';

/** CPR toolbar — BEAT toggle (metronome ticks driven on assist page) + helper JOIN CALL. */
export function CPRToolbar({
  beatOn,
  onBeatToggle,
  helpersInCall = 2,
  defaultInCall = false,
  onCallActiveChange,
}: {
  beatOn: boolean;
  onBeatToggle: () => void;
  helpersInCall?: number;
  defaultInCall?: boolean;
  onCallActiveChange?: (active: boolean) => void;
}) {
  const { t } = useT();
  const [inCall, setInCall] = React.useState(defaultInCall);
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    onCallActiveChange?.(inCall);
  }, [inCall, onCallActiveChange]);

  const onToggleCall = () => {
    setInCall((v) => {
      if (v) setMuted(false);
      return !v;
    });
  };
  const onToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((v) => !v);
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={onBeatToggle}
        aria-pressed={beatOn}
        style={{
          all: 'unset',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 999,
          background: beatOn ? `${X.RED}22` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${beatOn ? X.RED : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        {beatOn && (
          <span
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: 999,
              border: `1px solid ${X.RED}55`,
              animation: 'll-pulse-ring 1.2s ease-out infinite',
              pointerEvents: 'none',
            }}
          />
        )}
        <Icon name="volume" size={14} color={beatOn ? '#fff' : 'rgba(255,255,255,0.55)'} stroke={2.2} />
        <span
          style={{
            fontSize: 9.5,
            fontFamily: FONT.mono,
            letterSpacing: 1,
            fontWeight: 700,
            color: beatOn ? '#fff' : 'rgba(255,255,255,0.55)',
          }}
        >
          {beatOn ? t('cpr.shared.beatOn') : t('cpr.shared.beatOff')}
        </span>
      </button>

      {/* JOIN CALL / ON CALL */}
      <button
        type="button"
        onClick={onToggleCall}
        aria-pressed={inCall}
        style={{
          all: 'unset', cursor: 'pointer',
          position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 999,
          background: inCall ? X.RED : X.GREEN,
          border: `1px solid ${inCall ? X.RED : X.GREEN}`,
          transition: 'background 160ms linear, border-color 160ms linear',
        }}
      >
        <Icon name={inCall ? 'mic' : 'phone'} size={14} color="#fff" stroke={2.2}/>
        <span style={{ fontSize: 9.5, fontFamily: FONT.mono, letterSpacing: 1, fontWeight: 800, color: '#fff' }}>
          {inCall ? t('cpr.shared.onCall') : t('cpr.shared.joinCall')}
        </span>
        {!inCall ? (
          <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: '#fff', color: X.GREEN, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{helpersInCall}</span>
        ) : (
          <span
            onClick={onToggleMute}
            role="button"
            aria-pressed={muted}
            aria-label={muted ? t('cpr.shared.aria.unmute') : t('cpr.shared.aria.mute')}
            style={{ minWidth: 16, height: 16, padding: '0 5px', borderRadius: 8, background: muted ? '#fff' : 'rgba(0,0,0,0.25)', color: muted ? X.RED : '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {muted ? t('cpr.shared.muted') : t('cpr.shared.mute')}
          </span>
        )}
      </button>
    </div>
  );
}

// CPRMiniLive consumes the central helperFlow hook so the dispatch card,
// the toast and this strip all stay in lockstep. The displayed rows are
// Marcus, Sarah and EMS — Jordan stays in the dispatch card's "3 alerted" count.

export function CPRMiniLive({ dark = true }: { dark?: boolean }) {
  const { t } = useT();
  const flow = useHelperFlow();
  const labelMono: React.CSSProperties = { fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.2, color: dark ? 'rgba(255,255,255,0.5)' : X.INK2 };
  const mutedColor = dark ? 'rgba(255,255,255,0.45)' : X.INK3;

  const visible = flow.rows.filter(r => r.helper.id !== 'jordan');
  const onScene = flow.onSceneCount > 0;
  const acceptedCount = flow.acceptedCount; // includes EMS once dispatched
  const headerStatus = onScene ? t('cpr.shared.mini.onScene') : acceptedCount === 0 ? t('cpr.shared.mini.alerting') : t('cpr.shared.mini.coming');
  const headerColor = onScene ? X.GREEN : acceptedCount === 0 ? X.AMBER : X.GREEN;

  // Match the SVG dots to Marcus / Sarah / EMS (in that grid layout)
  const dotPositions: Record<string, { x: number; y: number }> = {
    marcus: { x: 14, y: 74 },
    sarah: { x: 86, y: 14 },
    ems: { x: 84, y: 76 },
  };

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
        <span style={labelMono}>{t('cpr.shared.mini.tapExpand')}</span>
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
            {visible.map(r => {
              const pos = dotPositions[r.helper.id];
              if (!pos) return null;
              const accepted = r.state === 'accepted' || r.state === 'arriving' || r.state === 'on_scene';
              const arrived = r.state === 'on_scene';
              return (
                <circle key={r.helper.id}
                  cx={arrived ? 50 : pos.x} cy={arrived ? 45 : pos.y} r="3.5"
                  fill={accepted ? r.helper.color : '#bfc4be'}
                  stroke="#fff" strokeWidth="1"
                  style={{ transition: 'cx 600ms ease-out, cy 600ms ease-out, fill 200ms linear' }}/>
              );
            })}
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
          {visible.map(r => {
            const pending = r.state === 'queued' || r.state === 'notified';
            return (
              <div key={r.helper.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: pending ? mutedColor : r.helper.color, transition: 'background 200ms linear' }}/>
                <span style={{ flex: 1, color: dark ? '#fff' : X.INK, fontWeight: 600, opacity: pending ? 0.6 : 1 }}>{r.helper.name}</span>
                <span style={{ ...labelMono, color: pending ? mutedColor : r.helper.color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.rowEtaText}</span>
                <span style={{ ...labelMono, opacity: 0.65, minWidth: 96, textAlign: 'right' }}>{r.rowStatusText}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}
