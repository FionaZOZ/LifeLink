'use client';
import * as React from 'react';

type Handlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  // mouse fallback in case pointer events are flaky
  onMouseLeave: () => void;
};

export function useHoldToFire(durationMs: number, onFire: () => void): {
  isHolding: boolean;
  progress: number; // 0..1, animates while holding
  handlers: Handlers;
} {
  const [isHolding, setIsHolding] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const startRef = React.useRef<number>(0);
  const rafRef = React.useRef<number | null>(null);
  const firedRef = React.useRef(false);

  const cancel = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
    firedRef.current = false;
  }, []);

  const tick = React.useCallback(() => {
    const elapsed = performance.now() - startRef.current;
    const p = Math.min(1, elapsed / durationMs);
    setProgress(p);
    if (p >= 1) {
      if (!firedRef.current) {
        firedRef.current = true;
        cancel();
        onFire();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [durationMs, onFire, cancel]);

  const start = React.useCallback((e: React.PointerEvent) => {
    if (firedRef.current) return;
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    setIsHolding(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  React.useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  return {
    isHolding,
    progress,
    handlers: {
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onMouseLeave: cancel,
    },
  };
}
