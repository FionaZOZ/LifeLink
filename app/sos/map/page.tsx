'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { RadiusMap, type LiveHelper } from '@/components/lifelink/RadiusMap';
import { ResponderRow } from '@/components/lifelink/Pieces';
import { X, FONT } from '@/components/lifelink/tokens';
import { useHelperFlow } from '@/components/lifelink/helperFlow';

// Map each helperFlow id to its visual marker on the RadiusMap. The startX/Y
// values match the legacy hardcoded pins so the map composition stays the
// same — only the dynamic state (en route → arriving → on scene) is new.
const HELPER_MAP: Record<string, { initial: string; startX: number; startY: number; routePath: string; badge?: string }> = {
  marcus: { initial: 'M', startX: 60,  startY: 380, routePath: 'M 60 380 Q 130 320 195 237' },
  sarah:  { initial: 'S', startX: 340, startY: 350, routePath: 'M 340 350 Q 270 280 195 237', badge: 'AED' },
  jordan: { initial: 'J', startX: 320, startY: 80,  routePath: 'M 320 80 Q 260 130 195 237' },
  ems:    { initial: 'E', startX: 30,  startY: 80,  routePath: 'M 30 80 Q 110 150 195 237' },
};

const colorForState = (state: string): string => {
  if (state === 'on_scene') return X.GREEN;
  if (state === 'arriving') return X.AMBER;
  if (state === 'accepted') return X.BLUE;
  return X.INK2;
};

export default function NearbyLivePage() {
  const router = useRouter();
  const flow = useHelperFlow();

  const liveHelpers: LiveHelper[] = flow.rows
    .map(r => {
      const meta = HELPER_MAP[r.helper.id];
      if (!meta) return null;
      return {
        id: r.helper.id,
        initial: meta.initial,
        startX: meta.startX,
        startY: meta.startY,
        color: r.helper.color,
        state: r.state,
        etaText: r.rowEtaText,
        badge: meta.badge,
        routePath: meta.routePath,
      } as LiveHelper;
    })
    .filter((h): h is LiveHelper => h !== null);

  const acceptedCount = flow.acceptedCount;
  const onSceneCount = flow.onSceneCount;
  const enRouteCount = acceptedCount - onSceneCount;
  const totalAlerted = flow.alertedCount + (flow.rows.find(r => r.helper.id === 'ems')?.state !== 'queued' ? 1 : 0);

  const headerSub = `2 mi radius · ${acceptedCount} of ${totalAlerted || 4} accepted · 4 AEDs`;
  const sheetTagline = onSceneCount > 0
    ? `${onSceneCount} ON SCENE · ${enRouteCount} EN ROUTE`
    : `${enRouteCount} EN ROUTE`;

  return (
    <Screen padTop={0}>
      <EmergencyBanner/>

      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, padding: '8px 18px', background: '#fff', borderBottom: `1px solid ${X.LINE}`, display: 'flex', alignItems: 'center', gap: 12, zIndex: 8 }}>
        <button onClick={() => router.back()} aria-label="Back" style={{ all: 'unset', cursor: 'pointer' }}>
          <Icon name="chevron-right" size={20} color={X.INK} stroke={2.4} style={{ transform: 'rotate(180deg)' }}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Nearby help &amp; AED</div>
          <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>{headerSub}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 230 }}>
        <RadiusMap mode="live" helpers={liveHelpers}/>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '14px 18px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.08)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: X.LINE, margin: '0 auto 10px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Live responders</div>
          <div style={{ fontSize: 11, color: onSceneCount > 0 ? X.GREEN : X.INK2, fontFamily: FONT.mono, fontWeight: 700 }}>{sheetTagline}</div>
        </div>
        <div style={{ marginTop: 10 }}>
          {flow.rows.map(r => {
            const isArrived = r.state === 'on_scene';
            const muted = r.state === 'queued' || r.state === 'notified';
            const tagText = isArrived ? 'ON SCENE' : muted ? r.rowEtaText : `ETA ${r.rowEtaText}`;
            return (
              <ResponderRow
                key={r.helper.id}
                name={r.helper.name}
                role={`${r.helper.role} · ${r.rowStatusText}`}
                tagText={tagText}
                tagColor={isArrived ? X.GREEN : colorForState(r.state)}
                muted={muted}
              />
            );
          })}
        </div>
        <div style={{ marginTop: 10 }}>
          <button onClick={() => router.push('/sos/cpr/assist')} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: 14, background: X.RED, color: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>Open CPR guide →</button>
        </div>
      </div>
    </Screen>
  );
}
