'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { PatientProfileSheet } from '@/components/lifelink/PatientProfileSheet';
import { PatchBanner } from '@/components/lifelink/PatchBanner';
import { X, FONT } from '@/components/lifelink/tokens';
import { CPR_PROFILE_SHEET_ACKED_KEY, isSosFlowActive } from '@/components/lifelink/sosTimer';
import { useSosSerialCpr } from '@/lib/cpr/SosSerialCprContext';
import { useEffectiveProfile, useProfileRetry } from '@/lib/cpr/patchSerialSession';
import { usePatchProfileSheet } from '@/lib/cpr/usePatchProfileSheet';
import { getSosCprTutorialVoiceLines } from '@/lib/voice/sosNarrationScripts';
import { useElevenLabsScriptedNarration } from '@/lib/voice/useElevenLabsScriptedNarration';
import { useT } from '@/components/lifelink/i18n';

function PhotoCard({ label, sub, src, alt }: { label: string; sub: string; src: string; alt: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ background: X.BG, padding: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}/>
      </div>
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ fontSize: 10, fontFamily: FONT.mono, letterSpacing: 1.2, color: X.RED, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function CPRTutorialPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const cpr = useSosSerialCpr();
  const connected = cpr.isConnected && cpr.isReceiving;
  const effective = useEffectiveProfile(cpr);
  const { open: profileSheetOpen, dismiss: dismissProfileSheet, openManually } = usePatchProfileSheet(
    effective.profile,
    connected,
  );
  const dismissProfile = React.useCallback(() => {
    try {
      window.sessionStorage.setItem(CPR_PROFILE_SHEET_ACKED_KEY, '1');
    } catch {
      /* ignore */
    }
    dismissProfileSheet();
  }, [dismissProfileSheet]);
  useProfileRetry(cpr);
  const tutorialVoiceLines = React.useMemo(() => getSosCprTutorialVoiceLines(lang), [lang]);
  useElevenLabsScriptedNarration('sos-cpr-tutorial', tutorialVoiceLines, isSosFlowActive(), lang);
  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      {/* scrollable body — leave room for patch row + CTAs */}
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 138, overflowY: 'auto', padding: '20px 22px 24px' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.4 }}>{t('cpr.tut.beforeYouStart')}</div>
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            color: X.INK,
            lineHeight: 1.45,
          }}
        >
          {t('cpr.tut.flatSurface')}
        </div>
        <div style={{ marginTop: 12, fontSize: 24, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.1, whiteSpace: 'pre-line' }}>
          {t('cpr.tut.title')}
        </div>

        {/* Stacked, full-width photos so the anatomical detail stays legible */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PhotoCard label={t('cpr.tut.center')} sub={t('cpr.tut.center.sub')} src="/cpr/hands-position.png" alt={t('cpr.tut.center.alt')}/>
          <p style={{ margin: 0, fontSize: 13, color: X.INK2, lineHeight: 1.45, padding: '0 2px' }}>
            {t('cpr.tut.sensorHint')}
          </p>
          <PhotoCard label={t('cpr.tut.stack')}  sub={t('cpr.tut.stack.sub')}  src="/cpr/hands-posing.png"   alt={t('cpr.tut.stack.alt')}/>
        </div>

        <div style={{ marginTop: 14, padding: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16 }}>
          {[
            [t('cpr.tut.tip1.t'), t('cpr.tut.tip1.s')],
            [t('cpr.tut.tip2.t'), t('cpr.tut.tip2.s')],
            [t('cpr.tut.tip3.t'), t('cpr.tut.tip3.s')],
            [t('cpr.tut.tip4.t'), t('cpr.tut.tip4.s')],
          ].map(([title, sub], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < 3 ? `1px solid ${X.LINE2}` : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: X.RED, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i+1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 11, color: X.INK2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 22 }}>
        <PatchBanner
          cpr={cpr}
          connected={connected}
          effectiveProfile={effective.profile}
          isFallbackProfile={effective.isFallback}
          onOpenProfile={openManually}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => router.push('/sos/cpr/assist')} style={{ all: 'unset', cursor: 'pointer', padding: '14px 18px', border: `1px solid ${X.LINE}`, color: X.INK, borderRadius: 14, fontWeight: 700, fontSize: 13 }}>{t('cpr.tut.skip')}</button>
          <button type="button" onClick={() => router.push('/sos/cpr/assist')} style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 16, background: X.RED, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 800, letterSpacing: 0.4, boxShadow: '0 8px 24px rgba(225,29,46,0.3)' }}>{t('cpr.tut.ready')}</button>
        </div>
      </div>
      <PatientProfileSheet
        profile={effective.profile}
        open={profileSheetOpen}
        onDismiss={dismissProfile}
        syncedAt={effective.isFallback ? null : cpr.profileSyncedAt}
        syncError={effective.isFallback ? t('cpr.tut.demoProfileErr') : cpr.profileSyncError}
      />
    </Screen>
  );
}
