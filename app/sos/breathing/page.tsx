'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen, EmergencyBanner } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { isSosFlowActive } from '@/components/lifelink/sosTimer';
import { SOS_BREATHE_LINES } from '@/lib/voice/sosNarrationScripts';
import { useElevenLabsScriptedNarration } from '@/lib/voice/useElevenLabsScriptedNarration';
import { useT } from '@/components/lifelink/i18n';

export default function BreathingPage() {
  const router = useRouter();
  const { t } = useT();
  useElevenLabsScriptedNarration('sos-breathe', SOS_BREATHE_LINES, isSosFlowActive());
  return (
    <Screen bg={X.PAPER} padTop={0}>
      <EmergencyBanner/>

      <div style={{ padding: '70px 22px 0' }}>
        <div aria-hidden="true">
          <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.INK2, letterSpacing: 1.4 }}>{t('sos.breath.step')}</div>
          <div style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.5, lineHeight: 1.05, whiteSpace: 'pre-line' }}>
            {t('sos.breath.title')}
          </div>
        </div>

        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 14 }}>
          <div style={{ background: X.BG, borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <svg viewBox="0 0 220 80" width="100%" height="74">
              <ellipse cx="40" cy="50" rx="18" ry="14" fill="#EFEDE6" stroke={X.LINE}/>
              <path d="M 56 38 L 180 38 Q 200 38 200 50 Q 200 62 180 62 L 56 62 Z" fill="#EFEDE6" stroke={X.LINE}/>
              <circle cx="120" cy="22" r="9" fill="#fff" stroke={X.INK} strokeWidth="1.6"/>
              <line x1="120" y1="30" x2="120" y2="38" stroke={X.INK} strokeWidth="1.6"/>
              <g stroke={X.RED} strokeWidth="1.6" fill="none" strokeLinecap="round">
                <line x1="100" y1="44" x2="100" y2="36"/>
                <polyline points="96,40 100,36 104,40"/>
                <line x1="140" y1="44" x2="140" y2="36"/>
                <polyline points="136,40 140,36 144,40"/>
              </g>
              <text x="160" y="20" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill={X.RED}>10s</text>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('sos.breath.tilt')}</div>
          <div style={{ fontSize: 12, color: X.INK2, marginTop: 4 }}>{t('sos.breath.lookListen')} <strong style={{ color: X.RED }}>{t('sos.breath.notWord')}</strong> {t('sos.breath.notNormal')}</div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('sos.whatYouSee')}</div>
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 38, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => router.push('/sos/recovery')} style={{ all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box', padding: 16, background: '#fff', border: `1.5px solid ${X.LINE}`, borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: X.GREEN_BG, color: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={18} color={X.GREEN} stroke={2.4}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{t('sos.breath.yes')}</div>
              <div style={{ fontSize: 11, color: X.INK2 }}>{t('sos.breath.yesSub')}</div>
            </div>
            <Icon name="chevron-right" size={18} color={X.INK3} stroke={2.4}/>
          </div>
        </button>
        <button onClick={() => router.push('/sos/cpr/tutorial')} style={{ all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box', padding: 16, background: X.RED, color: '#fff', borderRadius: 14, boxShadow: '0 8px 24px rgba(225,29,46,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={20} color="#fff" stroke={2.6}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.2 }}>{t('sos.breath.no')}</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>{t('sos.breath.noSub')}</div>
            </div>
            <Icon name="chevron-right" size={18} color="#fff" stroke={2.4}/>
          </div>
        </button>
      </div>
    </Screen>
  );
}
