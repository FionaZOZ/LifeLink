'use client';
import * as React from 'react';
import { Icon } from './Icon';
import { X, FONT } from './tokens';

type IconName = 'phone' | 'navigation' | 'check' | 'siren' | 'arrow-right';

type Props = {
  label?: string;
  confirmedLabel?: string;
  onConfirm: () => void;
  /** track background when idle */
  trackBg?: string;
  /** fill colour as the thumb travels */
  fillBg?: string;
  /** thumb (draggable circle) bg */
  thumbBg?: string;
  /** colour of icon + label */
  textColor?: string;
  iconName?: IconName;
  height?: number;
};

const THUMB_INSET = 4; // gap between thumb and track edges
const TRIGGER_THRESHOLD = 0.92; // need to drag this far for it to fire

export function SlideToConfirm({
  label = 'Slide to confirm',
  confirmedLabel = 'Confirmed',
  onConfirm,
  trackBg = 'rgba(0,0,0,0.06)',
  fillBg = X.GREEN,
  thumbBg = X.GREEN,
  textColor = X.INK,
  iconName = 'phone',
  height = 60,
}: Props) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = React.useState(0);
  const [drag, setDrag] = React.useState(0); // 0..1
  const [dragging, setDragging] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(false);
  const dragRef = React.useRef(0);
  const startXRef = React.useRef(0);

  const thumbSize = height - THUMB_INSET * 2;
  const maxTravel = Math.max(0, trackW - height);

  // Measure the track so we know how far the thumb can travel.
  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setTrackW(el.getBoundingClientRect().width);
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const setBoth = (v: number) => {
    dragRef.current = v;
    setDrag(v);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (confirmed || maxTravel === 0) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    startXRef.current = e.clientX - dragRef.current * maxTravel;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (confirmed || !dragging) return;
    const px = e.clientX - startXRef.current;
    const pct = Math.max(0, Math.min(1, px / maxTravel));
    setBoth(pct);
  };

  const finish = (e: React.PointerEvent) => {
    if (confirmed) return;
    setDragging(false);
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (dragRef.current >= TRIGGER_THRESHOLD) {
      setBoth(1);
      setConfirmed(true);
      onConfirm();
    } else {
      setBoth(0);
    }
  };

  const thumbX = drag * maxTravel;
  const fillWidth = thumbX + height; // fill stays under and includes the thumb

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative', height, borderRadius: height / 2,
        background: trackBg, overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        userSelect: 'none', touchAction: 'none',
      }}
    >
      {/* fill that grows behind the thumb */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: fillWidth,
        background: fillBg,
        opacity: 0.16 + drag * 0.45,
        transition: dragging ? 'none' : 'width 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 260ms ease-out',
      }}/>

      {/* label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, fontFamily: FONT.body, color: textColor,
        opacity: confirmed ? 1 : Math.max(0, 1 - drag * 1.6),
        transition: dragging ? 'none' : 'opacity 220ms ease-out',
        pointerEvents: 'none', paddingLeft: height + 6, paddingRight: 16, textAlign: 'center',
      }}>
        {confirmed ? confirmedLabel : label}
        {!confirmed && (
          <span aria-hidden style={{ marginLeft: 8, opacity: 0.6, fontFamily: FONT.mono, letterSpacing: 1.2, fontSize: 11 }}>›››</span>
        )}
      </div>

      {/* thumb */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{
          position: 'absolute', top: THUMB_INSET, left: THUMB_INSET,
          width: thumbSize, height: thumbSize,
          borderRadius: thumbSize / 2,
          background: confirmed ? X.GREEN : thumbBg,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `translateX(${thumbX}px)`,
          transition: dragging ? 'none' : 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1), background 200ms linear',
          boxShadow: '0 6px 16px rgba(0,0,0,0.22)',
          touchAction: 'none', userSelect: 'none',
          cursor: confirmed ? 'default' : 'grab',
        }}
      >
        <Icon name={confirmed ? 'check' : iconName} size={22} color="#fff" stroke={2.6}/>
      </div>
    </div>
  );
}
