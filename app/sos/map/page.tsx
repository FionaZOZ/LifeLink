'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { RadiusMap } from '@/components/lifelink/RadiusMap';
import { ResponderRow } from '@/components/lifelink/Pieces';
import { X, FONT } from '@/components/lifelink/tokens';

export default function NearbyLivePage() {
  const router = useRouter();
  return (
    <Screen padTop={0}>
      <EmergencyBanner/>

      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, padding: '8px 18px', background: '#fff', borderBottom: `1px solid ${X.LINE}`, display: 'flex', alignItems: 'center', gap: 12, zIndex: 8 }}>
        <button onClick={() => router.back()} aria-label="Back" style={{ all: 'unset', cursor: 'pointer' }}>
          <Icon name="chevron-right" size={20} color={X.INK} stroke={2.4} style={{ transform: 'rotate(180deg)' }}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Nearby help &amp; AED</div>
          <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>2 mi radius · 3 accepted · 4 AEDs</div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 230 }}>
        <RadiusMap mode="live"/>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '14px 18px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.08)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: X.LINE, margin: '0 auto 10px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Live responders</div>
          <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>3 EN ROUTE</div>
        </div>
        <div style={{ marginTop: 10 }}>
          <ResponderRow name="Alex J." role="0.3 mi · CPR Tier 2" tagText="ETA 1:50" tagColor={X.BLUE}/>
          <ResponderRow name="Sarah C." role="0.5 mi · bringing AED from 7-Eleven" tagText="ETA 3:10" tagColor={X.AMBER}/>
          <ResponderRow name="Jordan P." role="0.8 mi · CPR Tier 1" tagText="ETA 4:00" tagColor={X.INK2} muted/>
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={() => router.push('/sos/cpr/assist-hw')} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: 14, background: X.RED, color: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>Open CPR guide →</button>
        </div>
      </div>
    </Screen>
  );
}
