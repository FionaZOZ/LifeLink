'use client';
import * as React from 'react';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { CPRToolbar, CPRMiniLive } from '@/components/lifelink/CPRShared';
import { X, FONT } from '@/components/lifelink/tokens';

const TARGET_BPM = 110;
const ROLLING_WINDOW_MS = 6000; // bpm averaged over the last 6 seconds of taps
const IDLE_THRESHOLD_MS = 2500; // no tap in this long → idle prompt

const CUES_OK = [
  '"Push hard. Push fast."',
  '"Center of the chest."',
  '"Twice per second."',
  '"Use your body weight."',
  '"Don\'t stop pushing."',
  '"Stay strong — keep the rhythm."',
];
const CUES_FAST = [
  '"Slow down — about twice per second."',
  '"Ease the rate down."',
];
const CUES_SLOW = [
  '"Push faster."',
  '"Pick up the pace — match the beat."',
  '"Compressions need to be quicker."',
];
const CUES_IDLE = [
  '"Tap each time you push."',
  '"Push along with the beat."',
  '"Match every pulse."',
];

function fmtMmSs(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CPRAssistPage() {
  const startRef = React.useRef<number>(0);
  const tapsRef = React.useRef<number[]>([]);
  const [, forceTick] = React.useState(0);
  const [now, setNow] = React.useState(() => Date.now());

  // Initialise the CPR session clock once on mount.
  React.useEffect(() => {
    startRef.current = Date.now();
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const tap = React.useCallback((e?: React.PointerEvent) => {
    if (e) e.preventDefault();
    tapsRef.current.push(Date.now());
    forceTick(v => v + 1);
  }, []);

  // Compute live state from the tap log.
  const elapsedMs = startRef.current ? now - startRef.current : 0;
  const compressions = tapsRef.current.length;
  const recent = tapsRef.current.filter(t => now - t <= ROLLING_WINDOW_MS);
  const lastTapMs = recent.length ? now - recent[recent.length - 1] : Infinity;
  const idle = compressions === 0 || lastTapMs > IDLE_THRESHOLD_MS;

  let bpm: number | null = null;
  if (recent.length >= 2) {
    const span = (recent[recent.length - 1] - recent[0]) / 1000;
    bpm = span > 0 ? Math.round((recent.length - 1) * 60 / span) : null;
  } else if (recent.length === 1) {
    // single tap in window — extrapolate from age
    bpm = null;
  }

  const cycle = Math.max(1, Math.floor(compressions / 30) + 1);

  // Pick the active cue list off the current rate state, rotate every 4.5s.
  const cueList = idle ? CUES_IDLE
    : bpm == null ? CUES_OK
    : bpm < 95 ? CUES_SLOW
    : bpm > 125 ? CUES_FAST
    : CUES_OK;
  const cueColor = idle ? X.AMBER : (bpm != null && (bpm < 95 || bpm > 125)) ? X.AMBER : X.RED;
  const cueIdx = Math.floor((elapsedMs / 4500)) % cueList.length;
  const cue = cueList[cueIdx];

  const rateColor = idle ? 'rgba(255,255,255,0.55)' : bpm == null ? 'rgba(255,255,255,0.85)' : (bpm >= 100 && bpm <= 120) ? X.GREEN : X.AMBER;
  const rateText = bpm == null ? '—' : String(bpm);

  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner/>
      <div style={{ padding: '70px 18px 0', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>● CPR · CYCLE {String(cycle).padStart(2, '0')}</div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
        <CPRToolbar metroOn voiceOn helpersInCall={2}/>

        {/* Big tappable beat circle. The CSS keyframe gives the metronome
            visual at 110 bpm; the user taps along with it to register
            real compressions. */}
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

        {/* metronome reference bar */}
        <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ width: 5, height: i === 6 ? 22 : 10, background: i === 6 ? X.RED : 'rgba(255,255,255,0.15)' }}/>
          ))}
        </div>

        {/* live counters — sourced from the tap log */}
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

        {/* Voice cue — text rotates every 4.5s and colour follows the rate state. */}
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: cueColor, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{cue}</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{fmtMmSs(Math.floor(elapsedMs / 1000))}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <CPRMiniLive dark/>
      </div>
    </Screen>
  );
}
