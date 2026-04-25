'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';

export default function DispatchUnconsciousPage() {
  const router = useRouter();
  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner time="00:00:38"/>

      <div style={{ padding: '70px 22px 0' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>● UNRESPONSIVE · DISPATCH SENT</div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05 }}>
          Help is coming.<br/>Now check breathing.
        </div>

        <div style={{ marginTop: 16, padding: 14, background: X.GREEN_BG, border: `1px solid ${X.GREEN}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1.5px solid ${X.GREEN}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="phone" size={20} color="#fff" stroke={2.2}/>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: X.GREEN }}>911 — connecting</div>
            <div style={{ fontSize: 11, color: X.GREEN, opacity: 0.85, fontFamily: FONT.mono }}>RINGING · 0:08 · location sent</div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 14, background: X.BLUE_BG, border: `1px solid ${X.BLUE}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: X.BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={20} color="#fff" stroke={2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: X.BLUE }}>3 nearby helpers alerted</div>
            <div style={{ fontSize: 11, color: X.BLUE, opacity: 0.85 }}>Closest 0.3 mi · AED en route</div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: X.RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="map-pin" size={20} color={X.RED} stroke={2.2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>123 Main St · Westwood Plaza</div>
            <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>GPS ±4 m · tap to add floor / room</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38 }}>
        <button onClick={() => router.push('/sos/breathing')} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: 16, background: X.RED, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 800, letterSpacing: 0.4, boxShadow: '0 8px 24px rgba(225,29,46,0.3)' }}>CHECK BREATHING →</button>
      </div>
    </Screen>
  );
}
