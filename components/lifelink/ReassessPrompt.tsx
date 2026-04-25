'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { X, FONT } from './tokens';

const PROMPT_DURATION_MS = 10000;

/**
 * Non-blocking amber strip that drops down underneath the EmergencyBanner
 * every time the CPR session crosses another 5-cycle / ~2-minute mark.
 *
 * - CPR keeps running; the metronome / count never pauses.
 * - The only interactive target is "patient is breathing →" which exits to /sos/recovery.
 * - Auto-dismisses after PROMPT_DURATION_MS.
 *
 * The parent passes `cyclesCompleted` and we detect every 5th boundary crossing.
 */
export function ReassessPrompt({ cyclesCompleted }: { cyclesCompleted: number }) {
  const triggerIndex = Math.floor(cyclesCompleted / 5);
  const lastTriggerRef = React.useRef(0);
  const [openedAt, setOpenedAt] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const router = useRouter();

  // Tick while open so the progress bar drains smoothly.
  React.useEffect(() => {
    if (openedAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [openedAt]);

  // Detect the boundary crossing into a new multiple-of-5 cycle.
  React.useEffect(() => {
    if (triggerIndex > lastTriggerRef.current && triggerIndex > 0) {
      lastTriggerRef.current = triggerIndex;
      setOpenedAt(Date.now());
    }
  }, [triggerIndex]);

  // Auto-dismiss after PROMPT_DURATION_MS.
  React.useEffect(() => {
    if (openedAt == null) return;
    const t = setTimeout(() => setOpenedAt(null), PROMPT_DURATION_MS);
    return () => clearTimeout(t);
  }, [openedAt]);

  if (openedAt == null) return null;

  const elapsedMs = Math.min(PROMPT_DURATION_MS, now - openedAt);
  const remaining = Math.max(0, Math.ceil((PROMPT_DURATION_MS - elapsedMs) / 1000));
  const drainPct = ((PROMPT_DURATION_MS - elapsedMs) / PROMPT_DURATION_MS) * 100;
  const minutes = Math.floor((cyclesCompleted * 21.36) / 60); // 1 cycle ≈ 21.36s

  return (
    <div
      style={{
        position: 'absolute', top: 50, left: 12, right: 12, zIndex: 90,
        padding: '10px 12px', borderRadius: 14,
        background: 'rgba(232,133,44,0.95)', color: '#fff',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 14px 28px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="clock" size={14} color="#fff" stroke={2.4}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.2, fontWeight: 800 }}>
          {minutes} MIN · CHECK FOR BREATHING
        </div>
        <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>
          Still unresponsive? Keep going. {remaining}s
        </div>
      </div>
      <button
        onClick={() => { setOpenedAt(null); router.push('/sos/recovery'); }}
        style={{
          all: 'unset', cursor: 'pointer', flexShrink: 0,
          padding: '6px 10px', borderRadius: 999,
          background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff', fontSize: 10, fontWeight: 800, fontFamily: FONT.mono, letterSpacing: 0.6,
          whiteSpace: 'nowrap',
        }}
      >
        BREATHING →
      </button>

      {/* Drain bar so the user feels the auto-dismiss is in motion. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: 'rgba(0,0,0,0.18)', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, overflow: 'hidden' }}>
        <div style={{ width: `${drainPct}%`, height: '100%', background: '#fff' }}/>
      </div>
    </div>
  );
}
