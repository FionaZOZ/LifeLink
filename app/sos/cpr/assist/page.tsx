'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { CPRToolbar, CPRMiniLive } from '@/components/lifelink/CPRShared';
import { PatientProfileSheet } from '@/components/lifelink/PatientProfileSheet';
import {
  CprSessionFooter,
  AedGuideModal,
  AmbulanceSummaryModal,
  persistAmbulanceReport,
  type CprAmbulanceSnapshot,
  type AedShockAnswer,
} from '@/components/lifelink/CprSessionArrivals';
import { SmoothedDepthBar } from '@/components/lifelink/SmoothedDepthBar';
import { X, FONT } from '@/components/lifelink/tokens';
import { PatchBanner } from '@/components/lifelink/PatchBanner';
import { useSosSerialCpr } from '@/lib/cpr/SosSerialCprContext';
import type { SerialPatientProfile } from '@/lib/cpr/useSerialCPR';
import { useEffectiveProfile, useProfileRetry, type SerialCpr } from '@/lib/cpr/patchSerialSession';
import { usePatchProfileSheet } from '@/lib/cpr/usePatchProfileSheet';
import {
  TARGET_BPM,
  COMPRESSIONS_PER_CYCLE,
  BREATHS_PER_CYCLE,
  derivePhase,
  voltageToDepth,
  IDEAL_LO,
  IDEAL_HI,
  type PhaseInfo,
} from '@/lib/cpr/cprAssistPhase';
import { useCompressionRateBpm } from '@/lib/cpr/useCompressionRateBpm';
import { useAssistPushMetronome } from '@/lib/cpr/useAssistPushMetronome';
import { useCprElevenLabsVoice } from '@/lib/voice/useCprElevenLabsVoice';
import {
  isSosFlowActive,
  clearSosTimer,
  getSosElapsedNow,
  SOS_COMPLETE_ELAPSED_KEY,
  CPR_PROFILE_SHEET_ACKED_KEY,
  CPR_SUMMARY_HAD_PATCH_SENSOR_KEY,
  CPR_SUMMARY_IDEAL_BAND_PCT_KEY,
  CPR_COUNTDOWN_PLAYED_KEY,
} from '@/components/lifelink/sosTimer';
import { ensureBeatAudioUnlocked } from '@/lib/compressionBeatSound';
import { stopElevenLabsPlayback } from '@/lib/voice/playElevenLabsLine';
import { useT } from '@/components/lifelink/i18n';

function fmtMmSs(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── voice cue lists ───────────────────────────────────────────────────────
// Cues are stored as i18n keys; the components resolve them via t() at render
// time so they live-update when the language is switched.
const PUSH_CUE_KEYS = [
  'cpr.assist.cue.push1',
  'cpr.assist.cue.push2',
  'cpr.assist.cue.push3',
  'cpr.assist.cue.push4',
  'cpr.assist.cue.push5',
  'cpr.assist.cue.push6',
];
const BREATH_CUE_KEYS = [
  'cpr.assist.cue.breath1',
  'cpr.assist.cue.breath2',
  'cpr.assist.cue.breath3',
];
const HW_CUE_OK_KEYS = [
  'cpr.assist.cue.depthOk1',
  'cpr.assist.cue.depthOk2',
  'cpr.assist.cue.depthOk3',
  'cpr.assist.cue.depthOk4',
];

type VoiceCoachProps = {
  configured: boolean | null;
  enabled: boolean;
  onToggle: () => void;
  error: string | null;
};

type AssistToolbarProps = {
  beatOn: boolean;
  onBeatToggle: () => void;
  onCallActiveChange: (active: boolean) => void;
};

type AssistArrivalProps = {
  onAedArrived: () => void;
  onAmbulanceArrived: () => void;
};

function VoiceCoachRow({ configured, enabled, onToggle, error }: VoiceCoachProps) {
  const ready = configured === true;
  const label = configured === null ? 'Voice coach · …' : configured === false ? 'Voice coach · not configured' : enabled ? 'Voice coach · ON' : 'Voice coach · OFF';
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!ready}
        style={{
          all: 'unset',
          cursor: ready ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: 10,
          background: ready ? (enabled ? 'rgba(31,138,77,0.2)' : 'rgba(255,255,255,0.08)') : 'rgba(255,255,255,0.05)',
          border: `1px solid ${ready ? (enabled ? 'rgba(31,138,77,0.45)' : 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.1)'}`,
          color: '#fff',
          fontSize: 11,
          fontFamily: FONT.mono,
          letterSpacing: 1.1,
          fontWeight: 700,
          opacity: ready ? 1 : 0.65,
        }}
      >
        <Icon name="volume" size={14} color="#fff" stroke={2}/>
        <span style={{ flex: 1 }}>{label}</span>
        {!ready && configured === false && (
          <span style={{ fontSize: 9, opacity: 0.75, fontWeight: 600 }}>.env.local</span>
        )}
      </button>
      {error && (
        <div style={{ marginTop: 6, fontSize: 10, fontFamily: FONT.mono, color: X.RED, opacity: 0.95 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ── PHASE RING CIRCLE (shared between both layouts) ───────────────────────
function PhaseRingCircle({ phase, size = 220, sessionFrozen = false }: { phase: PhaseInfo; size?: number; sessionFrozen?: boolean }) {
  const { t } = useT();
  const isPush = phase.phase === 'PUSH';
  const innerSize = Math.round(size * 0.76);
  const ringR = (size - 18) / 2; // sit just inside the SVG bounds
  const ringC = 2 * Math.PI * ringR;
  const pulseAnim = sessionFrozen
    ? 'none'
    : isPush
      ? 'll-cpr-beat 0.545s ease-in-out infinite'
      : 'll-breathe 2.5s ease-in-out infinite';
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
        <circle
          cx={size/2} cy={size/2} r={ringR} fill="none"
          stroke={isPush ? X.RED : X.BLUE} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={ringC}
          strokeDashoffset={ringC * (1 - phase.phaseProgress)}
          style={{ transition: 'stroke-dashoffset 240ms linear, stroke 220ms ease-out' }}
        />
      </svg>
      <div style={{
        width: innerSize, height: innerSize, borderRadius: innerSize / 2,
        background: isPush ? X.RED : X.BLUE,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: pulseAnim,
        boxShadow: isPush ? '0 0 80px rgba(225,29,46,0.5)' : '0 0 80px rgba(44,102,232,0.4)',
        transition: 'background 220ms ease-out, box-shadow 220ms ease-out',
        color: '#fff',
      }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.95 }}>
          {isPush ? t('cpr.assist.push') : t('cpr.assist.breathe')}
        </div>
        <div style={{ fontSize: Math.round(innerSize * 0.3), fontWeight: 700, fontFamily: FONT.display, lineHeight: 1, marginTop: 2 }}>
          {isPush ? `${phase.compressionInCycle}/${COMPRESSIONS_PER_CYCLE}` : `${phase.breathInCycle}/${BREATHS_PER_CYCLE}`}
        </div>
        <div style={{ fontSize: 10, opacity: 0.85, marginTop: 4 }}>
          {isPush ? `${TARGET_BPM} BPM` : t('cpr.assist.ring.tiltPinch')}
        </div>
      </div>
    </div>
  );
}

// ── PAGE: auto-switches between phone-only and hardware-connected layouts ─
export default function CPRAssistPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const cpr = useSosSerialCpr();
  const connected = cpr.isConnected && cpr.isReceiving;

  const [beatOn, setBeatOn] = React.useState(true);
  const [callActive, setCallActive] = React.useState(false);

  const [aedGuideOpen, setAedGuideOpen] = React.useState(false);
  const [aedArrived, setAedArrived] = React.useState(false);
  const [aedShockDelivered, setAedShockDelivered] = React.useState<AedShockAnswer>('unknown');
  const [ambulanceOpen, setAmbulanceOpen] = React.useState(false);
  const [ambulanceSnapshot, setAmbulanceSnapshot] = React.useState<CprAmbulanceSnapshot | null>(null);
  const bpmAggRef = React.useRef({ sum: 0, n: 0 });
  /** Counts patch depth samples while CPR is live (excludes countdown + AED/ambulance pause). */
  const idealBandAggRef = React.useRef({ inBand: 0, total: 0 });
  const lastIdealSampleCountRef = React.useRef<number>(-999999);

  const [profileAckedOnEntry] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(CPR_PROFILE_SHEET_ACKED_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Shared CPR-session clock — starts only after the on-screen READY → GO countdown so beat 1 aligns with the user.
  const startRef = React.useRef<number>(0);
  const [, forceTick] = React.useState(0);
  /** Wall time when AED or ambulance modal began; used to extend `startRef` on resume so elapsed freezes. */
  const pauseWallStartRef = React.useRef<number | null>(null);
  const [pausedElapsedMs, setPausedElapsedMs] = React.useState<number | null>(null);
  // Has the READY → 3 → 2 → 1 → GO countdown already played in this SOS session?
  // Persisted via sessionStorage so navigating away and back doesn't replay it.
  // Cleared in startSosTimer / clearSosTimer so a fresh emergency starts fresh.
  const countdownAlreadyPlayed = (() => {
    if (typeof window === 'undefined') return false;
    try { return window.sessionStorage.getItem(CPR_COUNTDOWN_PLAYED_KEY) === '1'; } catch { return false; }
  })();
  const [cprLive, setCprLive] = React.useState(countdownAlreadyPlayed);
  const [countOverlay, setCountOverlay] = React.useState<'READY' | '3' | '2' | '1' | 'GO' | null>(
    countdownAlreadyPlayed ? null : 'READY',
  );
  const cprLiveRef = React.useRef(false);
  cprLiveRef.current = cprLive;

  React.useEffect(() => {
    if (cprLive) return;
    let cancelled = false;
    const ids: number[] = [];
    let acc = 0;
    const steps: { delay: number; label: '3' | '2' | '1' | 'GO' | '__start__' }[] = [
      { delay: 900, label: '3' },
      { delay: 900, label: '2' },
      { delay: 900, label: '1' },
      { delay: 700, label: 'GO' },
      { delay: 550, label: '__start__' },
    ];
    for (const s of steps) {
      acc += s.delay;
      ids.push(
        window.setTimeout(() => {
          if (cancelled) return;
          if (s.label === '__start__') {
            setCprLive(true);
            setCountOverlay(null);
            // Mark countdown as played so re-entering this page skips the overlay.
            try { window.sessionStorage.setItem(CPR_COUNTDOWN_PLAYED_KEY, '1'); } catch { /* ignore */ }
          } else {
            setCountOverlay(s.label);
          }
        }, acc),
      );
    }
    return () => {
      cancelled = true;
      ids.forEach(clearTimeout);
    };
  }, [cprLive]);

  React.useEffect(() => {
    if (!cprLive) return;
    startRef.current = Date.now();
    idealBandAggRef.current = { inBand: 0, total: 0 };
    lastIdealSampleCountRef.current = -999999;
    const id = window.setInterval(() => forceTick((v) => v + 1), 250);
    return () => clearInterval(id);
  }, [cprLive]);

  const cprScenePaused = aedGuideOpen || ambulanceOpen;

  const beginCprPauseIfNeeded = React.useCallback(() => {
    if (!cprLiveRef.current) return;
    if (pauseWallStartRef.current !== null) return;
    pauseWallStartRef.current = Date.now();
    setPausedElapsedMs(Date.now() - startRef.current);
    stopElevenLabsPlayback();
  }, []);

  React.useEffect(() => {
    if (cprScenePaused) return;
    if (pauseWallStartRef.current === null) return;
    const dt = Date.now() - pauseWallStartRef.current;
    startRef.current += dt;
    pauseWallStartRef.current = null;
    setPausedElapsedMs(null);
    forceTick((v) => v + 1);
  }, [cprScenePaused]);

  const getElapsedMsRef = React.useRef<() => number>(() => 0);
  getElapsedMsRef.current = () => {
    if (!cprLiveRef.current) return 0;
    return pausedElapsedMs != null ? pausedElapsedMs : startRef.current ? Date.now() - startRef.current : 0;
  };

  useAssistPushMetronome(getElapsedMsRef, beatOn && cprLive);
  React.useEffect(() => {
    const unlock = () => {
      void ensureBeatAudioUnlocked();
    };
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    return () => window.removeEventListener('pointerdown', unlock, { capture: true });
  }, []);
  const elapsedMs =
    !cprLive
      ? 0
      : pausedElapsedMs != null
        ? pausedElapsedMs
        : startRef.current
          ? Date.now() - startRef.current
          : 0;

  const depthCm = connected && cpr.lastSample ? voltageToDepth(cpr.lastSample.voltage) : null;
  const hwCount = connected ? (cpr.lastSample?.count ?? 0) : 0;
  const hardwareBpm = useCompressionRateBpm(hwCount);

  React.useEffect(() => {
    if (!connected || !cprLive || cprScenePaused) return;
    const sample = cpr.lastSample;
    if (!sample || !Number.isFinite(sample.voltage)) return;
    const cnt = sample.count ?? 0;
    if (cnt === lastIdealSampleCountRef.current) return;
    lastIdealSampleCountRef.current = cnt;
    const cm = voltageToDepth(sample.voltage);
    const ok = cm >= IDEAL_LO && cm <= IDEAL_HI;
    const a = idealBandAggRef.current;
    a.total += 1;
    if (ok) a.inBand += 1;
  }, [connected, cprLive, cprScenePaused, cpr.lastSample?.count, cpr.lastSample?.voltage]);

  React.useEffect(() => {
    if (!connected || !cprLive) return;
    const b = hardwareBpm;
    if (b != null && b >= 40 && b <= 200) {
      const a = bpmAggRef.current;
      a.sum += b;
      a.n += 1;
    }
  }, [connected, cprLive, hardwareBpm]);

  const [voiceOn, setVoiceOn] = React.useState(false);
  // After hold-to-emergency, /sos sets the SOS timer — default voice coach ON in that session only.
  React.useLayoutEffect(() => {
    if (isSosFlowActive()) setVoiceOn(true);
  }, []);

  const voice = useCprElevenLabsVoice({
    hardwareActive: connected,
    depthCm,
    hardwareBpm: connected ? hardwareBpm : null,
    voiceEnabledByUser: voiceOn,
    voiceMutedForCall: callActive || cprScenePaused || !cprLive,
    lang,
  });

  // Effective patient profile: prefer Arduino-supplied data, fall back to the
  // hardcoded demo profile the instant the patch starts streaming.
  const effective = useEffectiveProfile(cpr);
  const {
    open: profileSheetOpen,
    dismiss: dismissProfileSheet,
    openManually,
  } = usePatchProfileSheet(effective.profile, connected, { treatProfileAsInitiallyAcked: profileAckedOnEntry });
  const dismissAssistProfile = React.useCallback(() => {
    try {
      window.sessionStorage.setItem(CPR_PROFILE_SHEET_ACKED_KEY, '1');
    } catch {
      /* ignore */
    }
    dismissProfileSheet();
  }, [dismissProfileSheet]);
  // Re-issue PROFILE\n a few times if the first request was missed.
  useProfileRetry(cpr);

  const buildAmbulanceSnapshot = React.useCallback((): CprAmbulanceSnapshot => {
    const elapsed =
      !cprLive || !startRef.current
        ? 0
        : pausedElapsedMs != null
          ? pausedElapsedMs
          : Date.now() - startRef.current;
    const p = derivePhase(elapsed);
    const agg = bpmAggRef.current;
    const avg = agg.n > 0 ? Math.round(agg.sum / agg.n) : null;
    const ib = idealBandAggRef.current;
    const idealBandPct =
      connected && ib.total > 0 ? Math.round((100 * ib.inBand) / ib.total) : null;
    return {
      durationMs: elapsed,
      cycles302: p.cyclesCompleted,
      compressionsClock: p.totalCompressions,
      sensorCount: connected ? hwCount : null,
      idealBandPct,
      lastBpm: connected && hardwareBpm != null ? hardwareBpm : null,
      avgBpm: avg,
      targetBpm: TARGET_BPM,
      aedArrived,
      aedShockDelivered,
    };
  }, [connected, hwCount, hardwareBpm, aedArrived, aedShockDelivered, cprLive, pausedElapsedMs]);

  const handleAedArrived = React.useCallback(() => {
    beginCprPauseIfNeeded();
    setAedArrived(true);
    setAedGuideOpen(true);
  }, [beginCprPauseIfNeeded]);

  const handleAmbulanceArrived = React.useCallback(() => {
    beginCprPauseIfNeeded();
    const snap = buildAmbulanceSnapshot();
    setAmbulanceSnapshot(snap);
    setAmbulanceOpen(true);
    persistAmbulanceReport(snap);
  }, [beginCprPauseIfNeeded, buildAmbulanceSnapshot]);

  const endEmergencyFromAssistSummary = React.useCallback(() => {
    const sec = getSosElapsedNow();
    const snap = ambulanceSnapshot;
    const hadPatch = snap != null && snap.sensorCount !== null;
    const ib = idealBandAggRef.current;
    try {
      window.sessionStorage.setItem(SOS_COMPLETE_ELAPSED_KEY, String(Math.max(1, sec)));
      window.sessionStorage.setItem(CPR_SUMMARY_HAD_PATCH_SENSOR_KEY, hadPatch ? '1' : '0');
      if (hadPatch && ib.total > 0) {
        window.sessionStorage.setItem(
          CPR_SUMMARY_IDEAL_BAND_PCT_KEY,
          String(Math.round((100 * ib.inBand) / ib.total)),
        );
      } else {
        window.sessionStorage.removeItem(CPR_SUMMARY_IDEAL_BAND_PCT_KEY);
      }
    } catch {
      /* ignore */
    }
    setAmbulanceOpen(false);
    setAmbulanceSnapshot(null);
    clearSosTimer();
    router.push('/sos/complete');
  }, [router, ambulanceSnapshot]);

  const arrival: AssistArrivalProps = {
    onAedArrived: handleAedArrived,
    onAmbulanceArrived: handleAmbulanceArrived,
  };

  return (
    <>
      {connected
        ? (
            <HardwareLayout
              cpr={cpr}
              elapsedMs={elapsedMs}
              effectiveProfile={effective.profile}
              isFallbackProfile={effective.isFallback}
              onOpenProfile={openManually}
              voiceCoach={{ configured: voice.configured, enabled: voiceOn, onToggle: () => setVoiceOn((v) => !v), error: voice.lastError }}
              toolbar={{ beatOn, onBeatToggle: () => setBeatOn((v) => !v), onCallActiveChange: setCallActive }}
              arrival={arrival}
              sessionFrozen={cprScenePaused || !cprLive}
            />
          )
        : (
            <PhoneOnlyLayout
              cpr={cpr}
              elapsedMs={elapsedMs}
              effectiveProfile={effective.profile}
              isFallbackProfile={effective.isFallback}
              onOpenProfile={openManually}
              voiceCoach={{ configured: voice.configured, enabled: voiceOn, onToggle: () => setVoiceOn((v) => !v), error: voice.lastError }}
              toolbar={{ beatOn, onBeatToggle: () => setBeatOn((v) => !v), onCallActiveChange: setCallActive }}
              arrival={arrival}
              sessionFrozen={cprScenePaused || !cprLive}
            />
          )}
      {countOverlay != null && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontSize: 12, fontFamily: FONT.mono, letterSpacing: 2.2, opacity: 0.72, marginBottom: 14 }}>
            GET READY
          </div>
          <div
            style={{
              fontSize: countOverlay === 'READY' ? 44 : 88,
              fontWeight: 800,
              fontFamily: FONT.display,
              lineHeight: 1,
              letterSpacing: countOverlay === 'GO' ? 4 : -1,
            }}
          >
            {countOverlay}
          </div>
          {countOverlay === 'READY' && (
            <div style={{ marginTop: 22, fontSize: 14, opacity: 0.82, textAlign: 'center', maxWidth: 280, padding: '0 20px', lineHeight: 1.45 }}>
              Place your hands and sync with the first beat.
            </div>
          )}
        </div>
      )}
      <PatientProfileSheet
        profile={effective.profile}
        open={profileSheetOpen}
        onDismiss={dismissAssistProfile}
        syncedAt={effective.isFallback ? null : cpr.profileSyncedAt}
        syncError={effective.isFallback ? t('cpr.assist.patch.demoSyncErr') : cpr.profileSyncError}
      />
      <AedGuideModal
        open={aedGuideOpen}
        onClose={() => setAedGuideOpen(false)}
        shockAnswer={aedShockDelivered}
        onShockAnswer={setAedShockDelivered}
        onAmbulanceArrived={() => {
          setAedGuideOpen(false);
          handleAmbulanceArrived();
        }}
      />
      <AmbulanceSummaryModal
        open={ambulanceOpen}
        snapshot={ambulanceSnapshot}
        onClose={() => {
          setAmbulanceOpen(false);
          setAmbulanceSnapshot(null);
        }}
        onEndEmergency={endEmergencyFromAssistSummary}
      />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// LAYOUT A — phone-only (no LifeLink Patch). Hands stay on chest; the screen
// drives the bystander through the AHA 30:2 cycle: 30 compressions at 110bpm
// (~16.4s) → 2 breaths (~5s) → repeat. Compression count auto-increments
// based on the assumption that the user is matching the metronome.
// ───────────────────────────────────────────────────────────────────────────
function PhoneOnlyLayout({ cpr, elapsedMs, effectiveProfile, isFallbackProfile, onOpenProfile, voiceCoach, toolbar, arrival, sessionFrozen }: { cpr: SerialCpr; elapsedMs: number; effectiveProfile?: SerialPatientProfile | null; isFallbackProfile?: boolean; onOpenProfile?: () => void; voiceCoach: VoiceCoachProps; toolbar: AssistToolbarProps; arrival: AssistArrivalProps; sessionFrozen: boolean }) {
  const { t } = useT();
  const phase = derivePhase(elapsedMs);
  const isPush = phase.phase === 'PUSH';
  const cycleNum = phase.cyclesCompleted + 1;

  const cueKeys = isPush ? PUSH_CUE_KEYS : BREATH_CUE_KEYS;
  const cueColor = isPush ? X.RED : X.BLUE;
  const cueIdx = Math.floor(elapsedMs / 4500) % cueKeys.length;
  const cue = t(cueKeys[cueIdx]);

  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner/>
      <div className="ll-scroll-hide" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 110,
        overflowY: 'auto',
        padding: '70px 18px 24px',
        boxSizing: 'border-box',
        color: '#fff',
      }}>
        <VoiceCoachRow {...voiceCoach}/>
        <PatchBanner cpr={cpr} connected={false} effectiveProfile={effectiveProfile} isFallbackProfile={isFallbackProfile} onOpenProfile={onOpenProfile}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, opacity: sessionFrozen ? 0.55 : 1 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>
            {t('cpr.assist.cycleTag', { n: String(cycleNum).padStart(2, '0') })}
          </div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
        <CPRToolbar
          beatOn={toolbar.beatOn}
          onBeatToggle={toolbar.onBeatToggle}
          helpersInCall={2}
          onCallActiveChange={toolbar.onCallActiveChange}
        />

        {/* Big phase-ring metronome circle */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', opacity: sessionFrozen ? 0.55 : 1 }}>
          <PhaseRingCircle phase={phase} size={170} sessionFrozen={sessionFrozen}/>
        </div>

        {/* Stats row */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', opacity: sessionFrozen ? 0.55 : 1 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{t('cpr.assist.stat.compressions')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>{phase.totalCompressions}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>{t('cpr.assist.stat.compressions.sub')}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{t('cpr.assist.stat.cycles')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>{phase.cyclesCompleted}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>{t('cpr.assist.stat.cycles.sub')}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{t('cpr.assist.stat.rate')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1, color: X.GREEN }}>{TARGET_BPM}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>{t('cpr.assist.stat.rate.sub')}</div>
          </div>
        </div>

        {/* Voice cue */}
        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: cueColor, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 220ms ease-out' }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{cue}</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>

        <CprSessionFooter
          cyclesCompleted={phase.cyclesCompleted}
          onAedArrived={arrival.onAedArrived}
          onAmbulanceArrived={arrival.onAmbulanceArrived}
        />

        {cpr.error && (
          <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(225,29,46,0.18)', border: '1px solid rgba(225,29,46,0.4)', fontSize: 11, color: '#fff', fontFamily: FONT.mono }}>
            {cpr.error}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <CPRMiniLive dark/>
      </div>
    </Screen>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// LAYOUT B — LifeLink Patch connected. Sensor drives depth bar + beat scale.
// ───────────────────────────────────────────────────────────────────────────
function HardwareLayout({ cpr, elapsedMs, effectiveProfile, isFallbackProfile, onOpenProfile, voiceCoach, toolbar, arrival, sessionFrozen }: { cpr: SerialCpr; elapsedMs: number; effectiveProfile?: SerialPatientProfile | null; isFallbackProfile?: boolean; onOpenProfile?: () => void; voiceCoach: VoiceCoachProps; toolbar: AssistToolbarProps; arrival: AssistArrivalProps; sessionFrozen: boolean }) {
  const { t } = useT();
  const liveDepth = cpr.lastSample ? voltageToDepth(cpr.lastSample.voltage) : 0;
  const liveCount = cpr.lastSample?.count ?? 0;
  const liveRate = useCompressionRateBpm(cpr.lastSample?.count ?? 0);
  const displayedRate = liveRate ?? 0;
  const inBand = liveDepth >= IDEAL_LO && liveDepth <= IDEAL_HI;

  // Same clock-driven phase machine as phone-only — gives the bystander
  // explicit "PUSH 18/30 → BREATHE 1/2" coaching even with hardware. The
  // sensor count below is the ground-truth count of actual presses detected.
  const phase = derivePhase(elapsedMs);
  const cyclesCompleted = phase.cyclesCompleted;
  const cycle = phase.cyclesCompleted + 1;

  let cueText: string;
  let cueBg: string;
  if (!inBand) {
    cueBg = liveDepth < IDEAL_LO ? X.RED : X.AMBER;
    cueText = liveDepth < IDEAL_LO
      ? t('cpr.assist.depth.cuePushHarder', { d: liveDepth.toFixed(1) })
      : t('cpr.assist.depth.cueEaseUp',     { d: liveDepth.toFixed(1) });
  } else {
    cueBg = X.GREEN;
    const idx = Math.floor(elapsedMs / 4500) % HW_CUE_OK_KEYS.length;
    cueText = t(HW_CUE_OK_KEYS[idx]);
  }

  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner/>
      <div className="ll-scroll-hide" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 110,
        overflowY: 'auto',
        padding: '70px 18px 24px',
        boxSizing: 'border-box',
        color: '#fff',
      }}>
        <VoiceCoachRow {...voiceCoach}/>
        <PatchBanner
          cpr={cpr}
          connected={cpr.isConnected && cpr.isReceiving}
          effectiveProfile={effectiveProfile}
          isFallbackProfile={isFallbackProfile}
          onOpenProfile={onOpenProfile}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, opacity: sessionFrozen ? 0.55 : 1 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>{t('cpr.assist.cycleTag', { n: String(cycle).padStart(2, '0') })}</div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
        <CPRToolbar
          beatOn={toolbar.beatOn}
          onBeatToggle={toolbar.onBeatToggle}
          helpersInCall={2}
          onCallActiveChange={toolbar.onCallActiveChange}
        />

        <div style={{ opacity: sessionFrozen ? 0.55 : 1 }}>
          <SmoothedDepthBar voltage={cpr.lastSample?.voltage ?? null} />
        </div>

        {/* Same phase-ring metronome circle as phone-only, slightly smaller to make
            room for the depth bar above. Bystander still gets PUSH/BREATHE coaching. */}
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', opacity: sessionFrozen ? 0.55 : 1 }}>
          <PhaseRingCircle phase={phase} size={170} sessionFrozen={sessionFrozen}/>
        </div>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', opacity: sessionFrozen ? 0.55 : 1 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>{t('cpr.assist.stat.rate')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: displayedRate >= 100 && displayedRate <= 120 ? X.GREEN : X.AMBER }}>{displayedRate || '—'}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>{!displayedRate ? t('cpr.assist.stat.bpmStatus.building') : displayedRate >= 100 && displayedRate <= 120 ? t('cpr.assist.stat.bpmStatus.ok') : displayedRate < 100 ? t('cpr.assist.stat.bpmStatus.tooSlow') : t('cpr.assist.stat.bpmStatus.tooFast')}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>{t('cpr.assist.stat.recoil')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: X.AMBER }}>92<span style={{ fontSize: 11 }}>%</span></div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: X.AMBER }}>{t('cpr.assist.stat.recoil.sub')}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>{t('cpr.assist.stat.count')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8 }}>{liveCount}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>{t('cpr.assist.stat.count.sub')}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: cueBg, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{cueText}</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>

        <CprSessionFooter
          cyclesCompleted={cyclesCompleted}
          onAedArrived={arrival.onAedArrived}
          onAmbulanceArrived={arrival.onAmbulanceArrived}
        />

        {cpr.error && (
          <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(225,29,46,0.18)', border: '1px solid rgba(225,29,46,0.4)', fontSize: 11, color: '#fff', fontFamily: FONT.mono }}>
            {cpr.error}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <CPRMiniLive dark/>
      </div>
    </Screen>
  );
}
