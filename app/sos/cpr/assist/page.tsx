'use client';
import * as React from 'react';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { CPRToolbar, CPRMiniLive } from '@/components/lifelink/CPRShared';
import { PatientProfileSheet } from '@/components/lifelink/PatientProfileSheet';
import { BreathingReassessButton } from '@/components/lifelink/BreathingReassessButton';
import { X, FONT } from '@/components/lifelink/tokens';
import { useSerialCPR, type SerialPatientProfile } from '@/lib/cpr/useSerialCPR';

// ── shared constants ──────────────────────────────────────────────────────
const TARGET_BPM = 110;
const COMPRESSIONS_PER_CYCLE = 30;
const COMPRESSION_PHASE_MS = Math.round((COMPRESSIONS_PER_CYCLE * 60_000) / TARGET_BPM); // ≈ 16364
const BREATH_PHASE_MS = 5000; // 2 breaths × ~2.5s
const BREATHS_PER_CYCLE = 2;
const CYCLE_MS = COMPRESSION_PHASE_MS + BREATH_PHASE_MS;

const DEPTH_MIN = 0, DEPTH_MAX = 7;
const IDEAL_LO = 5.0, IDEAL_HI = 6.0;
const pct = (v: number) => ((v - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN)) * 100;

// Map sensor voltage (0–5V on RP-S40-ST) to compression depth (0–7cm).
function voltageToDepth(v: number) {
  return Math.max(0, Math.min(DEPTH_MAX, v * 1.4));
}

function fmtMmSs(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── voice cue lists ───────────────────────────────────────────────────────
const PUSH_CUES = [
  '"Push hard. Push fast."',
  '"Center of the chest."',
  '"Twice per second."',
  '"Use your body weight."',
  '"Don\'t stop pushing."',
  '"Stay strong — keep the rhythm."',
];
const BREATH_CUES = [
  '"Tilt the head back. Pinch the nose."',
  '"Two slow breaths — watch the chest rise."',
  '"Seal your mouth over theirs. Blow gently."',
];
const HW_CUES_OK = [
  '"Good depth. Keep going."',
  '"Solid rhythm — hold that depth."',
  '"You\'re right in the band."',
  '"Strong compressions — don\'t stop."',
];

// ── 30:2 phase derivation ─────────────────────────────────────────────────
type PhaseInfo = {
  cyclesCompleted: number;
  phase: 'PUSH' | 'BREATHE';
  phaseProgress: number;          // 0..1
  compressionInCycle: number;      // 1..30 during PUSH, =30 during BREATHE
  breathInCycle: number;           // 0 during PUSH, 1..2 during BREATHE
  totalCompressions: number;       // cumulative
};

function derivePhase(elapsedMs: number): PhaseInfo {
  if (elapsedMs <= 0) {
    return { cyclesCompleted: 0, phase: 'PUSH', phaseProgress: 0, compressionInCycle: 1, breathInCycle: 0, totalCompressions: 0 };
  }
  const cyclesCompleted = Math.floor(elapsedMs / CYCLE_MS);
  const inCycle = elapsedMs % CYCLE_MS;
  if (inCycle < COMPRESSION_PHASE_MS) {
    const progress = inCycle / COMPRESSION_PHASE_MS;
    const compressionInCycle = Math.min(COMPRESSIONS_PER_CYCLE, Math.floor(progress * COMPRESSIONS_PER_CYCLE) + 1);
    return {
      cyclesCompleted, phase: 'PUSH', phaseProgress: progress,
      compressionInCycle, breathInCycle: 0,
      totalCompressions: cyclesCompleted * COMPRESSIONS_PER_CYCLE + compressionInCycle - 1,
    };
  }
  const breathElapsed = inCycle - COMPRESSION_PHASE_MS;
  const progress = breathElapsed / BREATH_PHASE_MS;
  const breathInCycle = Math.min(BREATHS_PER_CYCLE, Math.floor(progress * BREATHS_PER_CYCLE) + 1);
  return {
    cyclesCompleted, phase: 'BREATHE', phaseProgress: progress,
    compressionInCycle: COMPRESSIONS_PER_CYCLE, breathInCycle,
    totalCompressions: cyclesCompleted * COMPRESSIONS_PER_CYCLE + COMPRESSIONS_PER_CYCLE,
  };
}

// ── PATCH BANNER (shared between both layouts) ────────────────────────────
type Cpr = ReturnType<typeof useSerialCPR>;

// ── PHASE RING CIRCLE (shared between both layouts) ───────────────────────
function PhaseRingCircle({ phase, size = 220 }: { phase: PhaseInfo; size?: number }) {
  const isPush = phase.phase === 'PUSH';
  const innerSize = Math.round(size * 0.76);
  const ringR = (size - 18) / 2; // sit just inside the SVG bounds
  const ringC = 2 * Math.PI * ringR;
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
        animation: isPush ? 'll-cpr-beat 0.545s ease-in-out infinite' : 'll-breathe 2.5s ease-in-out infinite',
        boxShadow: isPush ? '0 0 80px rgba(225,29,46,0.5)' : '0 0 80px rgba(44,102,232,0.4)',
        transition: 'background 220ms ease-out, box-shadow 220ms ease-out',
        color: '#fff',
      }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.95 }}>
          {isPush ? 'PUSH' : 'BREATHE'}
        </div>
        <div style={{ fontSize: Math.round(innerSize * 0.3), fontWeight: 700, fontFamily: FONT.display, lineHeight: 1, marginTop: 2 }}>
          {isPush ? `${phase.compressionInCycle}/${COMPRESSIONS_PER_CYCLE}` : `${phase.breathInCycle}/${BREATHS_PER_CYCLE}`}
        </div>
        <div style={{ fontSize: 10, opacity: 0.85, marginTop: 4 }}>
          {isPush ? `${TARGET_BPM} BPM` : 'tilt head · pinch nose'}
        </div>
      </div>
    </div>
  );
}

function PatchBanner({ cpr, connected, effectiveProfile, isFallbackProfile = false, onOpenProfile }: {
  cpr: Cpr;
  connected: boolean;
  effectiveProfile?: SerialPatientProfile | null;
  isFallbackProfile?: boolean;
  onOpenProfile?: () => void;
}) {
  // useSerialCPR's `isSupported` is computed synchronously from `navigator`,
  // which differs between SSR and client. Gate the dynamic copy behind a
  // post-mount flag so the first paint matches what the server emitted.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  const hasProfile = mounted && !!effectiveProfile;
  const profileName = effectiveProfile?.name;

  // Four primary states: OFFLINE / CONNECTING / STREAMING-loading / READY.
  // Suffix the READY state with " · DEMO" when we're showing the fallback
  // profile so the user knows it's not live Arduino data.
  const label = !mounted
    ? 'PATCH OFFLINE · PLUG IN TO CONNECT'
    : !cpr.isSupported ? 'WEB SERIAL UNSUPPORTED'
      : cpr.isConnecting ? 'PATCH CONNECTING…'
      : connected
        ? hasProfile
          ? `PATCH READY · TAP TO VIEW ${profileName ? profileName.toUpperCase() : 'PROFILE'}${isFallbackProfile ? ' · DEMO' : ''}`
          : `PATCH STREAMING · LOADING PROFILE… (${cpr.sampleCount})`
        : cpr.isConnected ? 'PATCH WAITING FOR DATA'
          : 'PATCH OFFLINE · PLUG IN TO CONNECT';

  const disabled = mounted ? (cpr.isConnecting || !cpr.isSupported) : false;
  const cursor = !mounted ? 'pointer' : cpr.isSupported ? 'pointer' : 'default';

  const handleClick = () => {
    if (connected && hasProfile && onOpenProfile) {
      onOpenProfile();
      return;
    }
    void (connected ? cpr.disconnect() : cpr.connect());
  };

  // Banner colour: amber offline, blue streaming (no profile yet), green
  // streaming + real profile, amber-tinted-green for the demo fallback so
  // it's distinguishable but not alarming.
  const tone = !mounted || !connected
    ? { bg: 'rgba(232,133,44,0.15)', border: 'rgba(232,133,44,0.4)', dot: X.AMBER, fg: X.AMBER }
    : !hasProfile
      ? { bg: 'rgba(44,102,232,0.15)', border: 'rgba(44,102,232,0.4)', dot: X.BLUE, fg: X.BLUE }
      : isFallbackProfile
        ? { bg: 'rgba(232,133,44,0.18)', border: 'rgba(232,133,44,0.45)', dot: X.AMBER, fg: X.AMBER }
        : { bg: 'rgba(31,138,77,0.15)', border: 'rgba(31,138,77,0.4)', dot: X.GREEN, fg: X.GREEN };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        all: 'unset', cursor,
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        width: '100%', boxSizing: 'border-box',
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 10, marginBottom: 8,
      }}
    >
      <span className="ll-blink" style={{ width: 6, height: 6, borderRadius: 3, background: tone.dot, flexShrink: 0 }}/>
      <span style={{
        fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.2, fontWeight: 700,
        color: tone.fg,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
    </button>
  );
}

// ── PATIENT PROFILE SHEET HOOK ─────────────────────────────────────────────
// Pops the sheet the first time a profile becomes available within a
// connection session and stays dismissed for the rest of that session.
// Reconnecting (unplug + plug) resets the ack so the next session pops again.
// This avoids the fingerprint-dedup edge case where the fallback profile
// being replaced by the real Arduino profile (different bytes) would re-pop
// the sheet right after the user dismissed it.
function usePatchProfileSheet(profile: SerialPatientProfile | null, connected: boolean): {
  open: boolean;
  dismiss: () => void;
  openManually: () => void;
} {
  const [open, setOpen] = React.useState(false);
  const ackedRef = React.useRef(false);

  // Disconnect clears the ack so the next session can pop again.
  React.useEffect(() => {
    if (!connected) ackedRef.current = false;
  }, [connected]);

  // Auto-open on first profile of the session.
  React.useEffect(() => {
    if (profile && !ackedRef.current) setOpen(true);
  }, [profile]);

  const dismiss = React.useCallback(() => {
    ackedRef.current = true;
    setOpen(false);
  }, []);

  const openManually = React.useCallback(() => {
    if (profile) setOpen(true);
  }, [profile]);

  return { open, dismiss, openManually };
}

// ── DEMO FALLBACK PROFILE ─────────────────────────────────────────────────
// Shown the moment the patch starts streaming, regardless of whether the
// Arduino sketch supports the PROFILE serial command. Matches PaulJiang's
// sketch character-for-character so re-flashing the firmware later swaps in
// equivalent live data without the demo flow changing.
const DEMO_FALLBACK_PROFILE: SerialPatientProfile = {
  name: 'John Doe',
  dob: '1999-01-01',
  bloodType: 'O+',
  phone: '123-456-7890',
  address: '123 Example St, Irvine, CA',
  allergies: 'Penicillin',
  conditions: 'Diabetes',
  medications: 'Insulin',
  emergencyContact: { name: 'Jane Doe', relation: 'Mother', phone: '123-555-7890' },
  physician: { name: 'Dr. Smith', phone: '123-555-1111' },
  notes: 'CPR responder: check allergies and current medication first.',
};

function useEffectiveProfile(cpr: ReturnType<typeof useSerialCPR>): {
  profile: SerialPatientProfile | null;
  isFallback: boolean;
} {
  const realProfile = cpr.patientProfile;
  const connected = cpr.isConnected && cpr.isReceiving;

  if (realProfile) return { profile: realProfile, isFallback: false };
  if (connected) return { profile: DEMO_FALLBACK_PROFILE, isFallback: true };
  return { profile: null, isFallback: false };
}

// ── PROFILE REQUEST RETRY ─────────────────────────────────────────────────
// Self-healing retry for PROFILE\n. The first PROFILE request inside
// useSerialCPR.connect() can race against Arduino's setup-time Serial wait;
// if no profile arrives within RETRY_AFTER_MS we re-issue the command, up to
// MAX_RETRIES times. The retry stops as soon as a profile lands.
const RETRY_AFTER_MS = 1800;
const MAX_RETRIES = 3;

function useProfileRetry(cpr: ReturnType<typeof useSerialCPR>) {
  const connected = cpr.isConnected && cpr.isReceiving;
  const hasProfile = !!cpr.patientProfile;
  React.useEffect(() => {
    if (!connected || hasProfile) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      await cpr.requestProfile();
    };
    const id = setInterval(() => {
      if (attempts >= MAX_RETRIES) { clearInterval(id); return; }
      void tick();
    }, RETRY_AFTER_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [connected, hasProfile, cpr]);
}

// ── PAGE: auto-switches between phone-only and hardware-connected layouts ─
export default function CPRAssistPage() {
  const cpr = useSerialCPR();
  const connected = cpr.isConnected && cpr.isReceiving;

  // Shared CPR-session clock — survives layout swap mid-session.
  const startRef = React.useRef<number>(0);
  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => forceTick(v => v + 1), 250);
    return () => clearInterval(id);
  }, []);
  const elapsedMs = startRef.current ? Date.now() - startRef.current : 0;

  // Effective patient profile: prefer Arduino-supplied data, fall back to the
  // hardcoded demo profile the instant the patch starts streaming.
  const effective = useEffectiveProfile(cpr);
  const sheet = usePatchProfileSheet(effective.profile, connected);
  // Re-issue PROFILE\n a few times if the first request was missed.
  useProfileRetry(cpr);

  return (
    <>
      {connected
        ? <HardwareLayout cpr={cpr} elapsedMs={elapsedMs} effectiveProfile={effective.profile} isFallbackProfile={effective.isFallback} onOpenProfile={sheet.openManually}/>
        : <PhoneOnlyLayout cpr={cpr} elapsedMs={elapsedMs} effectiveProfile={effective.profile} isFallbackProfile={effective.isFallback} onOpenProfile={sheet.openManually}/>
      }
      <PatientProfileSheet
        profile={effective.profile}
        open={sheet.open}
        onDismiss={sheet.dismiss}
        syncedAt={effective.isFallback ? null : cpr.profileSyncedAt}
        syncError={effective.isFallback ? 'Demo profile · Arduino sketch needs reflash for live data' : cpr.profileSyncError}
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
function PhoneOnlyLayout({ cpr, elapsedMs, effectiveProfile, isFallbackProfile, onOpenProfile }: { cpr: Cpr; elapsedMs: number; effectiveProfile?: SerialPatientProfile | null; isFallbackProfile?: boolean; onOpenProfile?: () => void }) {
  const phase = derivePhase(elapsedMs);
  const isPush = phase.phase === 'PUSH';
  const cycleNum = phase.cyclesCompleted + 1;

  const cueList = isPush ? PUSH_CUES : BREATH_CUES;
  const cueColor = isPush ? X.RED : X.BLUE;
  const cueIdx = Math.floor(elapsedMs / 4500) % cueList.length;
  const cue = cueList[cueIdx];

  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner/>
      <div style={{ padding: '70px 18px 0', color: '#fff' }}>
        <PatchBanner cpr={cpr} connected={false} effectiveProfile={effectiveProfile} isFallbackProfile={isFallbackProfile} onOpenProfile={onOpenProfile}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>
            ● CPR · CYCLE {String(cycleNum).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
        <CPRToolbar helpersInCall={2}/>

        {/* Big phase-ring metronome circle */}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
          <PhaseRingCircle phase={phase} size={220}/>
        </div>

        {/* Stats row */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>COMPRESSIONS</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>{phase.totalCompressions}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>since you started</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>CYCLES</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>{phase.cyclesCompleted}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>30:2 completed</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>RATE</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1, color: X.GREEN }}>{TARGET_BPM}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>bpm target</div>
          </div>
        </div>

        {/* Voice cue */}
        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: cueColor, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 220ms ease-out' }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{cue}</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>

        <BreathingReassessButton cyclesCompleted={phase.cyclesCompleted}/>

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
function useRateFromCount(count: number) {
  const [rate, setRate] = React.useState<number | null>(null);
  const samples = React.useRef<number[]>([]);
  const lastCount = React.useRef(0);
  React.useEffect(() => {
    if (count > lastCount.current) {
      samples.current.push(Date.now());
      const cutoff = Date.now() - 6000;
      while (samples.current.length && samples.current[0] < cutoff) samples.current.shift();
      lastCount.current = count;
      if (samples.current.length >= 2) {
        const span = samples.current[samples.current.length - 1] - samples.current[0];
        const bpm = span > 0 ? Math.round((samples.current.length - 1) * 60000 / span) : null;
        setRate(bpm);
      }
    }
  }, [count]);
  return rate;
}

function HardwareLayout({ cpr, elapsedMs, effectiveProfile, isFallbackProfile, onOpenProfile }: { cpr: Cpr; elapsedMs: number; effectiveProfile?: SerialPatientProfile | null; isFallbackProfile?: boolean; onOpenProfile?: () => void }) {
  const liveDepth = cpr.lastSample ? voltageToDepth(cpr.lastSample.voltage) : 0;
  const liveCount = cpr.lastSample?.count ?? 0;
  const liveRate = useRateFromCount(cpr.lastSample?.count ?? 0);
  const displayedRate = liveRate ?? 0;
  const inBand = liveDepth >= IDEAL_LO && liveDepth <= IDEAL_HI;
  const depthColor = inBand ? X.GREEN : (liveDepth < IDEAL_LO ? X.AMBER : X.RED);

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
      ? `"Push harder · ${liveDepth.toFixed(1)} cm. Use your body weight."`
      : `"Ease up — ${liveDepth.toFixed(1)} cm is too deep."`;
  } else {
    cueBg = X.GREEN;
    const idx = Math.floor(elapsedMs / 4500) % HW_CUES_OK.length;
    cueText = HW_CUES_OK[idx];
  }

  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner/>
      <div style={{ padding: '70px 18px 0', color: '#fff' }}>
        <PatchBanner cpr={cpr} connected={true} effectiveProfile={effectiveProfile} isFallbackProfile={isFallbackProfile} onOpenProfile={onOpenProfile}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>● CPR · CYCLE {String(cycle).padStart(2, '0')}</div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
        <CPRToolbar helpersInCall={2}/>

        {/* DEPTH BAR — primary feedback driven by the patch voltage. */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>COMPRESSION DEPTH</div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>TARGET 5.0–6.0 cm</div>
          </div>
          <div style={{ marginTop: 6, position: 'relative', height: 48, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${pct(IDEAL_LO)}%`, width: `${pct(IDEAL_HI) - pct(IDEAL_LO)}%`,
              background: `linear-gradient(180deg, ${X.GREEN}55, ${X.GREEN}22)`,
              borderLeft: `2px solid ${X.GREEN}`, borderRight: `2px solid ${X.GREEN}`,
            }}/>
            <div style={{ position: 'absolute', left: 6, top: 4, fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>SOFT</div>
            <div style={{ position: 'absolute', left: `${(pct(IDEAL_LO)+pct(IDEAL_HI))/2}%`, top: 4, transform: 'translateX(-50%)', fontSize: 9, fontFamily: FONT.mono, color: X.GREEN, letterSpacing: 1, fontWeight: 700 }}>IDEAL</div>
            <div style={{ position: 'absolute', right: 6, top: 4, fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>HARD</div>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: `${pct(liveDepth)}%`,
              width: 3, marginLeft: -1.5, background: '#fff', boxShadow: '0 0 12px rgba(255,255,255,0.6)',
              transition: 'left 80ms linear',
            }}/>
            <div style={{
              position: 'absolute', bottom: 4, left: `${pct(liveDepth)}%`, transform: 'translateX(-50%)',
              padding: '2px 8px', background: depthColor, color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 999, fontFamily: FONT.mono,
              transition: 'left 80ms linear, background 120ms linear',
            }}>{liveDepth.toFixed(1)} cm</div>
          </div>
          <div style={{ marginTop: 4, position: 'relative', height: 12, fontFamily: FONT.mono, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            {[0, 2, 4, 5, 6, 7].map(v => (
              <span key={v} style={{ position: 'absolute', left: `${pct(v)}%`, transform: 'translateX(-50%)' }}>{v}</span>
            ))}
          </div>
        </div>

        {/* Same phase-ring metronome circle as phone-only, slightly smaller to make
            room for the depth bar above. Bystander still gets PUSH/BREATHE coaching. */}
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
          <PhaseRingCircle phase={phase} size={170}/>
        </div>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>RATE</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: displayedRate >= 100 && displayedRate <= 120 ? X.GREEN : X.AMBER }}>{displayedRate || '—'}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>bpm · {!displayedRate ? 'building rate…' : displayedRate >= 100 && displayedRate <= 120 ? 'ok' : displayedRate < 100 ? 'too slow' : 'too fast'}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>RECOIL</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: X.AMBER }}>92<span style={{ fontSize: 11 }}>%</span></div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: X.AMBER }}>let go fully</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>COUNT</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8 }}>{liveCount}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>sensor live</div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: cueBg, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{cueText}</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>

        <BreathingReassessButton cyclesCompleted={cyclesCompleted}/>

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
