'use client';
import * as React from 'react';
import { Icon } from './Icon';
import { X, FONT } from './tokens';
import { useLatestAcceptanceEvent } from './helperFlow';

const DISMISS_THRESHOLD_PX = 28;

export function HelperToast() {
  const { event, dismiss } = useLatestAcceptanceEvent();
  const [shown, setShown] = React.useState(false);
  const [dragY, setDragY] = React.useState(0);
  const draggingRef = React.useRef(false);
  const startYRef = React.useRef(0);

  React.useEffect(() => {
    if (!event) { setShown(false); return; }
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [event]);

  // New event arrives → reset any stale drag offset.
  React.useEffect(() => { setDragY(0); }, [event?.id]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!event) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    startYRef.current = e.clientY;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = e.clientY - startYRef.current;
    // Only allow upward swipe (negative). Add a touch of resistance past zero
    // so a downward overshoot during the gesture doesn't pop the toast lower.
    setDragY(delta < 0 ? delta : delta * 0.2);
  };

  const finish = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (dragY < -DISMISS_THRESHOLD_PX) {
      dismiss();
    } else {
      setDragY(0);
    }
  };

  if (!event) return null;

  // Translate combines the entrance state (-120% off-screen / 0) with the
  // live drag offset (negative px while finger is up). Opacity fades as the
  // user drags further up so it feels like the notification is being thrown.
  const baseY = shown ? 0 : -120;
  const dragOpacityFactor = Math.max(0, 1 - Math.abs(Math.min(0, dragY)) / 80);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      style={{
        position: 'absolute', top: 8, left: 12, right: 12,
        zIndex: 200,
        transform: dragY !== 0
          ? `translateY(calc(${baseY}% + ${dragY}px))`
          : `translateY(${baseY}%)`,
        opacity: shown ? dragOpacityFactor : 0,
        transition: draggingRef.current
          ? 'none'
          : 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms ease-out',
        touchAction: 'none', userSelect: 'none', cursor: 'grab',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'rgba(14,15,18,0.92)', color: '#fff',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.16)', borderRadius: 16,
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        position: 'relative',
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
