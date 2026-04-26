'use client';
import * as React from 'react';

export type CallMode = 'closed' | 'fullscreen' | 'minimizing' | 'minimized';
export type TuckedSide = 'left' | 'right' | null;

export type CallState = {
  mode: CallMode;
  startedAt: number;       // ms timestamp; 0 when closed
  pos: { x: number; y: number };
  tucked: TuckedSide;
};

const DEFAULT_POS = { x: 320, y: 220 };
const SHRINK_MS = 280;

let state: CallState = {
  mode: 'closed', startedAt: 0, pos: DEFAULT_POS, tucked: null,
};
const listeners = new Set<() => void>();

function emit() { for (const l of listeners) l(); }

export function getCallState(): CallState { return state; }

export function openCall() {
  state = { mode: 'fullscreen', startedAt: Date.now(), pos: state.pos, tucked: state.tucked };
  emit();
}

export function minimizeCall() {
  if (state.mode === 'closed' || state.mode === 'minimized' || state.mode === 'minimizing') return;
  state = { ...state, mode: 'minimizing' };
  emit();
  setTimeout(() => {
    if (state.mode === 'minimizing') {
      state = { ...state, mode: 'minimized' };
      emit();
    }
  }, SHRINK_MS);
}

export function expandCall() {
  if (state.mode === 'closed') return;
  state = { ...state, mode: 'fullscreen', tucked: null };
  emit();
}

export function endCall() {
  state = { mode: 'closed', startedAt: 0, pos: state.pos, tucked: null };
  emit();
}

export function setCallPos(x: number, y: number) {
  state = { ...state, pos: { x, y } };
  emit();
}

export function setCallTucked(t: TuckedSide) {
  if (state.tucked === t) return;
  state = { ...state, tucked: t };
  emit();
}

const SERVER_SNAPSHOT: CallState = {
  mode: 'closed', startedAt: 0, pos: DEFAULT_POS, tucked: null,
};

export function useCallState(): CallState {
  return React.useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state,
    () => SERVER_SNAPSHOT,
  );
}

export function fmtCallElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Phase derives from elapsed time so it stays consistent even after
// minimize/expand and never needs to be persisted separately.
export type CallPhase = 'ringing' | 'solo' | 'group';
export function derivePhase(elapsedMs: number): CallPhase {
  if (elapsedMs < 1500) return 'ringing';
  if (elapsedMs < 4500) return 'solo';
  return 'group';
}
