'use client';
import * as React from 'react';
import { Icon } from './Icon';
import { X, FONT } from './tokens';
import { useT } from './i18n';

type IconName = 'map-pin' | 'heart' | 'phone' | 'message' | 'activity';

const ROWS: { icon: IconName; key: string; live?: boolean }[] = [
  { icon: 'map-pin',  key: 'sos.rapidsos.item.location', live: true },
  { icon: 'heart',    key: 'sos.rapidsos.item.medical' },
  { icon: 'phone',    key: 'sos.rapidsos.item.contacts' },
  { icon: 'message',  key: 'sos.rapidsos.item.symptoms' },
  { icon: 'activity', key: 'sos.rapidsos.item.vitals',   live: true },
];

/**
 * Disclosure card explaining what data the app pushes to PSAP dispatch via the
 * RapidSOS API. Renders as a flat card and is meant to sit just below the live
 * status block on dispatch screens. Items with `live: true` get a small green
 * dot to signal that data is streaming in real time, not just snapshotted.
 */
export function RapidSOSCard() {
  const { t } = useT();
  return (
    <div style={{
      padding: 14,
      background: '#fff',
      border: `1px solid ${X.LINE}`,
      borderRadius: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, fontWeight: 800,
          padding: '3px 7px', borderRadius: 4,
          background: X.GREEN, color: '#fff',
        }}>{t('sos.rapidsos.tag')}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: X.INK }}>{t('sos.rapidsos.title')}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: X.INK2, lineHeight: 1.5 }}>
        {t('sos.rapidsos.intro')}
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ROWS.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 8,
              background: X.BG, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name={r.icon} size={13} color={X.INK} stroke={2}/>
            </div>
            <div style={{ flex: 1, fontSize: 12, color: X.INK, fontWeight: 600 }}>
              {t(r.key)}
            </div>
            {r.live && (
              <span
                className="ll-pulse-dot"
                aria-label="live"
                style={{ width: 6, height: 6, borderRadius: 3, background: X.GREEN, boxShadow: `0 0 6px ${X.GREEN}` }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
