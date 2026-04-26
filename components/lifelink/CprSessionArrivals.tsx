'use client';

import * as React from 'react';
import { BreathingReassessButton } from '@/components/lifelink/BreathingReassessButton';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { LAST_AMBULANCE_REPORT_KEY } from '@/components/lifelink/sosTimer';
import { TARGET_BPM } from '@/lib/cpr/cprAssistPhase';

export type AedShockAnswer = 'yes' | 'no' | 'unknown';

export type CprAmbulanceSnapshot = {
  durationMs: number;
  cycles302: number;
  compressionsClock: number;
  sensorCount: number | null;
  /** % of patch samples in depth ideal band (5–6 cm); null if no patch or no samples yet. */
  idealBandPct: number | null;
  lastBpm: number | null;
  avgBpm: number | null;
  targetBpm: number;
  aedArrived: boolean;
  aedShockDelivered: AedShockAnswer;
};

function fmtDuration(totalMs: number) {
  const s = Math.max(0, Math.floor(totalMs / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function shockLabel(v: AedShockAnswer) {
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  return 'Unknown';
}

export function persistAmbulanceReport(snapshot: CprAmbulanceSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(LAST_AMBULANCE_REPORT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function readStoredAmbulanceReport(): CprAmbulanceSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.sessionStorage.getItem(LAST_AMBULANCE_REPORT_KEY);
    if (!s) return null;
    const o = JSON.parse(s) as CprAmbulanceSnapshot;
    if (o == null || typeof o.durationMs !== 'number') return null;
    return {
      ...o,
      idealBandPct:
        typeof o.idealBandPct === 'number' && Number.isFinite(o.idealBandPct) ? o.idealBandPct : null,
    };
  } catch {
    return null;
  }
}

/** When no CPR assist snapshot exists — use SOS elapsed only (zeros for CPR-specific fields). */
export function buildMinimalAmbulanceSnapshot(sosElapsedSeconds: number): CprAmbulanceSnapshot {
  return {
    durationMs: Math.max(0, sosElapsedSeconds) * 1000,
    cycles302: 0,
    compressionsClock: 0,
    sensorCount: null,
    idealBandPct: null,
    lastBpm: null,
    avgBpm: null,
    targetBpm: TARGET_BPM,
    aedArrived: false,
    aedShockDelivered: 'unknown',
  };
}

/** Breathing link + AED / ambulance scene buttons */
export function CprSessionFooter({
  cyclesCompleted,
  onAedArrived,
  onAmbulanceArrived,
}: {
  cyclesCompleted: number;
  onAedArrived: () => void;
  onAmbulanceArrived: () => void;
}) {
  const btnBase: React.CSSProperties = {
    all: 'unset',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: FONT.body,
    letterSpacing: 0.2,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ marginTop: 4 }}>
      <BreathingReassessButton cyclesCompleted={cyclesCompleted} />
      <button
        type="button"
        onClick={onAedArrived}
        style={{
          ...btnBase,
          background: 'rgba(232,133,44,0.15)',
          border: `1.5px solid ${X.AMBER}`,
          color: X.AMBER,
          animation: 'll-slide-up-fade 360ms ease-out 80ms both',
        }}
      >
        <Icon name="pulse" size={14} color={X.AMBER} stroke={2.2} />
        <span>AED arrived</span>
      </button>
      <button
        type="button"
        onClick={onAmbulanceArrived}
        style={{
          ...btnBase,
          background: 'rgba(44,102,232,0.18)',
          border: `1.5px solid ${X.BLUE}`,
          color: '#fff',
          animation: 'll-slide-up-fade 360ms ease-out 200ms both',
        }}
      >
        <Icon name="phone" size={14} color="#fff" stroke={2.2} />
        <span>Ambulance arrived</span>
      </button>
    </div>
  );
}

export function AedGuideModal({
  open,
  onClose,
  shockAnswer,
  onShockAnswer,
  onAmbulanceArrived,
}: {
  open: boolean;
  onClose: () => void;
  shockAnswer: AedShockAnswer;
  onShockAnswer: (v: AedShockAnswer) => void;
  /** Opens the ambulance summary flow and should close this AED sheet (parent closes `open`). */
  onAmbulanceArrived?: () => void;
}) {
  if (!open) return null;

  const chip = (v: AedShockAnswer, label: string) => {
    const on = shockAnswer === v;
    return (
      <button
        key={v}
        type="button"
        onClick={() => onShockAnswer(v)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          padding: '8px 14px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: FONT.body,
          border: `1.5px solid ${on ? X.AMBER : X.LINE}`,
          background: on ? X.AMBER : '#fff',
          color: on ? '#fff' : X.INK,
          transition: 'background 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AED use guide"
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'll-backdrop-fade-in 220ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '92%',
          background: X.PAPER,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'll-sheet-slide-up 320ms cubic-bezier(0.32, 0.72, 0.24, 1)',
          willChange: 'transform',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: X.LINE, margin: '10px auto 0' }}/>

        {/* Header */}
        <div style={{ padding: '12px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.AMBER, fontWeight: 700 }}>
              AED ON SCENE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4, color: X.INK }}>Use guide</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              all: 'unset', cursor: 'pointer',
              width: 32, height: 32, borderRadius: 10,
              background: X.BG, color: X.INK,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={16} color={X.INK} stroke={2.4}/>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="ll-scroll-hide" style={{ overflowY: 'auto', padding: '14px 22px 18px', flex: 1 }}>
          <div
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              border: `1px solid ${X.LINE}`,
              background: X.BG,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cpr/aed-use-guide.png"
              alt="AED pad placement on chest: upper right and lower left; turn device on and follow voice prompts; shock only if advised."
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
          <div style={{ marginTop: 16, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, fontWeight: 700 }}>DID THE AED DELIVER A SHOCK?</div>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {chip('yes', 'Yes')}
            {chip('no', 'No')}
            {chip('unknown', 'Not sure')}
          </div>
        </div>

        {/* Sticky bottom CTAs */}
        <div style={{ padding: '14px 22px 22px', borderTop: `1px solid ${X.LINE}`, background: X.PAPER }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              padding: 14,
              textAlign: 'center',
              borderRadius: 14,
              background: X.GREEN,
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              fontFamily: FONT.body,
              boxShadow: '0 6px 18px rgba(31,138,77,0.3)',
            }}
          >
            Back to CPR
          </button>
          {onAmbulanceArrived && (
            <button
              type="button"
              onClick={onAmbulanceArrived}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                boxSizing: 'border-box',
                marginTop: 10,
                padding: 14,
                textAlign: 'center',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 13,
                fontFamily: FONT.body,
                background: X.BLUE_BG,
                border: `1.5px solid ${X.BLUE}`,
                color: X.BLUE,
              }}
            >
              <Icon name="phone" size={14} color={X.BLUE} stroke={2.2} />
              <span>Ambulance arrived</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AmbulanceSummaryModal({
  open,
  snapshot,
  onClose,
  onEndEmergency,
  dismissLabel = 'Close',
}: {
  open: boolean;
  snapshot: CprAmbulanceSnapshot | null;
  onClose: () => void;
  /** When set, shows a primary control that ends the SOS session (e.g. recovery handoff). */
  onEndEmergency?: () => void;
  dismissLabel?: string;
}) {
  if (!open || !snapshot) return null;

  const hasCprDetail =
    snapshot.cycles302 > 0 ||
    snapshot.compressionsClock > 0 ||
    snapshot.sensorCount != null ||
    snapshot.idealBandPct != null ||
    snapshot.avgBpm != null ||
    snapshot.lastBpm != null;
  const durationLabel = hasCprDetail ? 'CPR session time' : 'Time on phone (SOS)';

  const row = (label: string, value: string) => (
    <div
      key={label}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 16,
        padding: '10px 0',
        borderBottom: `1px solid ${X.LINE2}`,
        fontSize: 13,
      }}
    >
      <span style={{ color: X.INK2, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.6 }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, textAlign: 'right', color: X.INK }}>{value}</span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CPR session summary"
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'll-backdrop-fade-in 220ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxHeight: '92%',
          background: X.PAPER,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'll-sheet-slide-up 320ms cubic-bezier(0.32, 0.72, 0.24, 1)',
          willChange: 'transform',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: X.LINE, margin: '10px auto 0' }}/>

        {/* Header */}
        <div style={{ padding: '12px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.BLUE, fontWeight: 700 }}>
              AMBULANCE ON SCENE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4, color: X.INK }}>CPR summary</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              all: 'unset', cursor: 'pointer',
              width: 32, height: 32, borderRadius: 10,
              background: X.BG, color: X.INK,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="x" size={16} color={X.INK} stroke={2.4}/>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="ll-scroll-hide" style={{ overflowY: 'auto', padding: '14px 22px 18px', flex: 1 }}>
          {snapshot.cycles302 === 0 &&
            snapshot.compressionsClock === 0 &&
            snapshot.sensorCount == null &&
            snapshot.idealBandPct == null &&
            snapshot.avgBpm == null &&
            snapshot.lastBpm == null && (
              <p style={{ margin: '0 0 14px', fontSize: 12, lineHeight: 1.5, color: X.INK2 }}>
                No CPR assist log on this phone yet — only total time is shown. Open <strong style={{ color: X.INK }}>Ambulance arrived</strong> from the CPR screen during a future session to capture compressions, BPM, and AED details.
              </p>
            )}
          <div style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, padding: '4px 14px 8px' }}>
            {row(durationLabel, fmtDuration(snapshot.durationMs))}
            {row('30:2 sets completed', String(snapshot.cycles302))}
            {row('Compressions (guided clock)', String(snapshot.compressionsClock))}
            {row('Patch compression count', snapshot.sensorCount != null ? String(snapshot.sensorCount) : '—')}
            {row('% in ideal depth band (patch)', snapshot.idealBandPct != null ? `${snapshot.idealBandPct}%` : '—')}
            {row('Average BPM (patch)', snapshot.avgBpm != null ? `${snapshot.avgBpm}` : '—')}
            {row('Last BPM (patch)', snapshot.lastBpm != null ? `${snapshot.lastBpm}` : '—')}
            {row('Target BPM', String(snapshot.targetBpm))}
            {row('AED arrived', snapshot.aedArrived ? 'Yes' : 'No')}
            {row('AED shock delivered', shockLabel(snapshot.aedShockDelivered))}
          </div>
        </div>

        {/* Sticky bottom CTAs */}
        <div style={{ padding: '14px 22px 22px', borderTop: `1px solid ${X.LINE}`, background: X.PAPER }}>
          {onEndEmergency && (
            <button
              type="button"
              onClick={onEndEmergency}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                boxSizing: 'border-box',
                padding: 14,
                textAlign: 'center',
                borderRadius: 14,
                background: X.GREEN,
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                fontFamily: FONT.body,
                boxShadow: '0 6px 18px rgba(31,138,77,0.3)',
              }}
            >
              End emergency
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              marginTop: onEndEmergency ? 10 : 0,
              padding: 14,
              textAlign: 'center',
              borderRadius: 14,
              background: onEndEmergency ? X.BG : X.BLUE,
              border: onEndEmergency ? `1px solid ${X.LINE}` : 'none',
              color: onEndEmergency ? X.INK : '#fff',
              fontWeight: onEndEmergency ? 700 : 800,
              fontSize: 14,
              fontFamily: FONT.body,
            }}
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
