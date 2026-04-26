'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { SlideToConfirm } from '@/components/lifelink/SlideToConfirm';
import { X, FONT } from '@/components/lifelink/tokens';
import { markDispatchConfirmed, useDispatchElapsed } from '@/components/lifelink/sosTimer';
import { useHelperFlow } from '@/components/lifelink/helperFlow';
import { RapidSOSCard } from '@/components/lifelink/RapidSOSCard';
import { useT } from '@/components/lifelink/i18n';

export default function DispatchUnconsciousPage() {
  const router = useRouter();
  const { t } = useT();
  const { seconds: dispatchSec, confirmed: dispatched } = useDispatchElapsed();
  const flow = useHelperFlow();

  const alertedCount = flow.alertedCount; // 0 → 3 as time passes
  const acceptedRows = flow.rows.filter(r => (r.state === 'accepted' || r.state === 'arriving' || r.state === 'on_scene') && r.helper.id !== 'ems');
  const closestEnRoute = acceptedRows[0];

  let helpersTitle: string;
  let helpersSub: string;
  if (alertedCount === 0) {
    helpersTitle = t('sos.disp.un.notifying');
    helpersSub = t('sos.disp.un.alertsSending');
  } else if (acceptedRows.length === 0) {
    helpersTitle = alertedCount === 1
      ? t('sos.disp.un.notifiedOne', { n: alertedCount })
      : t('sos.disp.un.notifiedMany', { n: alertedCount });
    helpersSub = t('sos.disp.un.waitingAccept');
  } else if (closestEnRoute) {
    helpersTitle = t('sos.disp.un.onTheWay', {
      name: closestEnRoute.helper.name.split(' ·')[0],
      a: acceptedRows.length,
      n: alertedCount,
    });
    helpersSub = closestEnRoute.rowEtaText === 'ON SCENE'
      ? t('sos.disp.un.onScene')
      : t('sos.disp.un.eta', { time: closestEnRoute.rowEtaText });
  } else {
    helpersSub = ''; helpersTitle = '';
  }

  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      <div className="ll-scroll-hide" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 100,
        overflowY: 'auto',
        padding: '70px 22px 24px',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>
          {dispatched ? t('sos.disp.un.statusSent') : t('sos.disp.un.statusConfirm')}
        </div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          {dispatched ? t('sos.disp.un.titleSent') : t('sos.disp.un.titleConfirm')}
        </div>

        {/* 911 card — pre-dispatch slider, post-dispatch upload-status card */}
        {!dispatched ? (
          <div style={{ marginTop: 16, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: X.GREEN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="phone" size={16} color={X.GREEN} stroke={2.2}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t('sos.disp.un.callBoth')}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{t('sos.disp.un.slideHelp')}</div>
              </div>
            </div>
            <SlideToConfirm
              label={t('sos.disp.un.slideLabel')}
              confirmedLabel={t('sos.disp.un.slideConfirmed')}
              iconName="arrow-right"
              fillBg={X.GREEN}
              thumbBg={X.GREEN}
              onConfirm={() => markDispatchConfirmed()}
            />
          </div>
        ) : (
          (() => {
            // After dispatch the row reads as "uploading payload" for ~2 s, then
            // "sent · live syncing". Pulse-ring stops once the initial push lands.
            const isUploading = dispatchSec < 2;
            return (
              <div style={{ marginTop: 16, padding: 14, background: X.GREEN_BG, border: `1px solid ${X.GREEN}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 44, height: 44 }}>
                  {isUploading && (
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1.5px solid ${X.GREEN}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
                  )}
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={isUploading ? 'arrow-up' : 'check'} size={20} color="#fff" stroke={2.6}/>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: X.GREEN }}>{t('sos.disp.un.connecting')}</div>
                  <div style={{ fontSize: 11, color: X.GREEN, opacity: 0.85, fontFamily: FONT.mono }}>
                    {isUploading ? t('sos.send.status.sending') : t('sos.send.status.sentLive')}
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Helpers card — counts up incrementally as alerts fan out */}
        <div style={{ marginTop: 10, padding: 14, background: X.BLUE_BG, border: `1px solid ${X.BLUE}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, opacity: dispatched ? 1 : 0.45, transition: 'opacity 220ms ease-out' }}>
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            {/* Pulse-ring on the helpers icon while we're still notifying */}
            {dispatched && acceptedRows.length === 0 && (
              <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1.5px solid ${X.BLUE}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
            )}
            <div style={{ width: 44, height: 44, borderRadius: 22, background: X.BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="user" size={20} color="#fff" stroke={2}/>
            </div>
            {dispatched && (
              <div style={{
                position: 'absolute', top: -4, right: -6, minWidth: 20, height: 20,
                padding: '0 5px', borderRadius: 10,
                background: '#fff', color: X.BLUE, fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT.mono, border: `2px solid ${X.BLUE_BG}`,
              }}>{alertedCount}</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: X.BLUE }}>
              {!dispatched ? t('sos.disp.un.waiting') : helpersTitle}
            </div>
            <div style={{ fontSize: 11, color: X.BLUE, opacity: 0.85 }}>
              {!dispatched ? t('sos.disp.un.closest') : helpersSub}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, opacity: dispatched ? 1 : 0.45, transition: 'opacity 220ms ease-out' }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: X.RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="map-pin" size={20} color={X.RED} stroke={2.2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('sos.disp.un.address')}</div>
            <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>{t('sos.disp.un.gps')}</div>
          </div>
        </div>

        {/* RapidSOS data-payload disclosure — what's pushed to dispatch */}
        <div style={{ marginTop: 10, opacity: dispatched ? 1 : 0.45, transition: 'opacity 220ms ease-out' }}>
          <RapidSOSCard/>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38 }}>
        <button
          onClick={() => router.push('/sos/breathing')}
          disabled={!dispatched}
          style={{
            all: 'unset', cursor: dispatched ? 'pointer' : 'not-allowed',
            display: 'block', width: '100%', boxSizing: 'border-box', padding: 16,
            background: dispatched ? X.RED : X.LINE, color: dispatched ? '#fff' : X.INK3,
            borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 800, letterSpacing: 0.4,
            boxShadow: dispatched ? '0 8px 24px rgba(225,29,46,0.3)' : 'none',
            transition: 'background 200ms ease-out, color 200ms ease-out',
          }}
        >
          {dispatched ? t('sos.disp.un.btnNext') : t('sos.disp.un.btnDisabled')}
        </button>
      </div>
    </Screen>
  );
}
