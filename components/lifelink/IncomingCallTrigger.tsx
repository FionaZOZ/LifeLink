'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useDemoRole, isVolunteer } from './demoRole';
import { Icon } from './Icon';
import { X, FONT } from './tokens';

export function IncomingCallTrigger() {
  const router = useRouter();
  const [role] = useDemoRole();
  if (!isVolunteer(role)) return null;

  return (
    <button
      onClick={() => router.push('/helper/code-red')}
      aria-label="Demo — simulate incoming Code Red"
      style={{
        all: 'unset', cursor: 'pointer',
        position: 'fixed', bottom: 14, left: 14, zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px 8px 10px',
        background: X.RED, color: '#fff',
        border: `2px solid ${X.RED_DEEP}`,
        borderRadius: 999,
        fontFamily: FONT.mono, fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
        boxShadow: '0 6px 20px rgba(225,29,46,0.5), 0 0 0 3px rgba(255,255,255,0.4)',
      }}
    >
      <span
        className="ll-pulse-dot"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 11,
          background: 'rgba(255,255,255,0.18)',
        }}
      >
        <Icon name="phone" size={13} color="#fff" stroke={2.4}/>
      </span>
      RING VOLUNTEER
    </button>
  );
}
