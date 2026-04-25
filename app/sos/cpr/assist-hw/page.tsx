'use client';
import * as React from 'react';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { CPRToolbar, CPRMiniLive } from '@/components/lifelink/CPRShared';
import { X, FONT } from '@/components/lifelink/tokens';
import { useSerialCPR } from '@/lib/cpr/useSerialCPR';

const DEPTH_MIN = 0, DEPTH_MAX = 7;
const IDEAL_LO = 5.0, IDEAL_HI = 6.0;
const pct = (v: number) => ((v - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN)) * 100;
const FALLBACK_DEPTH = 5.4;

// Map sensor voltage (0–5V on RP-S40-ST) to a believable compression depth (0–7cm).
// 4.0V (PEAK threshold) → 5.6cm (just inside ideal band).
// 5.0V (max) → 7.0cm (too hard).
function voltageToDepth(v: number) {
  return Math.max(0, Math.min(DEPTH_MAX, v * 1.4));
}

// Crude rolling rate estimate from compression timestamps
function useRateFromCount(count: number) {
  const [rate, setRate] = React.useState<number | null>(null);
  const samples = React.useRef<number[]>([]);
  const lastCount = React.useRef(0);
  React.useEffect(() => {
    if (count > lastCount.current) {
      samples.current.push(Date.now());
      // keep a 6-second window
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

export default function CPRAssistHWPage() {
  const cpr = useSerialCPR();
  const connected = cpr.isConnected && cpr.isReceiving;

  const liveDepth = connected && cpr.lastSample
    ? voltageToDepth(cpr.lastSample.voltage)
    : FALLBACK_DEPTH;
  const liveCount = connected ? cpr.sampleCount === 0 ? 0 : (cpr.lastSample?.count ?? 0) : 28;
  const liveRate = useRateFromCount(connected ? cpr.lastSample?.count ?? 0 : 0);
  const displayedRate = connected ? (liveRate ?? 0) : 112;
  const pressed = connected ? !!cpr.lastSample?.pressed : false;
  const inBand = liveDepth >= IDEAL_LO && liveDepth <= IDEAL_HI;
  const depthColor = inBand ? X.GREEN : (liveDepth < IDEAL_LO ? X.AMBER : X.RED);

  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner time="00:02:18"/>
      <div style={{ padding: '70px 18px 0', color: '#fff' }}>
        {/* Patch status banner — clickable when not connected */}
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
          <span style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }}>
            {connected ? `50 Hz · samples ${cpr.sampleCount}` : 'demo · v2.1'}
          </span>
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>● CPR · CYCLE 03</div>
        </div>
        <CPRToolbar metroOn voiceOn helpersInCall={2}/>

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

        <div style={{ marginTop: 6, position: 'relative', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 110, height: 110, borderRadius: 55, border: '1px solid rgba(255,255,255,0.12)' }}/>
          <div style={{
            width: 92, height: 92, borderRadius: 46, background: X.RED,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transform: connected ? (pressed ? 'scale(1.18)' : 'scale(1)') : undefined,
            transition: connected ? 'transform 90ms ease-out' : undefined,
            animation: connected ? 'none' : 'll-cpr-beat 0.545s ease-in-out infinite',
            boxShadow: '0 0 60px rgba(225,29,46,0.5)',
          }}>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.9 }}>PUSH</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: FONT.display, lineHeight: 1 }}>{displayedRate || 110}</div>
            <div style={{ fontSize: 9, opacity: 0.85 }}>BPM</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>RATE</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: X.GREEN }}>{displayedRate || '—'}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>bpm · {connected ? (displayedRate >= 100 && displayedRate <= 120 ? 'ok' : 'press faster') : 'ok'}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>RECOIL</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8, color: X.AMBER }}>92<span style={{ fontSize: 11 }}>%</span></div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: X.AMBER }}>let go fully</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2 }}>COUNT</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.8 }}>{liveCount}</div>
            <div style={{ fontSize: 9, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.45)' }}>{connected ? 'live' : 'cycle 03'}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: depthColor === X.GREEN ? X.GREEN : X.AMBER, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>
            {connected
              ? (inBand ? '"Good depth. Keep going."' : liveDepth < IDEAL_LO ? '"Push harder. Use your body weight."' : '"Ease up — too deep."')
              : '"Let go fully between pushes."'}
          </div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>{connected ? 'live' : '0:32'}</div>
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
