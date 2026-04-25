'use client';
import * as React from 'react';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { CPRToolbar, CPRMiniLive } from '@/components/lifelink/CPRShared';
import { X, FONT } from '@/components/lifelink/tokens';
import { useSerialCPR } from '@/lib/cpr/useSerialCPR';

// ── shared constants ──────────────────────────────────────────────────────
const TARGET_BPM = 110;
const ROLLING_WINDOW_MS = 6000;
const IDLE_THRESHOLD_MS = 2500;
const DEPTH_MIN = 0, DEPTH_MAX = 7;
const IDEAL_LO = 5.0, IDEAL_HI = 6.0;
const pct = (v: number) => ((v - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN)) * 100;

// Map sensor voltage (0–5V on RP-S40-ST) to a believable compression depth (0–7cm).
function voltageToDepth(v: number) {
  return Math.max(0, Math.min(DEPTH_MAX, v * 1.4));
}

function fmtMmSs(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── voice cue lists ───────────────────────────────────────────────────────
const PHONE_CUES_OK = [
  '"Push hard. Push fast."',
  '"Center of the chest."',
  '"Twice per second."',
  '"Use your body weight."',
  '"Don\'t stop pushing."',
  '"Stay strong — keep the rhythm."',
];
const PHONE_CUES_FAST = [
  '"Slow down — about twice per second."',
  '"Ease the rate down."',
];
const PHONE_CUES_SLOW = [
  '"Push faster."',
  '"Pick up the pace — match the beat."',
  '"Compressions need to be quicker."',
];
const PHONE_CUES_IDLE = [
  '"Tap each time you push."',
  '"Push along with the beat."',
  '"Match every pulse."',
];
const HW_CUES_OK = [
  '"Good depth. Keep going."',
  '"Solid rhythm — hold that depth."',
  '"You\'re right in the band."',
  '"Strong compressions — don\'t stop."',
];

// ── PATCH BANNER (shared between both layouts) ────────────────────────────
type Cpr = ReturnType<typeof useSerialCPR>;

function PatchBanner({ cpr, connected }: { cpr: Cpr; connected: boolean }) {
  return (
    <button
      onClick={connected ? cpr.disconnect : cpr.connect}
      disabled={cpr.isConnecting || !cpr.isSupported}
      style={{
        all: 'unset', cursor: cpr.isSupported ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        width: '100%', boxSizing: 'border-box',
        background: connected ? 'rgba(31,138,77,0.15)' : 'rgba(232,133,44,0.15)',
        border: `1px solid ${connected ? 'rgba(31,138,77,0.4)' : 'rgba(232,133,44,0.4)'}`,
        borderRadius: 10, marginBottom: 8,
      }}
    >
      <span className="ll-blink" style={{ width: 6, height: 6, borderRadius: 3, background: connected ? X.GREEN : X.AMBER }}/>
      <span style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.2, fontWeight: 700, color: connected ? X.GREEN : X.AMBER }}>
        {!cpr.isSupported ? 'WEB SERIAL UNSUPPORTED — chrome/edge only'
          : cpr.isConnecting ? 'PATCH CONNECTING…'
          : connected ? 'PATCH CONNECTED'
          : cpr.isConnected ? 'PATCH WAITING FOR DATA'
          : 'PATCH OFFLINE — TAP TO PAIR'}
      </span>
      <span style={{ flex: 1 }}/>
      <span style={{ fontSize: 9, fontFamily: FONT.mono, color: connected ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)' }}>
        {connected ? `50 Hz · samples ${cpr.sampleCount}` : 'pair to unlock depth bar'}
      </span>
    </button>
  );
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
  const now = Date.now();
  const elapsedMs = startRef.current ? now - startRef.current : 0;

  return connected
    ? <HardwareLayout cpr={cpr} elapsedMs={elapsedMs}/>
    : <PhoneOnlyLayout cpr={cpr} elapsedMs={elapsedMs} now={now}/>;
}

// ───────────────────────────────────────────────────────────────────────────
// LAYOUT A — phone-only (no LifeLink Patch). Tap each compression to register.
// ───────────────────────────────────────────────────────────────────────────
function PhoneOnlyLayout({ cpr, elapsedMs, now }: { cpr: Cpr; elapsedMs: number; now: number }) {
  const tapsRef = React.useRef<number[]>([]);
  const [, forceTick] = React.useState(0);

  const tap = React.useCallback((e?: React.PointerEvent) => {
    if (e) e.preventDefault();
    tapsRef.current.push(Date.now());
    forceTick(v => v + 1);
  }, []);

  const compressions = tapsRef.current.length;
  const recent = tapsRef.current.filter(t => now - t <= ROLLING_WINDOW_MS);
  const lastTapMs = recent.length ? now - recent[recent.length - 1] : Infinity;
  const idle = compressions === 0 || lastTapMs > IDLE_THRESHOLD_MS;

  let bpm: number | null = null;
  if (recent.length >= 2) {
    const span = (recent[recent.length - 1] - recent[0]) / 1000;
    bpm = span > 0 ? Math.round((recent.length - 1) * 60 / span) : null;
  }
  const cycle = Math.max(1, Math.floor(compressions / 30) + 1);

  const cueList = idle ? PHONE_CUES_IDLE
    : bpm == null ? PHONE_CUES_OK
    : bpm < 95 ? PHONE_CUES_SLOW
    : bpm > 125 ? PHONE_CUES_FAST
    : PHONE_CUES_OK;
  const cueColor = idle ? X.AMBER : (bpm != null && (bpm < 95 || bpm > 125)) ? X.AMBER : X.RED;
  const cueIdx = Math.floor(elapsedMs / 4500) % cueList.length;
  const cue = cueList[cueIdx];

  const rateColor = idle ? 'rgba(255,255,255,0.55)' : bpm == null ? 'rgba(255,255,255,0.85)' : (bpm >= 100 && bpm <= 120) ? X.GREEN : X.AMBER;
  const rateText = bpm == null ? '—' : String(bpm);

  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner/>
      <div style={{ padding: '70px 18px 0', color: '#fff' }}>
        <PatchBanner cpr={cpr} connected={false}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>● CPR · CYCLE {String(cycle).padStart(2, '0')}</div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
        <CPRToolbar metroOn voiceOn helpersInCall={2}/>

        {/* Big tappable beat circle — metronome via CSS keyframe at 110 bpm,
            tap to record actual compressions. */}
        <div
          onPointerDown={tap}
          role="button"
          aria-label="Tap on every compression"
          style={{ marginTop: 12, position: 'relative', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'none', userSelect: 'none' }}
        >
          <div style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, border: '1px solid rgba(255,255,255,0.15)' }}/>
          <div style={{ position: 'absolute', width: 230, height: 230, borderRadius: 115, border: '1px solid rgba(255,255,255,0.08)' }}/>
          <div style={{
            width: 158, height: 158, borderRadius: 79, background: X.RED,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'll-cpr-beat 0.545s ease-in-out infinite',
            boxShadow: '0 0 80px rgba(225,29,46,0.5)',
          }}>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.9 }}>TAP HERE</div>
            <div style={{ fontSize: 56, fontWeight: 700, fontFamily: FONT.display, lineHeight: 1 }}>{TARGET_BPM}</div>
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>BPM target</div>
          </div>
        </div>

        <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ width: 5, height: i === 6 ? 22 : 10, background: i === 6 ? X.RED : 'rgba(255,255,255,0.15)' }}/>
          ))}
        </div>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>COMPRESSIONS</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>{compressions}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>cycle {String(cycle).padStart(2, '0')}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>RATE</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1, color: rateColor }}>
              {rateText} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>BPM</span>
            </div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>
              {idle ? 'tap to begin' : bpm == null ? 'building rate…' : bpm < 95 ? 'too slow' : bpm > 125 ? 'too fast' : 'in target band'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: cueColor, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{cue}</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>

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

function HardwareLayout({ cpr, elapsedMs }: { cpr: Cpr; elapsedMs: number }) {
  const liveDepth = cpr.lastSample ? voltageToDepth(cpr.lastSample.voltage) : 0;
  const liveCount = cpr.lastSample?.count ?? 0;
  const liveRate = useRateFromCount(cpr.lastSample?.count ?? 0);
  const displayedRate = liveRate ?? 0;
  const pressed = !!cpr.lastSample?.pressed;
  const inBand = liveDepth >= IDEAL_LO && liveDepth <= IDEAL_HI;
  const depthColor = inBand ? X.GREEN : (liveDepth < IDEAL_LO ? X.AMBER : X.RED);
  const cycle = Math.max(1, Math.floor(liveCount / 30) + 1);

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
        <PatchBanner cpr={cpr} connected={true}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>● CPR · CYCLE {String(cycle).padStart(2, '0')}</div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
        <CPRToolbar metroOn voiceOn helpersInCall={2}/>

        {/* DEPTH BAR — primary feedback driven by the patch voltage. */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>COMPRESSION DEPTH</div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>TARGET 5.0–6.0 cm</div>
          </div>

          <div style={{ marginTop: 8, position: 'relative', height: 56, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
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

          <div style={{ marginTop: 4, position: 'relative', height: 14, fontFamily: FONT.mono, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            {[0, 2, 4, 5, 6, 7].map(v => (
              <span key={v} style={{ position: 'absolute', left: `${pct(v)}%`, transform: 'translateX(-50%)' }}>{v}</span>
            ))}
          </div>
        </div>

        {/* Beat circle — scales on every press detected by the patch. */}
        <div style={{ marginTop: 6, position: 'relative', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 110, height: 110, borderRadius: 55, border: '1px solid rgba(255,255,255,0.12)' }}/>
          <div style={{
            width: 92, height: 92, borderRadius: 46, background: X.RED,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transform: pressed ? 'scale(1.18)' : 'scale(1)',
            transition: 'transform 90ms ease-out',
            boxShadow: '0 0 60px rgba(225,29,46,0.5)',
          }}>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.9 }}>PUSH</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: FONT.display, lineHeight: 1 }}>{displayedRate || '—'}</div>
            <div style={{ fontSize: 9, opacity: 0.85 }}>BPM</div>
          </div>
        </div>

        {/* Live metric grid. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>RATE</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: displayedRate >= 100 && displayedRate <= 120 ? X.GREEN : X.AMBER }}>{displayedRate || '—'}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>bpm · {displayedRate >= 100 && displayedRate <= 120 ? 'ok' : displayedRate < 100 ? 'too slow' : displayedRate > 120 ? 'too fast' : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>RECOIL</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: X.AMBER }}>92<span style={{ fontSize: 11 }}>%</span></div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: X.AMBER }}>let go fully</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>COUNT</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8 }}>{liveCount}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>live</div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: cueBg, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{cueText}</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>

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
