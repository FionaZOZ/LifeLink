'use client';
import * as React from 'react';
import { Screen, TopBar } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';

export default function PatientContactsPage() {
  return (
    <Screen>
      <TopBar
        title="Emergency contacts"
        leading="back"
        backHref="/profile"
        trailing={<Icon name="plus" size={20} color={X.INK} stroke={2.4}/>}
      />
      <div style={{ padding: '70px 22px 0' }}>
        <div style={{ padding: 14, background: X.RED_BG, border: `1px solid ${X.RED}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: X.RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="heart" size={16} color="#fff" stroke={2.2} fill="#fff"/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: X.RED }}>If you collapse, we&apos;ll call these people</div>
            <div style={{ fontSize: 11, color: X.RED_DEEP }}>in this order, until someone answers.</div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>CALL ORDER</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {[
            { n: 'David Tanaka', r: 'Husband · primary', p: '+1 (555) 014-2233' },
            { n: 'Mei Tanaka', r: 'Daughter', p: '+1 (555) 014-9912' },
            { n: 'Dr. Patel', r: 'Cardiologist', p: '+1 (555) 002-7700' },
          ].map((c, i, a) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderBottom: i < a.length-1 ? `1px solid ${X.LINE}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: X.RED, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.n}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{c.r} · {c.p}</div>
              </div>
              <Icon name="phone" size={18} color={X.GREEN} stroke={2}/>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="shield" size={18} color={X.GREEN} stroke={2}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Share live ECG with cardiologist</div>
            <div style={{ fontSize: 11, color: X.INK2 }}>Only during an active emergency</div>
          </div>
          <div style={{ width: 42, height: 24, borderRadius: 12, background: X.GREEN, position: 'relative' }}>
            <div style={{ position: 'absolute', right: 2, top: 2, width: 20, height: 20, borderRadius: 10, background: '#fff' }}/>
          </div>
        </div>
      </div>
    </Screen>
  );
}
