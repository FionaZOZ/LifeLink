'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';

export default function RecoveryPage() {
  const router = useRouter();
  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner time="00:00:52"/>

      <div style={{ padding: '70px 22px 0' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.GREEN, letterSpacing: 1.4, fontWeight: 700 }}>● BREATHING NORMALLY</div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05 }}>
          Roll them onto<br/>their side.
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: X.INK2 }}>This keeps the airway clear while help arrives.</div>

        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 14 }}>
          <div style={{ background: X.BG, borderRadius: 12, padding: 12 }}>
            <svg viewBox="0 0 260 110" width="100%" height="100">
              <ellipse cx="130" cy="92" rx="120" ry="6" fill={X.LINE2}/>
              <path d="M 60 78 Q 50 68 60 60 Q 78 56 96 60 Q 130 64 168 56 Q 192 50 200 60 Q 210 72 196 80 Q 158 92 110 88 Z" fill="#EFEDE6" stroke={X.LINE} strokeWidth="1.5"/>
              <circle cx="56" cy="64" r="11" fill="#fff" stroke={X.INK} strokeWidth="1.6"/>
              <path d="M 110 62 Q 130 50 138 70" stroke={X.INK} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
              <path d="M 178 64 Q 210 70 198 86" stroke={X.INK} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
              <g stroke={X.GREEN} strokeWidth="1.6" fill="none" strokeLinecap="round">
                <path d="M 56 48 q 0 -8 4 -12"/>
                <path d="M 50 50 q -2 -8 0 -14"/>
              </g>
            </svg>
          </div>

          <div style={{ marginTop: 10 }}>
            {[
              ['1', 'Bend the arm closest to you up by their head.'],
              ['2', 'Pull the far knee up so the foot is flat.'],
              ['3', 'Roll them toward you, head on their bent arm.'],
              ['4', 'Tilt the head back to keep the airway open.'],
            ].map(([n, t], i, a) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < a.length-1 ? `1px solid ${X.LINE2}` : 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: X.GREEN, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: X.INK }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 12, background: X.RED_BG, border: `1px solid ${X.RED}33`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="bell" size={18} color={X.RED} stroke={2.2}/>
          <div style={{ fontSize: 12, color: X.RED_DEEP, fontWeight: 600 }}>Keep watching their chest. If they stop breathing, we&apos;ll alert you to start CPR.</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38, display: 'flex', gap: 10 }}>
        <button onClick={() => router.push('/sos/breathing')} style={{ all: 'unset', cursor: 'pointer', padding: '14px 18px', border: `1px solid ${X.LINE}`, color: X.INK, borderRadius: 14, fontWeight: 700, fontSize: 13 }}>Re-check</button>
        <button onClick={() => router.push('/sos/map')} style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 16, background: X.INK, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 700, letterSpacing: 0.4 }}>Stay &amp; monitor (3 min)</button>
      </div>
    </Screen>
  );
}
