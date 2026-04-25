'use client';
import * as React from 'react';
import { useDemoRole, type DemoRole } from './demoRole';
import { X, FONT } from './tokens';

const ROLES: { id: DemoRole; label: string }[] = [
  { id: 'guest', label: 'Guest' },
  { id: 'volunteer', label: 'Volunteer' },
  { id: 'patient', label: 'Patient' },
  { id: 'both', label: 'Both' },
];

export function RoleSwitcher() {
  const [role, setRole] = useDemoRole();
  const [open, setOpen] = React.useState(false);

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
          <div style={{ padding: '6px 10px', fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.INK2 }}>DEMO · SWITCH ROLE</div>
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
              {role === r.id ? '● ' : '○ '}{r.label}
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
          background: X.INK, color: '#fff',
          borderRadius: 999,
          fontSize: 11, fontFamily: FONT.mono, letterSpacing: 1.2, fontWeight: 700,
          boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 3, background: X.GREEN }}/>
        DEMO · {role.toUpperCase()}
      </button>
    </div>
  );
}
