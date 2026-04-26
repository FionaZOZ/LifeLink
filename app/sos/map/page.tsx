'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { ScenarioMap, AgentEvent } from '@/components/lifelink/ScenarioMap';
import { ResponderRow } from '@/components/lifelink/Pieces';
import { X, FONT } from '@/components/lifelink/tokens';
import { useHelperFlow } from '@/components/lifelink/helperFlow';
import { useT } from '@/components/lifelink/i18n';

const colorForState = (state: string): string => {
  if (state === 'on_scene') return X.GREEN;
  if (state === 'arriving') return X.AMBER;
  if (state === 'accepted') return X.BLUE;
  return X.INK2;
};

export default function NearbyLivePage() {
  // useSearchParams must be wrapped in Suspense so Next.js 14 can statically
  // prerender the rest of the page; without this the build fails.
  return (
    <React.Suspense fallback={<Screen padTop={0}><EmergencyBanner/></Screen>}>
      <NearbyLiveInner/>
    </React.Suspense>
  );
}

function NearbyLiveInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useT();
  const flow = useHelperFlow();

  // `?from=conscious` means we landed here from the responding-bystander
  // status page. The bottom CTA jumps back to that status; otherwise we keep
  // the original recovery → CPR-guide flow.
  const fromConscious = params?.get('from') === 'conscious';

  // Convert helperFlow state to mock AgentEvents for the ScenarioMap
  const mockEvents = React.useMemo(() => {
    const events: AgentEvent[] = [];
    let timestamp = 0;

    flow.rows.forEach(r => {
      if (r.state !== 'queued') {
        // Add event for each helper that's been activated
        events.push({
          ts: new Date(Date.now() + timestamp * 1000).toISOString(),
          emergency_id: 'simulation',
          agent: r.helper.id,
          capability: 'response',
          phase: r.state === 'on_scene' ? 'result' : r.state === 'accepted' ? 'working' : 'request',
          summary: `${r.helper.name} ${r.state}`,
          data: {},
        });
        timestamp++;
      }
    });

    return events;
  }, [flow.rows]);

  const acceptedCount = flow.acceptedCount;
  const onSceneCount = flow.onSceneCount;
  const enRouteCount = acceptedCount - onSceneCount;
  const totalAlerted = flow.alertedCount + (flow.rows.find(r => r.helper.id === 'ems')?.state !== 'queued' ? 1 : 0);

  const headerSub = t('sos.map.headerSub', { a: acceptedCount, n: totalAlerted || 4 });
  const sheetTagline = onSceneCount > 0
    ? t('sos.map.sheetWithScene', { onScene: onSceneCount, enRoute: enRouteCount })
    : t('sos.map.sheetEnRoute',   { enRoute: enRouteCount });

  return (
    <Screen padTop={0}>
      <EmergencyBanner/>

      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, padding: '8px 18px', background: '#fff', borderBottom: `1px solid ${X.LINE}`, display: 'flex', alignItems: 'center', gap: 12, zIndex: 8 }}>
        <button onClick={() => fromConscious ? router.push('/sos/dispatch/conscious') : router.back()} aria-label={t('common.back')} style={{ all: 'unset', cursor: 'pointer' }}>
          <Icon name="chevron-right" size={20} color={X.INK} stroke={2.4} style={{ transform: 'rotate(180deg)' }}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{t('sos.map.title')}</div>
          <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>{headerSub}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 230 }}>
        <ScenarioMap scenarioId="royce-hall" events={mockEvents}/>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '14px 18px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.08)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: X.LINE, margin: '0 auto 10px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('sos.map.liveResponders')}</div>
          <div style={{ fontSize: 11, color: onSceneCount > 0 ? X.GREEN : X.INK2, fontFamily: FONT.mono, fontWeight: 700 }}>{sheetTagline}</div>
        </div>
        <div style={{ marginTop: 10 }}>
          {flow.rows.map(r => {
            const isArrived = r.state === 'on_scene';
            const muted = r.state === 'queued' || r.state === 'notified';
            const tagText = isArrived ? t('sos.map.onScene') : muted ? r.rowEtaText : `${t('sos.map.etaPrefix')} ${r.rowEtaText}`;
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
          {fromConscious ? (
            <button
              onClick={() => router.push('/sos/dispatch/conscious')}
              style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: 14, background: X.INK, color: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 700 }}
            >{t('sos.map.backToStatus')}</button>
          ) : (
            <button
              onClick={() => router.push('/sos/cpr/assist')}
              style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: 14, background: X.RED, color: '#fff', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 700 }}
            >{t('sos.map.openCpr')}</button>
          )}
        </div>
      </div>
    </Screen>
  );
}
