'use client';
import * as React from 'react';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { CPRToolbar, CPRMiniLive } from '@/components/lifelink/CPRShared';
import { X, FONT } from '@/components/lifelink/tokens';

export default function CPRAssistPage() {
  return (
    <Screen bg={X.DARK} padTop={0}>
      <EmergencyBanner/>
      <div style={{ padding: '70px 18px 0', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>● CPR · CYCLE 03</div>
        </div>
        <CPRToolbar metroOn voiceOn helpersInCall={2}/>

        <div style={{ marginTop: 12, position: 'relative', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, border: '1px solid rgba(255,255,255,0.15)' }}/>
          <div style={{ position: 'absolute', width: 230, height: 230, borderRadius: 115, border: '1px solid rgba(255,255,255,0.08)' }}/>
          <div style={{
            width: 158, height: 158, borderRadius: 79, background: X.RED,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'll-cpr-beat 0.545s ease-in-out infinite',
            boxShadow: '0 0 80px rgba(225,29,46,0.5)',
          }}>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, opacity: 0.9 }}>PUSH</div>
            <div style={{ fontSize: 56, fontWeight: 700, fontFamily: FONT.display, lineHeight: 1 }}>110</div>
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>BPM target</div>
          </div>
        </div>

        <div style={{ marginTop: 4, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} style={{ width: 5, height: i === 6 ? 22 : 10, background: i === 6 ? X.RED : 'rgba(255,255,255,0.15)' }}/>
          ))}
        </div>

        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>COMPRESSIONS</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1 }}>28</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.4 }}>RATE</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -1, color: X.GREEN }}>112 <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>BPM</span></div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: X.RED, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="volume" size={14} color="#fff" stroke={2}/>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>&quot;Push harder. Lock your arms.&quot;</div>
          <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.85 }}>0:32</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <CPRMiniLive dark/>
      </div>
    </Screen>
  );
}
