'use client';
import * as React from 'react';
import { useDemoRole, type DemoRole } from './demoRole';
import { useT } from './i18n';
import { X, FONT } from './tokens';

const ROLES: { id: DemoRole; key: string }[] = [
  { id: 'guest',     key: 'demo.role.guest' },
  { id: 'volunteer', key: 'demo.role.volunteer' },
  { id: 'patient',   key: 'demo.role.patient' },
  { id: 'both',      key: 'demo.role.both' },
];

export function RoleSwitcher() {
  const [role, setRole] = useDemoRole();
  const [open, setOpen] = React.useState(false);
  const { t } = useT();

  return (
    <div style={{
      position: 'fixed', bottom: 14, right: 14, zIndex: 1000,
      fontFamily: FONT.body,
    }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: 50, right: 0,
          background: '#fff', border: `1px solid ${X.LINE}`,
          borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          padding: 6, minWidth: 160,
        }}>
          <div style={{ padding: '6px 10px', fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>{t('demo.switchRole')}</div>
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => { setRole(r.id); setOpen(false); }}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'block', width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                background: role === r.id ? X.RED_BG : 'transparent',
                color: role === r.id ? X.RED : X.INK,
              }}
            >
              {role === r.id ? '● ' : '○ '}{t(r.key)}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          all: 'unset', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: '#fff', color: X.INK,
          border: `2px solid ${X.INK}`,
          borderRadius: 999,
          fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.2, fontWeight: 800,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35), 0 0 0 3px rgba(255,255,255,0.4)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: X.GREEN, boxShadow: `0 0 8px ${X.GREEN}` }}/>
        DEMO · {t(`demo.role.${role}`).toUpperCase()}
      </button>
    </div>
  );
}
