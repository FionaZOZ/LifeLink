'use client';
import * as React from 'react';

const KEY = 'lifelink:sosStartedAt';
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — drop stale timers from previous browser sessions

export function startSosTimer() {
  if (typeof window === 'undefined') return;
  // Don't restart if a fresh timer is already running.
  const existing = window.sessionStorage.getItem(KEY);
  if (existing) {
    const start = Number(existing);
    if (Number.isFinite(start) && Date.now() - start < MAX_AGE_MS) return;
  }
  window.sessionStorage.setItem(KEY, String(Date.now()));
  window.dispatchEvent(new CustomEvent('lifelink:sos-timer'));
}

export function clearSosTimer() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('lifelink:sos-timer'));
}

export function getSosElapsedNow(): number {
  if (typeof window === 'undefined') return 0;
  const v = window.sessionStorage.getItem(KEY);
  if (!v) return 0;
  const start = Number(v);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

/** Live ticking elapsed seconds since the SOS flow started. 0 if not started. */
export function useSosElapsed(): number {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    const tick = () => setSeconds(getSosElapsedNow());
    tick();
    const id = setInterval(tick, 500);
    const onChange = () => tick();
    window.addEventListener('lifelink:sos-timer', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      clearInterval(id);
      window.removeEventListener('lifelink:sos-timer', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return seconds;
}

export function fmtElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
