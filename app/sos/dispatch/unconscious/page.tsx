'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { SlideToConfirm } from '@/components/lifelink/SlideToConfirm';
import { X, FONT } from '@/components/lifelink/tokens';
import { markDispatchConfirmed, useDispatchElapsed } from '@/components/lifelink/sosTimer';
import { useHelperFlow } from '@/components/lifelink/helperFlow';

export default function DispatchUnconsciousPage() {
  const router = useRouter();
  const { seconds: dispatchSec, confirmed: dispatched } = useDispatchElapsed();
  const flow = useHelperFlow();

  const ringText = `${Math.floor(dispatchSec / 60)}:${String(dispatchSec % 60).padStart(2, '0')}`;
  const alertedCount = flow.alertedCount; // 0 → 3 as time passes
  const acceptedRows = flow.rows.filter(r => (r.state === 'accepted' || r.state === 'arriving' || r.state === 'on_scene') && r.helper.id !== 'ems');
  const closestEnRoute = acceptedRows[0];

  let helpersTitle: string;
  let helpersSub: string;
  if (alertedCount === 0) {
    helpersTitle = 'Notifying nearby helpers…';
    helpersSub = 'Sending alerts within 2 mi';
  } else if (acceptedRows.length === 0) {
    helpersTitle = `${alertedCount} ${alertedCount === 1 ? 'helper' : 'helpers'} notified`;
    helpersSub = 'Waiting for accept';
  } else if (closestEnRoute) {
    helpersTitle = `${closestEnRoute.helper.name.split(' ·')[0]} en route · ${acceptedRows.length} of ${alertedCount} accepted`;
    helpersSub = closestEnRoute.rowEtaText === 'ON SCENE' ? 'on scene' : `ETA ${closestEnRoute.rowEtaText} · AED en route`;
  } else {
    helpersSub = ''; helpersTitle = '';
  }

  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      <div style={{ padding: '70px 22px 0' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.RED, letterSpacing: 1.4, fontWeight: 700 }}>
          {dispatched ? '● UNRESPONSIVE · DISPATCH SENT' : '● UNRESPONSIVE · CONFIRM TO DISPATCH'}
        </div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05 }}>
          {dispatched ? <>Help is coming.<br/>Now check breathing.</> : <>Slide to call 911<br/>and dispatch helpers.</>}
        </div>

        {/* 911 card — pre-dispatch slider, post-dispatch ringing card */}
        {!dispatched ? (
          <div style={{ marginTop: 16, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: X.GREEN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="phone" size={16} color={X.GREEN} stroke={2.2}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Call 911 + alert helpers</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>Slide the handle right to dispatch — release to cancel.</div>
              </div>
            </div>
            <SlideToConfirm
              label="Slide to call 911"
              confirmedLabel="911 dispatched"
              iconName="phone"
              fillBg={X.GREEN}
              thumbBg={X.GREEN}
              onConfirm={() => markDispatchConfirmed()}
            />
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 14, background: X.GREEN_BG, border: `1px solid ${X.GREEN}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', width: 44, height: 44 }}>
              <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1.5px solid ${X.GREEN}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="phone" size={20} color="#fff" stroke={2.2}/>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: X.GREEN }}>911 — connecting</div>
              <div style={{ fontSize: 11, color: X.GREEN, opacity: 0.85, fontFamily: FONT.mono }}>RINGING · {ringText} · location sent</div>
            </div>
          </div>
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
              {!dispatched ? '3 nearby helpers waiting' : helpersTitle}
            </div>
            <div style={{ fontSize: 11, color: X.BLUE, opacity: 0.85 }}>
              {!dispatched ? 'Closest 0.3 mi · AED en route' : helpersSub}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, opacity: dispatched ? 1 : 0.45, transition: 'opacity 220ms ease-out' }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: X.RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="map-pin" size={20} color={X.RED} stroke={2.2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>123 Main St · Westwood Plaza</div>
            <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono }}>GPS ±4 m · tap to add floor / room</div>
          </div>
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
          {dispatched ? 'CHECK BREATHING →' : 'CALL 911 FIRST'}
        </button>
      </div>
    </Screen>
  );
}
