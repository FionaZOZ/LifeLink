'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';

export default function DispatchConsciousPage() {
  const router = useRouter();
  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner time="00:00:42"/>

      <div style={{ padding: '70px 22px 0' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.GREEN, letterSpacing: 1.4, fontWeight: 700 }}>● RESPONDING · STAY WITH THEM</div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05 }}>
          Help is still<br/>on its way.
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: X.INK2 }}>A response doesn&apos;t mean they&apos;re safe. EMS is coming — keep them awake and gather info.</div>

        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${X.LINE2}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="phone" size={14} color="#fff" stroke={2.2}/></div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>911 — connecting</div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: X.GREEN, fontWeight: 700 }}>0:08</div>
          </div>
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${X.LINE2}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: X.BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="user" size={14} color="#fff" stroke={2}/></div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>3 helpers alerted</div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: X.BLUE, fontWeight: 700 }}>0.3 mi</div>
          </div>
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: X.RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="map-pin" size={14} color={X.RED} stroke={2.2}/></div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>123 Main St · Westwood</div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: X.INK2 }}>±4 m</div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>WHILE YOU WAIT</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 4 }}>
          {[
            ['message', 'Keep them talking.', 'Ask their name. Ask what happened.'],
            ['heart', 'Note any symptoms.', 'Chest pain · numbness · slurred speech.'],
            ['shield', 'Don’t move them.', 'Unless they’re in immediate danger.'],
            ['bell', 'Watch for changes.', 'If they go unresponsive again, tap below.'],
          ].map(([icon, t, s], i, a) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 10px', borderBottom: i < a.length-1 ? `1px solid ${X.LINE2}` : 'none', alignItems: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={icon as any} size={15} color={X.INK} stroke={2}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38, display: 'flex', gap: 10 }}>
        <button onClick={() => router.push('/sos/breathing')} style={{ all: 'unset', cursor: 'pointer', padding: '14px 16px', border: `1.5px solid ${X.RED}`, color: X.RED, borderRadius: 14, fontWeight: 800, fontSize: 12, letterSpacing: 0.3 }}>THEY COLLAPSED</button>
        <button style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 16, background: X.INK, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>Log symptoms for EMS →</button>
      </div>
    </Screen>
  );
}
