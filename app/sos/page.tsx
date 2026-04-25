'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';

export default function ResponsivenessPage() {
  const router = useRouter();
  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner time="00:00:08"/>

      <div style={{ padding: '70px 22px 0' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.4 }}>STEP 1 · CHECK · BEFORE WE CALL</div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05 }}>
          Are they<br/>responding?
        </div>

        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg viewBox="0 0 80 80" width="64" height="64" style={{ flexShrink: 0 }}>
              <ellipse cx="40" cy="60" rx="24" ry="6" fill={X.LINE2}/>
              <path d="M 16 50 Q 16 38 28 38 L 52 38 Q 64 38 64 50" stroke={X.INK} strokeWidth="2" fill="none"/>
              <circle cx="28" cy="36" r="6" fill="#fff" stroke={X.INK} strokeWidth="2"/>
              <path d="M 22 32 q -2 -8 4 -10 M 12 30 q -2 -6 2 -10" stroke={X.RED} strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Tap their shoulders firmly.</div>
              <div style={{ fontSize: 12, color: X.INK2, marginTop: 2 }}>Shout: <strong style={{ color: X.INK }}>&quot;Are you OK?&quot;</strong></div>
              <div style={{ fontSize: 12, color: X.INK2, marginTop: 6 }}>Look for any movement, sound, or eye opening — for up to 10 seconds.</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>WHAT DO YOU SEE?</div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => router.push('/sos/dispatch/conscious')} style={{ all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box', padding: 16, background: '#fff', border: `1.5px solid ${X.LINE}`, borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: X.GREEN_BG, color: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={18} color={X.GREEN} stroke={2.4}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>They responded</div>
              <div style={{ fontSize: 11, color: X.INK2 }}>Moved, made a sound, opened eyes</div>
            </div>
            <Icon name="chevron-right" size={18} color={X.INK3} stroke={2.4}/>
          </div>
        </button>
        <button onClick={() => router.push('/sos/dispatch/unconscious')} style={{ all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box', padding: 16, background: X.RED, color: '#fff', borderRadius: 14, boxShadow: '0 8px 24px rgba(225,29,46,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={20} color="#fff" stroke={2.6}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.2 }}>NO RESPONSE</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>Continue to breathing check</div>
            </div>
            <Icon name="chevron-right" size={18} color="#fff" stroke={2.4}/>
          </div>
        </button>
      </div>
    </Screen>
  );
}
