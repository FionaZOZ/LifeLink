'use client';
import * as React from 'react';
import Link from 'next/link';
import { Screen } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import {
  getSosElapsedNow,
  fmtElapsed,
  clearSosTimer,
  SOS_COMPLETE_ELAPSED_KEY,
  CPR_SUMMARY_HAD_PATCH_SENSOR_KEY,
  CPR_SUMMARY_IDEAL_BAND_PCT_KEY,
} from '@/components/lifelink/sosTimer';
import { useT } from '@/components/lifelink/i18n';

// Timeline anchors as fractions of total emergency duration. Real elapsed
// gets multiplied through these so the timeline rescales to whatever
// actually happened (5s vs 5min) without ever ordering them out of sequence.
const TIMELINE_FRACTIONS: { labelKey: string; subKey: string; color: string; frac: number }[] = [
  { labelKey: 'sos.complete.tl1.label', subKey: 'sos.complete.tl1.sub', color: X.INK,   frac: 0.00 },
  { labelKey: 'sos.complete.tl2.label', subKey: 'sos.complete.tl2.sub', color: X.GREEN, frac: 0.18 },
  { labelKey: 'sos.complete.tl3.label', subKey: 'sos.complete.tl3.sub', color: X.RED,   frac: 0.45 },
  { labelKey: 'sos.complete.tl4.label', subKey: 'sos.complete.tl4.sub', color: X.AMBER, frac: 0.72 },
  { labelKey: 'sos.complete.tl5.label', subKey: 'sos.complete.tl5.sub', color: X.GREEN, frac: 1.00 },
];

function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function CompletePage() {
  const { t } = useT();
  // Prefer elapsed captured before `clearSosTimer` (e.g. recovery → End emergency); else live SOS clock.
  const totalSeconds = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const v = window.sessionStorage.getItem(SOS_COMPLETE_ELAPSED_KEY);
        if (v != null) {
          const n = Number(v);
          window.sessionStorage.removeItem(SOS_COMPLETE_ELAPSED_KEY);
          if (Number.isFinite(n) && n > 0) return Math.max(1, n);
        }
      } catch {
        /* ignore */
      }
    }
    return Math.max(30, getSosElapsedNow());
  }, []);

  /** From session after assist/recovery: real % with patch, `'--'` without patch or no depth samples. */
  const [idealBandStat, setIdealBandStat] = React.useState('78%');
  React.useLayoutEffect(() => {
    try {
      const patch = window.sessionStorage.getItem(CPR_SUMMARY_HAD_PATCH_SENSOR_KEY);
      if (patch == null) return;
      window.sessionStorage.removeItem(CPR_SUMMARY_HAD_PATCH_SENSOR_KEY);
      const pctRaw = window.sessionStorage.getItem(CPR_SUMMARY_IDEAL_BAND_PCT_KEY);
      window.sessionStorage.removeItem(CPR_SUMMARY_IDEAL_BAND_PCT_KEY);
      if (patch === '0') {
        setIdealBandStat('--');
        return;
      }
      if (patch === '1') {
        if (pctRaw != null && pctRaw.length > 0) {
          const n = Number(pctRaw);
          if (Number.isFinite(n)) {
            setIdealBandStat(`${Math.min(100, Math.max(0, Math.round(n)))}%`);
            return;
          }
        }
        setIdealBandStat('--');
      }
    } catch {
      /* ignore */
    }
  }, []);

  // CPR duration ≈ 55% of total (between phases 'started CPR' and 'EMS on scene').
  const cprSeconds = Math.max(20, Math.floor(totalSeconds * 0.55));
  const compressionsDelivered = Math.round((cprSeconds / 60) * 110); // 110 bpm target

  return (
    <Screen bg={X.PAPER} padTop={0}>
      {/* Solid green hero band — replaces the red emergency banner */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: X.GREEN, color: '#fff',
        padding: '14px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 10,
      }}>
        <Icon name="check" size={14} color="#fff" stroke={3}/>
        <span style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.6, fontWeight: 700 }}>{t('sos.complete.handedOff', { time: fmtElapsed(totalSeconds) })}</span>
      </div>

      <div style={{ padding: '70px 22px 0', overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 11, fontFamily: FONT.mono, color: X.GREEN, letterSpacing: 1.4, fontWeight: 700 }}>{t('sos.complete.statusLabel')}</div>
        <div style={{ marginTop: 4, fontSize: 28, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.6, lineHeight: 1.05, whiteSpace: 'pre-line' }}>
          {t('sos.complete.title')}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: X.INK2, lineHeight: 1.5 }}>
          {t('sos.complete.body')}
        </div>

        {/* Stats strip */}
        <div style={{ marginTop: 16, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 18, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { k: String(compressionsDelivered), l: t('sos.complete.compressions') },
            { k: idealBandStat, l: t('sos.complete.inIdealBand') },
            { k: fmtClock(cprSeconds), l: t('sos.complete.duration') },
          ].map((s, i) => (
            <div key={i} style={{ borderRight: i < 2 ? `1px solid ${X.LINE2}` : 'none', paddingRight: i < 2 ? 8 : 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, letterSpacing: -0.6, color: X.INK }}>{s.k}</div>
              <div style={{ fontSize: 9, color: X.INK2, fontFamily: FONT.mono, letterSpacing: 1.4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Timeline — anchors scaled against the real elapsed total */}
        <div style={{ marginTop: 14, fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('sos.complete.whatHappened')}</div>
        <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 6 }}>
          {TIMELINE_FRACTIONS.map((step, i, a) => {
            const ts = Math.round(step.frac * totalSeconds);
            return (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 8px', borderBottom: i < a.length-1 ? `1px solid ${X.LINE2}` : 'none', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 44, fontSize: 10, fontFamily: FONT.mono, fontWeight: 700, color: step.color, paddingTop: 2 }}>{fmtClock(ts)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: X.INK }}>{t(step.labelKey)}</div>
                  <div style={{ fontSize: 11, color: X.INK2 }}>{t(step.subKey)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Family / hospital notification cards */}
        <div style={{ marginTop: 14, padding: 12, background: X.GREEN_BG, border: `1px solid ${X.GREEN}33`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: X.GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={16} color="#fff" stroke={3}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: X.GREEN }}>{t('sos.complete.davidNotified')}</div>
            <div style={{ fontSize: 11, color: X.GREEN, opacity: 0.8 }}>{t('sos.complete.davidSub')}</div>
          </div>
        </div>

        <div style={{ marginTop: 8, padding: 12, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: X.BLUE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="cross" size={16} color={X.BLUE} stroke={2}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t('sos.complete.hospital')}</div>
            <div style={{ fontSize: 11, color: X.INK2 }}>{t('sos.complete.hospitalSub')}</div>
          </div>
        </div>

        {/* Soft volunteer prompt */}
        <div style={{ marginTop: 14, padding: 14, background: X.RED_BG, border: `1px dashed ${X.RED}55`, borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.RED, fontWeight: 700 }}>{t('sos.complete.youSaved')}</div>
          <div style={{ marginTop: 6, fontSize: 13, color: X.INK }}>{t('sos.complete.recruit')}</div>
          <Link href="/profile" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 10, padding: '8px 14px', background: X.RED, color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
            {t('sos.complete.becomeVolunteer')}
          </Link>
        </div>

        <div style={{ height: 100 }}/>
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28, display: 'flex', gap: 10 }}>
        <Link href="/" onClick={() => clearSosTimer()} style={{ textDecoration: 'none', flex: 1, padding: 16, background: X.INK, color: '#fff', borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: 800, letterSpacing: 0.4 }}>
          {t('sos.complete.done')}
        </Link>
      </div>
    </Screen>
  );
}
