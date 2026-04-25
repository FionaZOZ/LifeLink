'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { RadiusMap } from '@/components/lifelink/RadiusMap';
import { X, FONT } from '@/components/lifelink/tokens';

export default function PickupAEDPage() {
  const router = useRouter();
  return (
    <Screen padTop={0}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '50px 18px 12px', background: '#fff', borderBottom: `1px solid ${X.LINE}`, zIndex: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/')} aria-label="Cancel" style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 12, background: X.INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={18} color="#fff" stroke={2.2}/>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1, color: X.RED, fontWeight: 700 }}>● ON THE WAY · STOP 1/2</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Pickup AED · 7-Eleven</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 230 }}>
        <RadiusMap mode="helper"/>
      </div>

      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 28, padding: 16, background: '#fff', borderRadius: 22, boxShadow: '0 14px 40px rgba(0,0,0,0.18)', border: `1px solid ${X.LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono, letterSpacing: 1 }}>NEXT TURN · 40 m</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>Right onto Olympic Blvd</div>
          </div>
          <Icon name="arrow-up" size={28} color={X.RED} stroke={2.6}/>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 12, borderTop: `1px solid ${X.LINE}` }}>
          {[['ETA', '2:43', X.INK], ['DIST', '340m', X.INK], ['OTHERS', '+2', X.BLUE]].map(([l, v, c], i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: X.INK2, fontFamily: FONT.mono }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, color: c as string }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {[['A', X.GREEN, 'Alex · direct'], ['S', X.AMBER, 'Sarah · AED']].map(([i, c, label], idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 4px', background: X.BG, borderRadius: 999, border: `1px solid ${X.LINE}` }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: c as string, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i}</div>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
          <span style={{ fontSize: 10, color: X.INK2, fontFamily: FONT.mono, letterSpacing: 0.6 }}>· tap ☎ to join group call</span>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/sos/cpr/assist')} style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 12, textAlign: 'center', background: X.RED, color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="zap" size={16} color="#fff" stroke={2}/> Skip AED, go direct
          </button>
          <button style={{ all: 'unset', cursor: 'pointer', position: 'relative', width: 44, height: 44, background: X.INK, color: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={18} color="#fff" stroke={2.2}/>
            <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: X.GREEN, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>2</div>
          </button>
        </div>
      </div>
    </Screen>
  );
}
