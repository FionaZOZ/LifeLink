'use client';
import * as React from 'react';
import Link from 'next/link';
import { Icon } from './Icon';
import { X, FONT } from './tokens';
import { useT } from './i18n';

const PULSE_DURATION_MS = 10000;

/**
 * Always-on green outlined button on the CPR screens. Tap to exit to
 * /sos/recovery the moment the bystander notices the patient resume
 * breathing. Every 5 completed cycles (≈ 2 min) the button briefly pulses
 * for 10 s as a subtle "time to reassess" nudge — replaces the older
 * disruptive ReassessPrompt overlay so the notification can never be
 * missed by being mid-CPR when it auto-dismisses.
 */
export function BreathingReassessButton({ cyclesCompleted }: { cyclesCompleted: number }) {
  const { t } = useT();
  const triggerIndex = Math.floor(cyclesCompleted / 5);
  const lastTriggerRef = React.useRef(0);
  const [pulsing, setPulsing] = React.useState(false);

  React.useEffect(() => {
    if (triggerIndex > lastTriggerRef.current && triggerIndex > 0) {
      lastTriggerRef.current = triggerIndex;
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), PULSE_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [triggerIndex]);

  return (
    <Link
      href="/sos/recovery"
      style={{
        position: 'relative',
        textDecoration: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginTop: 12, padding: '10px 14px',
        background: pulsing ? 'rgba(31,138,77,0.22)' : 'rgba(31,138,77,0.12)',
        border: `1.5px solid ${pulsing ? X.GREEN : 'rgba(31,138,77,0.4)'}`,
        borderRadius: 12,
        color: X.GREEN, fontSize: 12, fontWeight: 700, fontFamily: FONT.body, letterSpacing: 0.2,
        transition: 'background 220ms ease-out, border-color 220ms ease-out',
      }}
    >
      {pulsing && (
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: -2, borderRadius: 14,
            border: `1.5px solid ${X.GREEN}`,
            animation: 'll-pulse-ring 1.6s ease-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <Icon name="heart" size={14} color={X.GREEN} stroke={2.2}/>
      <span>{t('cpr.assist.reassess')}</span>
      <span style={{ opacity: 0.7 }}>→</span>
    </Link>
  );
}
