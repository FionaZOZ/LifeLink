'use client';
import * as React from 'react';
import { Screen, TopBar } from '@/components/lifelink/Screen';
import { Icon } from '@/components/lifelink/Icon';
import { X, FONT } from '@/components/lifelink/tokens';
import { AppleWatchCard } from '@/components/lifelink/AppleWatchCard';
import { useAppleWatch } from '@/lib/useAppleWatch';
import { useT } from '@/components/lifelink/i18n';

export default function PatientHardwarePage() {
  const { t } = useT();
  // Pull the watch state for the metadata strip's "Apple Watch battery" row.
  // Both this hook call and the AppleWatchCard above share state via the
  // module-level singleton in lib/useAppleWatch.ts, so the battery here
  // reflects the live connection without any prop drilling.
  const aw = useAppleWatch();
  const watchBattery = aw.battery != null
    ? `${aw.battery}%`
    : t('pat.hw.row.watchBatt.notConnected');
  const watchBatteryColor = aw.battery == null
    ? X.INK3
    : aw.battery >= 30 ? X.GREEN
    : aw.battery >= 15 ? X.AMBER
    : X.RED;

  return (
    <Screen>
      <TopBar title={t('pat.hw.title')} leading="back" backHref="/profile"/>
      <div style={{ padding: '8px 22px 24px', overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>

        {/* ── Heart beat (Apple Watch) ───────────────────────────────── */}
        <SectionLabel>{t('pat.hw.heartBeat')}</SectionLabel>
        <div style={{ marginTop: 8 }}>
          <AppleWatchCard variant="hardware"/>
        </div>

        {/* ── YOUR Patch — CPR device, separate from the watch ──── */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel>{t('pat.hw.patchHeader')}</SectionLabel>
          <div style={{ marginTop: 8, fontSize: 12, color: X.INK2, lineHeight: 1.4 }}>
            {t('pat.hw.patchBody')}
          </div>
        </div>

        {/* Where to stick it — kept as-is, this is patch placement guidance */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('pat.hw.where')}</div>
          <div style={{ marginTop: 8, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, padding: 12, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 110, height: 130, background: X.BG, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
              <svg viewBox="0 0 110 130" width="100%" height="100%">
                <path d="M 30 10 Q 30 0 50 0 L 60 0 Q 80 0 80 10 L 88 80 Q 88 120 65 130 L 45 130 Q 22 120 22 80 Z" fill="#EFEDE6" stroke={X.LINE}/>
                <rect x="36" y="48" width="22" height="28" rx="4" fill={X.RED} stroke="#fff" strokeWidth="1.5"/>
                <circle cx="47" cy="62" r="2.5" fill="#fff"/>
                <line x1="64" y1="62" x2="92" y2="62" stroke={X.RED} strokeWidth="1.5"/>
                <text x="92" y="60" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={X.RED} fontWeight="700">HERE</text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{t('pat.hw.where.location')}</div>
              <div style={{ fontSize: 11, color: X.INK2, marginTop: 2 }}>{t('pat.hw.where.body')}</div>
              <div style={{ marginTop: 8, fontSize: 11, color: X.BLUE, fontWeight: 700, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <Icon name="message" size={14} color={X.BLUE} stroke={2}/> {t('pat.hw.where.video')}
              </div>
            </div>
          </div>
        </div>

        {/* Device-status strip. The four rows are mixed-source on purpose:
              · Last usage          → patch (when CPR was last assisted)
              · Apple Watch battery → live, from the BLE Battery Service
              · Adhesive / Firmware → patch consumables/updates
            That's the spec the patient flow asked for. */}
        <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${X.LINE}`, borderRadius: 16, overflow: 'hidden' }}>
          {([
            { label: t('pat.hw.row.lastUsage'),  value: t('pat.hw.row.lastUsage.val'), color: X.GREEN },
            { label: t('pat.hw.row.watchBatt'),  value: watchBattery,                  color: watchBatteryColor },
            { label: t('pat.hw.row.adhesive'),   value: t('pat.hw.row.adhesive.val'),  color: X.AMBER },
            { label: t('pat.hw.row.firmware'),   value: t('pat.hw.row.firmware.val'),  color: X.GREEN },
          ] as const).map((row, i, a) => (
            <div key={row.label} style={{
              padding: 14, display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: i < a.length - 1 ? `1px solid ${X.LINE2}` : 'none',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: row.color }}/>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{row.label}</div>
              <div style={{ fontSize: 12, color: X.INK2 }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2, fontWeight: 700 }}>
      {children}
    </div>
  );
}
