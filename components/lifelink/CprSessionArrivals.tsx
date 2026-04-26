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
    return o;
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

  const chip = (v: AedShockAnswer, label: string) => (
    <button
      key={v}
      type="button"
      onClick={() => onShockAnswer(v)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: 999,
        fontSize: 10,
        fontFamily: FONT.mono,
        fontWeight: 700,
        letterSpacing: 0.8,
        border: `1px solid ${shockAnswer === v ? '#fff' : 'rgba(255,255,255,0.35)'}`,
        background: shockAnswer === v ? 'rgba(255,255,255,0.2)' : 'transparent',
        color: '#fff',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AED use guide"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.92)',
        overflowY: 'auto',
        padding: '56px 18px 28px',
        color: '#fff',
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.AMBER, fontWeight: 700 }}>
          AED ON SCENE
        </div>
        <h2 style={{ margin: '6px 0 12px', fontSize: 20, fontWeight: 800, fontFamily: FONT.display }}>Use guide</h2>
        <div
          style={{
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#111',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cpr/aed-use-guide.png"
            alt="AED pad placement on chest: upper right and lower left; turn device on and follow voice prompts; shock only if advised."
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
        <p style={{ margin: '14px 0 10px', fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.82)' }}>
          Did the AED deliver a shock?
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {chip('yes', 'Yes')}
          {chip('no', 'No')}
          {chip('unknown', 'Not sure')}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'block',
            width: '100%',
            marginTop: 20,
            padding: 14,
            textAlign: 'center',
            borderRadius: 14,
            background: X.GREEN,
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: FONT.body,
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
              marginTop: 10,
              padding: 14,
              textAlign: 'center',
              borderRadius: 14,
              fontWeight: 800,
              fontSize: 14,
              fontFamily: FONT.body,
              background: 'rgba(44,102,232,0.2)',
              border: `1.5px solid ${X.BLUE}`,
              color: '#fff',
            }}
          >
            <Icon name="phone" size={14} color="#fff" stroke={2.2} />
            <span>Ambulance arrived</span>
          </button>
        )}
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
    snapshot.avgBpm != null ||
    snapshot.lastBpm != null;
  const durationLabel = hasCprDetail ? 'CPR session time' : 'Time on phone (SOS)';

  const row = (label: string, value: string) => (
    <div
      key={label}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.65)', fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.6 }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CPR session summary"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(0,0,0,0.92)',
        overflowY: 'auto',
        padding: '56px 18px 28px',
        color: '#fff',
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.BLUE, fontWeight: 700 }}>
          AMBULANCE ON SCENE
        </div>
        <h2 style={{ margin: '6px 0 8px', fontSize: 20, fontWeight: 800, fontFamily: FONT.display }}>CPR summary</h2>
        {snapshot.cycles302 === 0 &&
          snapshot.compressionsClock === 0 &&
          snapshot.sensorCount == null &&
          snapshot.avgBpm == null &&
          snapshot.lastBpm == null && (
            <p style={{ margin: '0 0 14px', fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.72)' }}>
              No CPR assist log on this phone yet — only total time is shown. Open <strong>Ambulance arrived</strong> from the CPR screen during a future session to capture compressions, BPM, and AED details.
            </p>
          )}
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '4px 14px 8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          {row(durationLabel, fmtDuration(snapshot.durationMs))}
          {row('30:2 sets completed', String(snapshot.cycles302))}
          {row('Compressions (guided clock)', String(snapshot.compressionsClock))}
          {row('Patch compression count', snapshot.sensorCount != null ? String(snapshot.sensorCount) : '—')}
          {row('Average BPM (patch)', snapshot.avgBpm != null ? `${snapshot.avgBpm}` : '—')}
          {row('Last BPM (patch)', snapshot.lastBpm != null ? `${snapshot.lastBpm}` : '—')}
          {row('Target BPM', String(snapshot.targetBpm))}
          {row('AED arrived', snapshot.aedArrived ? 'Yes' : 'No')}
          {row('AED shock delivered', shockLabel(snapshot.aedShockDelivered))}
        </div>
        {onEndEmergency && (
          <button
            type="button"
            onClick={onEndEmergency}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'block',
              width: '100%',
              marginTop: 18,
              padding: 14,
              textAlign: 'center',
              borderRadius: 14,
              background: X.GREEN,
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              fontFamily: FONT.body,
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
            marginTop: onEndEmergency ? 10 : 18,
            padding: 14,
            textAlign: 'center',
            borderRadius: 14,
            background: onEndEmergency ? 'rgba(255,255,255,0.1)' : X.BLUE,
            border: onEndEmergency ? '1px solid rgba(255,255,255,0.25)' : 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: FONT.body,
          }}
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
