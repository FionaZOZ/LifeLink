'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import {
  AmbulanceSummaryModal,
  readStoredAmbulanceReport,
  buildMinimalAmbulanceSnapshot,
  type CprAmbulanceSnapshot,
} from '@/components/lifelink/CprSessionArrivals';
import { X, FONT } from '@/components/lifelink/tokens';
import {
  clearSosTimer,
  getSosElapsedNow,
  SOS_COMPLETE_ELAPSED_KEY,
  CPR_SUMMARY_HAD_PATCH_SENSOR_KEY,
  CPR_SUMMARY_IDEAL_BAND_PCT_KEY,
} from '@/components/lifelink/sosTimer';
import { useT } from '@/components/lifelink/i18n';

export default function RecoveryPage() {
  const router = useRouter();
  const { t } = useT();
  const [ambulanceOpen, setAmbulanceOpen] = React.useState(false);
  const [ambulanceSnapshot, setAmbulanceSnapshot] = React.useState<CprAmbulanceSnapshot | null>(null);

  const openAmbulanceReport = React.useCallback(() => {
    const stored = readStoredAmbulanceReport();
    setAmbulanceSnapshot(stored ?? buildMinimalAmbulanceSnapshot(getSosElapsedNow()));
    setAmbulanceOpen(true);
  }, []);

  const endEmergencyFromReport = React.useCallback(() => {
    const sec = getSosElapsedNow();
    const snap = readStoredAmbulanceReport() ?? buildMinimalAmbulanceSnapshot(sec);
    try {
      window.sessionStorage.setItem(SOS_COMPLETE_ELAPSED_KEY, String(Math.max(1, sec)));
      window.sessionStorage.setItem(
        CPR_SUMMARY_HAD_PATCH_SENSOR_KEY,
        snap.sensorCount !== null ? '1' : '0',
      );
      if (
        snap.sensorCount !== null &&
        typeof snap.idealBandPct === 'number' &&
        Number.isFinite(snap.idealBandPct)
      ) {
        window.sessionStorage.setItem(CPR_SUMMARY_IDEAL_BAND_PCT_KEY, String(Math.round(snap.idealBandPct)));
      } else {
        window.sessionStorage.removeItem(CPR_SUMMARY_IDEAL_BAND_PCT_KEY);
      }
    } catch {
      /* ignore */
    }
    setAmbulanceOpen(false);
    setAmbulanceSnapshot(null);
    clearSosTimer();
    router.push('/sos/complete');
  }, [router]);

  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      <div className="ll-scroll-hide" style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 140,
        overflowY: 'auto',
        padding: '70px 22px 24px',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.GREEN, letterSpacing: 1.4, fontWeight: 700 }}>{t('sos.rec.statusLabel')}</div>
        <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          {t('sos.rec.title')}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: X.INK2 }}>{t('sos.rec.body')}</div>

        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 14 }}>
          <div style={{ background: X.BG, borderRadius: 12, padding: 8, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cpr/recovery_position.png"
              alt={t('sos.rec.imageAlt')}
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            {[
              ['1', t('sos.rec.step1')],
              ['2', t('sos.rec.step2')],
              ['3', t('sos.rec.step3')],
              ['4', t('sos.rec.step4')],
            ].map(([n, txt], i, a) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < a.length-1 ? `1px solid ${X.LINE2}` : 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: X.GREEN, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{n}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: X.INK }}>{txt}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 12, background: X.RED_BG, border: `1px solid ${X.RED}33`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="bell" size={18} color={X.RED} stroke={2.2}/>
          <div style={{ fontSize: 12, color: X.RED_DEEP, fontWeight: 600 }}>{t('sos.rec.alert')}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => router.push('/sos/breathing')}
            style={{ all: 'unset', cursor: 'pointer', padding: '14px 18px', border: `1px solid ${X.LINE}`, color: X.INK, borderRadius: 14, fontWeight: 700, fontSize: 13 }}
          >
            {t('sos.rec.recheck')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/sos/map')}
            style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 16, background: X.INK, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 700, letterSpacing: 0.4 }}
          >
            {t('sos.rec.stayMonitor')}
          </button>
        </div>
        <button
          type="button"
          onClick={openAmbulanceReport}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: 14,
            textAlign: 'center',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 0.2,
            background: 'rgba(44,102,232,0.12)',
            border: `1.5px solid ${X.BLUE}`,
            color: X.BLUE,
          }}
        >
          {t('sos.rec.ambulanceArrived')}
        </button>
      </div>

      <AmbulanceSummaryModal
        open={ambulanceOpen}
        snapshot={ambulanceSnapshot}
        onClose={() => {
          setAmbulanceOpen(false);
          setAmbulanceSnapshot(null);
        }}
        onEndEmergency={endEmergencyFromReport}
        dismissLabel={t('sos.rec.stayMonitor')}
      />
    </Screen>
  );
}
