'use client';
import * as React from 'react';
import { Icon } from './Icon';
import { X, FONT } from './tokens';
import { useAppleWatch, AppleWatchStatus } from '@/lib/useAppleWatch';
import { useT } from './i18n';

type Variant = 'home' | 'hardware';

type Props = {
  variant?: Variant;
  /** Optional: clicking anywhere outside an interactive control fires this. */
  onCardClick?: () => void;
};

function statusLabelKey(s: AppleWatchStatus): string {
  switch (s) {
    case 'connecting':   return 'aw.status.connecting';
    case 'connected':
    case 'simulated':    return 'aw.status.live';
    case 'disconnected': return 'aw.status.disconnected';
    case 'error':        return 'aw.status.error';
    case 'idle':
    default:             return 'aw.status.idle';
  }
}

function dotColor(s: AppleWatchStatus): string {
  if (s === 'connected' || s === 'simulated') return X.GREEN;
  if (s === 'error' || s === 'disconnected') return X.RED;
  return X.INK3;
}

export function AppleWatchCard({ variant = 'hardware', onCardClick }: Props) {
  const { t } = useT();
  const aw = useAppleWatch();
  const live = aw.isConnected;

  const handleConnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    aw.connect();
  };
  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    aw.disconnect();
  };

  // Heart pulse runs at a fixed 0.85s and the status dot at a fixed 1.4s —
  // crucially, the durations are NOT recomputed from BPM. Inline CSS
  // animation shorthand re-renders with a new duration string get treated as
  // a different animation by the browser, which restarts the keyframe at
  // frame 0. That's what made the previous version visibly stutter every
  // time the simulator emitted a new BPM. The actual heart rate is shown by
  // the BPM number; the icon just needs to look alive.
  const localCss = `
    @keyframes ll-aw-beat {
      0%   { transform: scale(1);    }
      18%  { transform: scale(1.18); }
      32%  { transform: scale(0.96); }
      50%  { transform: scale(1.10); }
      100% { transform: scale(1);    }
    }
    @keyframes ll-aw-tip-blink {
      0%, 60%   { opacity: 1; }
      80%, 100% { opacity: 0.2; }
    }
  `;

  return (
    <div
      onClick={onCardClick}
      style={{
        background: '#fff',
        border: `1px solid ${X.LINE}`,
        borderRadius: 20,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
        cursor: onCardClick ? 'pointer' : 'default',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02), 0 8px 24px rgba(225,29,46,0.06)',
      }}
    >
      <style>{localCss}</style>

      {/* Top row — status pill + watch glyph */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4 }}>
        <span style={{ color: dotColor(aw.status), fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: 4, background: dotColor(aw.status),
            boxShadow: live ? `0 0 0 4px ${dotColor(aw.status)}22` : 'none',
            animation: live ? 'll-aw-tip-blink 1.4s ease-in-out infinite' : undefined,
            display: 'inline-block',
          }}/>
          {t(statusLabelKey(aw.status))}
        </span>
        <AppleWatchGlyph color={X.INK3}/>
      </div>

      {/* Body — depends on whether we have a live reading or not */}
      {live ? (
        <ConnectedBody bpm={aw.bpm} battery={aw.battery} variant={variant} deviceName={aw.deviceName}/>
      ) : (
        <IdleBody status={aw.status} error={aw.error}/>
      )}

      {/* Action row */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${X.LINE2}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        {live ? (
          <>
            <div style={{ flex: 1, fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 0.6 }}>
              {aw.deviceName ?? t('aw.deviceFallback')}{aw.battery != null ? ` · ${aw.battery}%` : ''}
            </div>
            <button onClick={handleDisconnect} style={pillBtn(X.INK2, '#fff', X.LINE)}>
              {t('aw.action.disconnect')}
            </button>
          </>
        ) : aw.status === 'connecting' ? (
          <div style={{ flex: 1, fontSize: 12, color: X.INK2 }}>{t('aw.action.pairing')}</div>
        ) : (
          <>
            <div style={{ flex: 1, fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 0.6 }}>
              {t('aw.action.tapToStart')}
            </div>
            <button onClick={handleConnect} style={pillBtn('#fff', X.RED, X.RED)}>
              {t('aw.action.connect')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function ConnectedBody({ bpm, battery, variant, deviceName }: {
  bpm: number | null;
  battery: number | null;
  variant: Variant;
  deviceName: string | null;
}) {
  const { t } = useT();
  const showBig = variant === 'hardware';
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Pulsing heart — fixed-duration animation. Decoupled from BPM on
            purpose; the BPM number is the data, this icon just signals "live". */}
        <div style={{
          width: showBig ? 56 : 44,
          height: showBig ? 56 : 44,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: X.RED,
          animation: 'll-aw-beat 0.85s ease-in-out infinite',
          willChange: 'transform',
        }}>
          <Icon name="heart" size={showBig ? 38 : 30} color={X.RED} fill={X.RED} stroke={2}/>
        </div>
        {/* BPM readout */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: showBig ? 44 : 34,
              fontWeight: 700,
              fontFamily: FONT.display,
              letterSpacing: -1.5,
              color: X.INK,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {bpm ?? '—'}
            </span>
            <span style={{ fontSize: 12, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.4 }}>{t('aw.bpm')}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: X.INK2 }}>
            {showBig ? t('aw.live.from', { device: deviceName ?? t('aw.deviceFallback') }) : t('aw.live.fromYour')}
          </div>
        </div>
        {battery != null && <BatteryChip pct={battery}/>}
      </div>

      {/* Live ECG monitor — canvas-based. Phase advances continuously from dt
          (no CSS keyframe to restart), so BPM changes just speed the wave up
          or down without any visible jump. The leading dot reads its y from
          the same ecgY() that draws the line, so it rides on the trace
          rather than floating beside it. */}
      <div style={{
        marginTop: 12,
        height: showBig ? 60 : 44,
        position: 'relative',
        background: X.BG,
        border: `1px solid ${X.LINE2}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <EcgMonitor bpm={bpm} color={X.RED}/>
      </div>
    </div>
  );
}

function IdleBody({ status, error }: { status: AppleWatchStatus; error: string | null }) {
  const { t } = useT();
  let title = t('aw.idle.title');
  let sub = t('aw.idle.sub');
  if (status === 'connecting') { title = t('aw.idle.connecting.title'); sub = t('aw.idle.connecting.sub'); }
  if (status === 'disconnected'){ title = t('aw.idle.disconnected.title'); sub = t('aw.idle.disconnected.sub'); }
  if (status === 'error')       { title = t('aw.idle.error.title');     sub = error ?? t('aw.idle.error.sub'); }

  return (
    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: X.RED_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: X.RED,
        flexShrink: 0,
      }}>
        <Icon name="heart" size={28} color={X.RED} fill={X.RED} stroke={2}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.3, color: X.INK }}>{title}</div>
        <div style={{ fontSize: 12, color: X.INK2, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </div>
  );
}

function BatteryChip({ pct }: { pct: number }) {
  const fill = pct >= 30 ? X.GREEN : pct >= 15 ? X.AMBER : X.RED;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', borderRadius: 999,
      background: X.BG, border: `1px solid ${X.LINE}`,
      fontSize: 11, fontFamily: FONT.mono, color: X.INK2, fontWeight: 700, letterSpacing: 0.6,
    }}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
        <rect x="0.5" y="0.5" width="14" height="9" rx="2" stroke={X.INK2}/>
        <rect x="15.5" y="3" width="2" height="4" rx="0.5" fill={X.INK2}/>
        <rect x="2" y="2" width={Math.max(0, Math.min(11, (pct / 100) * 11))} height="6" rx="1" fill={fill}/>
      </svg>
      <span>{pct}%</span>
    </div>
  );
}

function AppleWatchGlyph({ color }: { color: string }) {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
      <rect x="3" y="2" width="16" height="3" rx="1" fill={color} opacity="0.55"/>
      <rect x="3" y="21" width="16" height="3" rx="1" fill={color} opacity="0.55"/>
      <rect x="2" y="6" width="18" height="14" rx="4" stroke={color} strokeWidth="1.5" fill="none"/>
      <circle cx="11" cy="13" r="2.4" fill={color} opacity="0.7"/>
    </svg>
  );
}

function pillBtn(fg: string, bg: string, border: string): React.CSSProperties {
  return {
    appearance: 'none',
    border: `1px solid ${border}`,
    background: bg,
    color: fg,
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: FONT.body,
    cursor: 'pointer',
    letterSpacing: 0.2,
  };
}

// ── ECG monitor (canvas) ──────────────────────────────────────────────────
// Real cardiac monitors don't tile a static SVG and slide it — they redraw
// the trace each frame from a phase counter. We do the same. This solves
// three problems at once:
//   · No keyframe restart on BPM change (phase advance is continuous in JS).
//   · No tiling gap (we always fill the full canvas width every frame).
//   · The "leading tip" dot can ride on the wave because we know exactly
//     what y the line is at for the current phase.

function EcgMonitor({ bpm, color }: { bpm: number | null; color: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const bpmRef = React.useRef<number>(bpm ?? 72);

  // Keep the latest BPM available to the rAF loop without restarting it.
  React.useEffect(() => { bpmRef.current = bpm ?? 72; }, [bpm]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // CSS-pixel dimensions, refreshed by ResizeObserver below.
    const dims = { cssW: 0, cssH: 0 };

    const setupSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW === 0 || cssH === 0) return;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      // Draw in CSS pixels; the dpr scaling makes the backing store crisp on retina.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dims.cssW = cssW;
      dims.cssH = cssH;
    };
    setupSize();

    // 110 px ≈ one beat of trace. At 72 BPM (1.2 beats/sec) that's ~132 px/sec —
    // a typical card width holds 2–3 visible beats, which matches a real monitor.
    const PX_PER_BEAT = 110;
    let phase = 0;       // beats since mount, real-valued, monotonically increasing
    let lastT = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Layout might not be settled on the very first paint.
      if (dims.cssW === 0 || dims.cssH === 0) {
        setupSize();
        if (dims.cssW === 0) return;
      }

      // Cap dt at 50 ms so a tab returning from background doesn't fast-forward
      // the wave by several seconds.
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      phase += (bpmRef.current / 60) * dt;

      const W = dims.cssW;
      const H = dims.cssH;
      const midY = H / 2;
      const amp = H * 0.38;

      ctx.clearRect(0, 0, W, H);

      // Walk left → right, mapping each x back to the phase that was "current"
      // when that pixel was at the right edge. The right edge of the canvas
      // is always the latest sample.
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let x = 0; x <= W; x += 1) {
        const beatsBack = (W - x) / PX_PER_BEAT;
        const phaseAtX = phase - beatsBack;
        const p = ((phaseAtX % 1) + 1) % 1; // safe fractional, handles negatives
        const y = midY - ecgY(p) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Leading tip — same ecgY() so the dot literally sits on the line.
      const pTip = ((phase % 1) + 1) % 1;
      const yTip = midY - ecgY(pTip) * amp;
      const xTip = W - 4;

      ctx.fillStyle = color + '33';
      ctx.beginPath();
      ctx.arc(xTip, yTip, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(xTip, yTip, 4, 0, Math.PI * 2);
      ctx.fill();
    };
    raf = requestAnimationFrame(frame);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(setupSize);
      ro.observe(canvas);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// One-beat ECG shape: P → flat → QRS → flat → T → flat. Domain p ∈ [0, 1).
// Returns y in roughly [-0.5, 1.0] with positive = upward deflection.
// All segment boundaries are continuous — the function returns the same
// value on either side, so the trace has no visible kinks at section edges.
function ecgY(p: number): number {
  // P wave (small upward bump, peak ~0.10)
  if (p >= 0.18 && p < 0.26) {
    const u = (p - 0.18) / 0.08;
    return Math.sin(u * Math.PI) * 0.10;
  }
  // QRS complex
  if (p >= 0.32 && p < 0.34) {                 // Q: 0 → -0.15
    return -0.15 * ((p - 0.32) / 0.02);
  }
  if (p >= 0.34 && p < 0.37) {                 // R: -0.15 → +1.00 (the spike)
    return -0.15 + 1.15 * ((p - 0.34) / 0.03);
  }
  if (p >= 0.37 && p < 0.40) {                 // S: +1.00 → -0.45
    return 1.0 - 1.45 * ((p - 0.37) / 0.03);
  }
  if (p >= 0.40 && p < 0.42) {                 // S recovery: -0.45 → 0
    return -0.45 + 0.45 * ((p - 0.40) / 0.02);
  }
  // T wave (medium upward bump, peak ~0.25)
  if (p >= 0.52 && p < 0.70) {
    const u = (p - 0.52) / 0.18;
    return Math.sin(u * Math.PI) * 0.25;
  }
  return 0;
}