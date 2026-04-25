'use client';
import * as React from 'react';
import { Screen, TopBar } from '@/components/lifelink/Screen';
import { Icon, ECGLine } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';

export default function PatientHardwarePage() {
  return (
    <Screen>
      <TopBar title="LifeLink Patch" leading="back" backHref="/profile"/>
      <div style={{ padding: '70px 22px 24px', overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ background: X.INK, color: '#fff', borderRadius: 18, padding: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4 }}>
            <span style={{ color: X.GREEN }}>● CONNECTED · v2.1</span>
            <span style={{ opacity: 0.6 }}>SR 200Hz</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.4 }}>Eleanor&apos;s Patch</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Worn — left chest · since 06:42</div>

          <div style={{ marginTop: 12, color: X.RED }}>
            <ECGLine width={300} height={50} color={X.RED} stroke={1.6}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 8 }}>
            {[
              { l: 'HR', v: '72', u: 'bpm' },
              { l: 'BATT', v: '88', u: '%' },
              { l: 'SIGNAL', v: '4/4', u: 'bars' },
            ].map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 9, fontFamily: FONT.mono, opacity: 0.6, letterSpacing: 1.4 }}>{m.l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5 }}>{m.v}</div>
                <div style={{ fontSize: 10, fontFamily: FONT.mono, opacity: 0.6 }}>{m.u}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>WHERE TO STICK IT</div>
          <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 110, height: 130, background: X.BG, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
              <svg viewBox="0 0 110 130" width="100%" height="100%">
                <path d="M 30 10 Q 30 0 50 0 L 60 0 Q 80 0 80 10 L 88 80 Q 88 120 65 130 L 45 130 Q 22 120 22 80 Z" fill="#EFEDE6" stroke={X.LINE}/>
                <rect x="36" y="48" width="22" height="28" rx="4" fill={X.RED} stroke="#fff" strokeWidth="1.5"/>
                <circle cx="47" cy="62" r="2.5" fill="#fff"/>
                <line x1="64" y1="62" x2="92" y2="62" stroke={X.RED} strokeWidth="1.5"/>
                <text x="92" y="60" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={X.RED} fontWeight="700">HERE</text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Lower-left chest</div>
              <div style={{ fontSize: 11, color: X.INK2, marginTop: 2 }}>Below the breast, slightly toward the side. Skin must be clean &amp; dry.</div>
              <div style={{ marginTop: 8, fontSize: 11, color: X.BLUE, fontWeight: 700, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <Icon name="message" size={14} color={X.BLUE} stroke={2}/> Watch 30s video
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            ['Last reading', '74 BPM · 30s ago', X.GREEN],
            ['Charge cycles', '142 / 500', X.AMBER],
            ['Adhesive', 'Replace in 4 days', X.AMBER],
            ['Firmware', 'Up to date', X.GREEN],
          ].map(([l, v, c], i, a) => (
            <div key={i} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < a.length-1 ? `1px solid ${X.LINE2}` : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: c as string }}/>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{l}</div>
              <div style={{ fontSize: 12, color: X.INK2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}
