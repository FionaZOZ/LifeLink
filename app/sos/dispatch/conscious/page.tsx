'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { markDispatchConfirmed, useDispatchElapsed } from '@/components/lifelink/sosTimer';
import { RapidSOSCard } from '@/components/lifelink/RapidSOSCard';
import { useT } from '@/components/lifelink/i18n';

const SYMPTOMS_LOGGED_KEY = 'lifelink:symptomsLoggedCount';

// Distance ramps down from 0.6 mi → 0.1 mi over the first ~25 s as the
// closest helper drives in. Static after that.
function deriveClosestDistance(seconds: number): string {
  if (seconds < 5)  return '0.6 mi';
  if (seconds < 12) return '0.4 mi';
  if (seconds < 20) return '0.3 mi';
  if (seconds < 30) return '0.2 mi';
  return '0.1 mi';
}

// Helpers fan-out: 0 → 1 → 2 → 3 over the first ~10 s.
function deriveAlertedCount(seconds: number): number {
  if (seconds < 2) return 0;
  if (seconds < 5) return 1;
  if (seconds < 9) return 2;
  return 3;
}

export default function DispatchConsciousPage() {
  const router = useRouter();
  const { t } = useT();

  // Reaching this page implies the bystander confirmed dispatch (911 + helpers).
  // Mark dispatch confirmed so the shared dispatch clock starts (or keeps ticking
  // if the user came here from an earlier flow).
  React.useEffect(() => { markDispatchConfirmed(); }, []);

  const { seconds: dispatchSec } = useDispatchElapsed();
  // RapidSOS payload uploads in the first ~2 s; after that the row reads
  // "Sent" and the pulse-ring stops. Live data (GPS, vitals) keeps streaming
  // — that's communicated by the green dots inside the RapidSOS card below.
  const isUploading = dispatchSec < 2;
  const alertedCount = deriveAlertedCount(dispatchSec);
  const closestDist = deriveClosestDistance(dispatchSec);

  // Pick up symptom count after the user logged some on /sos/symptoms.
  const [symptomsLogged, setSymptomsLogged] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = window.sessionStorage.getItem(SYMPTOMS_LOGGED_KEY);
      if (v != null) {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) setSymptomsLogged(n);
      }
    } catch { /* ignore */ }
  }, []);

  // Helpers row only shows pulsing ring while the count is still climbing.
  const helpersStillFanning = alertedCount < 3;

  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 100,
        overflowY: 'auto',
        padding: '70px 22px 24px',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.GREEN, letterSpacing: 1.4, fontWeight: 700 }}>{t('sos.disp.con.statusLabel')}</div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          {t('sos.disp.con.title')}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: X.INK2 }}>{t('sos.disp.con.body')}</div>

        {/* Live status card — 911 ringing → 911 connected, helpers fan-out, address */}
        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, overflow: 'hidden' }}>
          {/* 911 row — arrow-up + pulse while the RapidSOS payload is uploading; check + "Sent" once delivered */}
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${X.LINE2}` }}>
            <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
              {isUploading && (
                <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `1.5px solid ${X.GREEN}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
              )}
              <div style={{ width: 32, height: 32, borderRadius: 16, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={isUploading ? 'arrow-up' : 'check'} size={15} color="#fff" stroke={2.6}/>
              </div>
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{t('sos.disp.con.connecting')}</div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: X.GREEN, fontWeight: 700, letterSpacing: 0.6 }}>
              {isUploading ? t('sos.send.status.sending') : t('sos.send.status.sent')}
            </div>
          </div>

          {/* Helpers row — count animates up; pulsing ring while still fanning out */}
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${X.LINE2}` }}>
            <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
              {helpersStillFanning && (
                <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: `1.5px solid ${X.BLUE}55`, animation: 'll-pulse-ring 1.8s ease-out infinite' }}/>
              )}
              <div style={{ width: 32, height: 32, borderRadius: 16, background: X.BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="user" size={14} color="#fff" stroke={2}/>
              </div>
              <div style={{
                position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18,
                padding: '0 5px', borderRadius: 9,
                background: '#fff', color: X.BLUE, fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT.mono, border: `2px solid ${X.LINE2}`,
              }}>{alertedCount}</div>
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, transition: 'opacity 200ms ease-out' }}>
              {alertedCount === 0
                ? '— alerting nearby helpers'
                : alertedCount === 1
                  ? '1 helper alerted'
                  : `${alertedCount} helpers alerted`}
            </div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: X.BLUE, fontWeight: 700, fontVariantNumeric: 'tabular-nums', opacity: alertedCount === 0 ? 0.4 : 1, transition: 'opacity 200ms ease-out' }}>{closestDist}</div>
          </div>

          {/* Address row — fixed (GPS lock landed before this screen) */}
          <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: X.RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="map-pin" size={14} color={X.RED} stroke={2.2}/>
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{t('sos.disp.con.address')}</div>
            <div style={{ fontSize: 10, fontFamily: FONT.mono, color: X.INK2 }}>±4 m</div>
          </div>
        </div>

        {/* Symptoms-logged confirmation banner — shows once user came back from /sos/symptoms */}
        {symptomsLogged > 0 && (
          <div style={{
            marginTop: 10, padding: '10px 12px',
            background: X.GREEN_BG, border: `1px solid ${X.GREEN}33`, borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="check" size={12} color="#fff" stroke={3}/>
            </div>
            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: X.GREEN }}>
              {t(symptomsLogged === 1 ? 'sos.disp.con.symptomsLogged' : 'sos.disp.con.symptomsLogged.plural', { n: symptomsLogged })}
            </div>
          </div>
        )}

        {/* RapidSOS data-payload disclosure — what's pushed to dispatch */}
        <div style={{ marginTop: 10 }}>
          <RapidSOSCard/>
        </div>

        {/* Live map link — track helpers / AED en route */}
        <button
          onClick={() => router.push('/sos/map?from=conscious')}
          style={{
            all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box',
            marginTop: 10, padding: 12,
            background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: X.BLUE_BG, color: X.BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="map-pin" size={18} color={X.BLUE} stroke={2.2}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: X.INK }}>{t('sos.disp.con.viewMap')}</div>
              <div style={{ fontSize: 11, color: X.INK2 }}>{t('sos.disp.con.viewMap.sub')}</div>
            </div>
            <Icon name="chevron-right" size={18} color={X.INK3} stroke={2}/>
          </div>
        </button>

        <div style={{ marginTop: 14, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('sos.disp.con.whileWait')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 4 }}>
          {[
            ['message', t('sos.disp.con.tip1.title'), t('sos.disp.con.tip1.sub')],
            ['heart',   t('sos.disp.con.tip2.title'), t('sos.disp.con.tip2.sub')],
            ['shield',  t('sos.disp.con.tip3.title'), t('sos.disp.con.tip3.sub')],
            ['bell',    t('sos.disp.con.tip4.title'), t('sos.disp.con.tip4.sub')],
          ].map(([icon, title, sub], i, a) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 10px', borderBottom: i < a.length-1 ? `1px solid ${X.LINE2}` : 'none', alignItems: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={icon as any} size={15} color={X.INK} stroke={2}/>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38, display: 'flex', gap: 10 }}>
        <button onClick={() => router.push('/sos/breathing')} style={{ all: 'unset', cursor: 'pointer', padding: '14px 16px', border: `1.5px solid ${X.RED}`, color: X.RED, borderRadius: 14, fontWeight: 800, fontSize: 12, letterSpacing: 0.3 }}>{t('sos.disp.con.collapsed')}</button>
        <button onClick={() => router.push('/sos/symptoms')} style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 16, background: X.INK, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{t('sos.disp.con.logSymptoms')}</button>
      </div>
    </Screen>
  );
}
