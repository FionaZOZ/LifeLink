'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Screen } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { RadiusMap } from '@/components/lifelink/RadiusMap';
import { openCall } from '@/components/lifelink/callState';
import { X, FONT } from '@/components/lifelink/tokens';
import { useT } from '@/components/lifelink/i18n';

export default function DirectToPatientPage() {
  const router = useRouter();
  const { t } = useT();
  return (
    <Screen padTop={0}>
      <div style={{ position: 'absolute', top: 'calc(0px - var(--ll-safe-top, 0px))', left: 0, right: 0, padding: 'calc(14px + var(--ll-safe-top, 36px)) 18px 12px', background: '#fff', borderBottom: `1px solid ${X.LINE}`, zIndex: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/helper/pickup-aed')} aria-label={t('common.back')} style={{ all: 'unset', cursor: 'pointer', width: 36, height: 36, borderRadius: 12, background: X.INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-right" size={20} color="#fff" stroke={2.4} style={{ transform: 'rotate(180deg)' }}/>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1, color: X.RED, fontWeight: 700 }}>{t('helper.dir.status')}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t('helper.dir.title')}</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 230 }}>
        <RadiusMap mode="helper"/>
      </div>

      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 28, padding: 16, background: '#fff', borderRadius: 22, boxShadow: '0 14px 40px rgba(0,0,0,0.18)', border: `1px solid ${X.LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: X.INK2, fontFamily: FONT.mono, letterSpacing: 1 }}>{t('helper.dir.nextTurn')}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{t('helper.dir.turnInst')}</div>
          </div>
          <Icon name="arrow-up" size={28} color={X.RED} stroke={2.6} style={{ transform: 'rotate(-30deg)' }}/>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 12, borderTop: `1px solid ${X.LINE}` }}>
          {[
            [t('helper.pa.lbl.eta'),    '1:50', X.RED],
            [t('helper.pa.lbl.dist'),   '220m', X.INK],
            [t('helper.pa.lbl.others'), '+2',   X.BLUE],
          ].map(([l, v, c], i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: X.INK2, fontFamily: FONT.mono }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: FONT.display, color: c as string }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            ['A', X.GREEN, t('helper.pa.chip.alex')],
            ['S', X.AMBER, t('helper.pa.chip.sarah')],
          ].map(([i, c, label], idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 4px', background: X.BG, borderRadius: 999, border: `1px solid ${X.LINE}` }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: c as string, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i}</div>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
          <span style={{ fontSize: 10, color: X.INK2, fontFamily: FONT.mono, letterSpacing: 0.6 }}>{t('helper.dir.callHint')}</span>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/sos/cpr/assist')} style={{ all: 'unset', cursor: 'pointer', flex: 1, padding: 12, textAlign: 'center', background: X.RED, color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="check" size={16} color="#fff" stroke={2.4}/> {t('helper.dir.arrived')}
          </button>
          <button onClick={openCall} aria-label={t('call.aria.minimize')} style={{ all: 'unset', cursor: 'pointer', position: 'relative', width: 44, height: 44, background: X.INK, color: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={18} color="#fff" stroke={2.2}/>
            <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: X.GREEN, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>2</div>
          </button>
        </div>
      </div>
    </Screen>
  );
}
