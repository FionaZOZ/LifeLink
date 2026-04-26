'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { useT } from '@/components/lifelink/i18n';
import { startPhoneRing, stopPhoneRing } from '@/lib/phoneRingSound';

const AUTO_PASS_SECONDS = 8;

export default function CodeRedPage() {
  const router = useRouter();
  const { t } = useT();
  const [secondsLeft, setSecondsLeft] = React.useState(AUTO_PASS_SECONDS);

  // Live countdown. If nobody answers in 8 s, the call auto-passes (volunteer
  // declines by inaction) and we route them home — same destination as the
  // explicit Decline button.
  React.useEffect(() => {
    if (secondsLeft <= 0) {
      stopPhoneRing();
      router.push('/');
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, router]);

  // Phone ringtone for the duration of the prompt. The user-gesture click on
  // IncomingCallTrigger that brought us here is enough to unlock Web Audio.
  React.useEffect(() => {
    void startPhoneRing(0.15);
    return () => { stopPhoneRing(); };
  }, []);

  const handleAccept = () => {
    stopPhoneRing();
    router.push('/helper/pickup-aed');
  };
  const handleDecline = () => {
    stopPhoneRing();
    router.push('/');
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <Screen bg={X.RED} padTop={50}>
      {/* Bleed the page's red bg up into the iPhone safe-area so the Dynamic
          Island sits on red, not on the screen's bg color. */}
      <div style={{
        position: 'absolute',
        top: 'calc(0px - var(--ll-safe-top, 0px))', left: 0, right: 0,
        height: 'var(--ll-safe-top, 0px)',
        background: X.RED, pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 220, left: '50%', width: 360, height: 360, marginLeft: -180, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.18)', animation: 'll-pulse-ring 2s ease-out infinite' }}/>
        <div style={{ position: 'absolute', top: 240, left: '50%', width: 320, height: 320, marginLeft: -160, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', animation: 'll-pulse-ring 2s ease-out infinite 0.6s' }}/>
      </div>

      <div style={{ padding: '0 22px', color: '#fff', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1.4, opacity: 0.9 }}>
          <span className="ll-blink">●</span> {t('helper.cr.case')}
        </div>
        <div style={{ fontSize: 78, fontWeight: 700, marginTop: 8, fontFamily: FONT.display, letterSpacing: -3, lineHeight: 0.95, whiteSpace: 'pre-line' }}>
          {t('helper.cr.title')}
        </div>

        <div style={{ marginTop: 18, padding: 16, background: 'rgba(255,255,255,0.12)', borderRadius: 16, backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontFamily: FONT.mono, letterSpacing: 1 }}>{t('helper.cr.patient')}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{t('helper.cr.patient.name')}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{t('helper.cr.patient.cond')}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            {[
              [t('helper.cr.lbl.distance'), '180 m'],
              [t('helper.cr.lbl.eta'),      '2:10'],
              [t('helper.cr.lbl.aed'),      t('helper.cr.aed.onTheWay')],
            ].map(([l, v], i) => (
              <div key={i}>
                <div style={{ fontSize: 10, opacity: 0.7, fontFamily: FONT.mono }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 38, left: 22, right: 22, display: 'flex', flexDirection: 'column', gap: 10, color: '#fff', zIndex: 10 }}>
        <div style={{ textAlign: 'center', fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: 'rgba(255,255,255,0.9)', fontWeight: 700, marginBottom: 2 }}>
          {t('helper.cr.autopass')} <span style={{ background: 'rgba(0,0,0,0.22)', padding: '2px 8px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</span>
        </div>
        <button onClick={handleAccept} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', background: '#fff', color: X.RED, borderRadius: 999, fontSize: 17, fontWeight: 800, letterSpacing: 0.3, gap: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.22)' }}>
          <Icon name="navigation" size={20} color={X.RED} stroke={2.4}/> {t('helper.cr.accept')}
        </button>
        <button onClick={handleDecline} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 24px', background: 'rgba(0,0,0,0.22)', color: '#fff', borderRadius: 999, fontSize: 14, fontWeight: 700, gap: 8, border: '1px solid rgba(255,255,255,0.35)' }}>
          <Icon name="x" size={16} color="#fff" stroke={2.4}/> {t('helper.cr.decline')}
        </button>
      </div>
    </Screen>
  );
}
