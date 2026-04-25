'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { X, FONT } from '@/components/lifelink/tokens';

function PhotoCard({ label, sub, src, alt }: { label: string; sub: string; src: string; alt: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ background: X.BG, height: 130, position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.2, color: X.RED, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function CPRTutorialPage() {
  const router = useRouter();
  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      <div style={{ padding: '70px 22px 0' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.4 }}>BEFORE YOU START</div>
        <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.1 }}>
          Place your hands<br/>like this.
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <PhotoCard label="① CENTER OF CHEST" sub="Lower half of breastbone" src="/cpr/hands-position.png" alt="Hands placed on the lower half of the breastbone"/>
          <PhotoCard label="② STACK YOUR HANDS" sub="Heel of one, palm of the other" src="/cpr/hands-posing.png" alt="Stacking the heel of one hand on top of the other"/>
        </div>

        <div style={{ marginTop: 14, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16 }}>
          {[
            ['Lock your elbows.', 'Arms straight, shoulders over hands.'],
            ['Push 2 inches deep.', 'Use your whole body weight.'],
            ['Push at 110 / minute.', 'About twice per second.'],
            ['Let chest fully recoil.', 'Don’t lean between pushes.'],
          ].map(([t, s], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < 3 ? `1px solid ${X.LINE2}` : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: X.RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i+1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38, display: 'flex', gap: 10 }}>
        <button onClick={() => router.push('/sos/cpr/assist')} style={{ all: 'unset', cursor: 'pointer', padding: '14px 18px', border: `1px solid ${X.LINE}`, color: X.INK, borderRadius: 14, fontWeight: 700, fontSize: 13 }}>Skip</button>
        <button onClick={() => router.push('/sos/cpr/assist-hw')} style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 16, background: X.RED, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 800, letterSpacing: 0.4, boxShadow: '0 8px 24px rgba(225,29,46,0.3)' }}>I&apos;M READY · START CPR</button>
      </div>
    </Screen>
  );
}
