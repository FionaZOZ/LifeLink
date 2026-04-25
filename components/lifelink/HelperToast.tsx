'use client';
import * as React from 'react';
import { Icon } from './Icon';
import { X, FONT } from './tokens';
import { useLatestAcceptanceEvent } from './helperFlow';

export function HelperToast() {
  const event = useLatestAcceptanceEvent();
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (!event) { setShown(false); return; }
    // Mount in hidden state, then transition to shown next frame so the slide-in animation runs.
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [event]);

  if (!event) return null;

  return (
    <div
      style={{
        position: 'absolute', top: 8, left: 12, right: 12,
        zIndex: 200,
        transform: shown ? 'translateY(0)' : 'translateY(-120%)',
        opacity: shown ? 1 : 0,
        transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease-out',
        pointerEvents: shown ? 'auto' : 'none',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'rgba(14,15,18,0.92)', color: '#fff',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.16)', borderRadius: 16,
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: event.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: `0 0 18px ${event.color}88`,
        }}>
          <Icon name="check" size={18} color="#fff" stroke={3}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, fontFamily: FONT.body, letterSpacing: -0.1 }}>{event.title}</div>
          <div style={{ fontSize: 11, fontFamily: FONT.mono, letterSpacing: 0.4, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{event.sub}</div>
        </div>
        <span style={{ fontSize: 9, fontFamily: FONT.mono, letterSpacing: 1.4, color: X.GREEN, fontWeight: 800 }}>EN ROUTE</span>
      </div>
    </div>
  );
}
