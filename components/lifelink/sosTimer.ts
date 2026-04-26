'use client';
import * as React from 'react';
import { stopElevenLabsPlayback } from '@/lib/voice/playElevenLabsLine';

const KEY = 'lifelink:sosStartedAt';
const DISPATCH_KEY = 'lifelink:dispatchConfirmedAt';
/** Last CPR assist “Ambulance arrived” snapshot for recovery / handoff flows. */
export const LAST_AMBULANCE_REPORT_KEY = 'lifelink:lastAmbulanceReport';
/** Captured SOS elapsed seconds before `clearSosTimer` so `/sos/complete` can still show duration. */
export const SOS_COMPLETE_ELAPSED_KEY = 'lifelink:sosCompleteElapsed';
/** Set when the user dismisses the patch profile sheet (e.g. on tutorial); CPR assist skips auto-open. */
export const CPR_PROFILE_SHEET_ACKED_KEY = 'lifelink:cprProfileSheetAcked';
/** `'1'` = patch supplied sensor counts during CPR; `'0'` = phone-only. Cleared in `startSosTimer` or after read on `/sos/complete`; not cleared in `clearSosTimer`. */
export const CPR_SUMMARY_HAD_PATCH_SENSOR_KEY = 'lifelink:cprSummaryHadPatchSensor';
/** Integer 0–100: % of patch depth samples in ideal band during CPR assist; consumed on `/sos/complete`. */
export const CPR_SUMMARY_IDEAL_BAND_PCT_KEY = 'lifelink:cprSummaryIdealBandPct';
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — drop stale timers from previous browser sessions

export function startSosTimer() {
  if (typeof window === 'undefined') return;
  // Don't restart if a fresh timer is already running.
  const existing = window.sessionStorage.getItem(KEY);
  if (existing) {
    const start = Number(existing);
    if (Number.isFinite(start) && Date.now() - start < MAX_AGE_MS) return;
  }
  try {
    window.sessionStorage.removeItem(LAST_AMBULANCE_REPORT_KEY);
    window.sessionStorage.removeItem(CPR_PROFILE_SHEET_ACKED_KEY);
    window.sessionStorage.removeItem(CPR_SUMMARY_HAD_PATCH_SENSOR_KEY);
    window.sessionStorage.removeItem(CPR_SUMMARY_IDEAL_BAND_PCT_KEY);
  } catch {
    /* ignore */
  }
  window.sessionStorage.setItem(KEY, String(Date.now()));
  window.dispatchEvent(new CustomEvent('lifelink:sos-timer'));
}

export function clearSosTimer() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(KEY);
  window.sessionStorage.removeItem(DISPATCH_KEY);
  try {
    window.sessionStorage.removeItem(LAST_AMBULANCE_REPORT_KEY);
    window.sessionStorage.removeItem(CPR_PROFILE_SHEET_ACKED_KEY);
    // Intentionally keep CPR_SUMMARY_HAD_PATCH_SENSOR_KEY — set just before clear for `/sos/complete`; consumed there.
  } catch {
    /* ignore */
  }
  stopElevenLabsPlayback();
  window.dispatchEvent(new CustomEvent('lifelink:sos-timer'));
}

/** True when the user is inside an active SOS window (e.g. after hold-to-emergency → /sos). */
export function isSosFlowActive(): boolean {
  if (typeof window === 'undefined') return false;
  const v = window.sessionStorage.getItem(KEY);
  if (!v) return false;
  const start = Number(v);
  if (!Number.isFinite(start)) return false;
  return Date.now() - start < MAX_AGE_MS;
}

export function markDispatchConfirmed() {
  if (typeof window === 'undefined') return;
  const existing = window.sessionStorage.getItem(DISPATCH_KEY);
  if (existing) {
    const v = Number(existing);
    if (Number.isFinite(v) && Date.now() - v < MAX_AGE_MS) return;
  }
  window.sessionStorage.setItem(DISPATCH_KEY, String(Date.now()));
  window.dispatchEvent(new CustomEvent('lifelink:sos-timer'));
}

export function getDispatchElapsedNow(): number {
  if (typeof window === 'undefined') return 0;
  const v = window.sessionStorage.getItem(DISPATCH_KEY);
  if (!v) return 0;
  const start = Number(v);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function isDispatchConfirmed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(DISPATCH_KEY) != null;
}

/** Live ticking elapsed seconds since 911 dispatch was confirmed. 0 if not confirmed. */
export function useDispatchElapsed(): { seconds: number; confirmed: boolean } {
  const [state, setState] = React.useState<{ seconds: number; confirmed: boolean }>({ seconds: 0, confirmed: false });

  React.useEffect(() => {
    const tick = () => setState({ seconds: getDispatchElapsedNow(), confirmed: isDispatchConfirmed() });
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

  return state;
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
