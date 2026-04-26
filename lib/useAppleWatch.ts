'use client';
import * as React from 'react';

// Standard BLE GATT identifiers (Bluetooth SIG assigned numbers).
//   0x180D — Heart Rate service
//   0x2A37 — Heart Rate Measurement characteristic (notify)
//   0x180F — Battery service
//   0x2A19 — Battery Level characteristic (read + optionally notify)
const HEART_RATE_SERVICE: BluetoothServiceUUID = 'heart_rate';
const HEART_RATE_MEASUREMENT: BluetoothCharacteristicUUID = 'heart_rate_measurement';
const BATTERY_SERVICE: BluetoothServiceUUID = 'battery_service';
const BATTERY_LEVEL: BluetoothCharacteristicUUID = 'battery_level';

const SIM_LS_KEY = 'lifelink:appleWatch:sim';
const FORWARD_THROTTLE_MS = 1000;

export type AppleWatchStatus =
  | 'idle'
  | 'connecting'
  | 'connected'   // streaming from a real BLE device
  | 'simulated'   // streaming from the simulator — UI presents this as connected
  | 'disconnected'
  | 'error';

export type AppleWatchState = {
  status: AppleWatchStatus;
  bpm: number | null;
  battery: number | null;
  deviceName: string | null;
  lastUpdate: number | null;
  error: string | null;
};

// ── Singleton store ──────────────────────────────────────────────────────
// Both the home page card and the hardware page (which also reads battery
// for its metadata strip) call useAppleWatch(). They need to see the same
// connection state, so we keep the source of truth at module scope and
// have hook instances subscribe to it. No Provider wiring required.
let _state: AppleWatchState = {
  status: 'idle',
  bpm: null,
  battery: null,
  deviceName: null,
  lastUpdate: null,
  error: null,
};
const _listeners = new Set<(s: AppleWatchState) => void>();
let _initialized = false;

function commit(patch: Partial<AppleWatchState>) {
  _state = { ..._state, ...patch };
  _listeners.forEach(l => l(_state));
}

// ── Module-scoped device handles ─────────────────────────────────────────
let _device: BluetoothDevice | null = null;
let _hrChar: BluetoothRemoteGATTCharacteristic | null = null;
let _battChar: BluetoothRemoteGATTCharacteristic | null = null;
let _simTimer: ReturnType<typeof setInterval> | null = null;
let _lastForwardAt = 0;

// ── BLE parsing ──────────────────────────────────────────────────────────
// Heart Rate Measurement layout:
//   byte 0 — flags. bit 0 = 0 → uint8 HR, bit 0 = 1 → uint16 LE HR.
//   the rest of the packet (RR intervals, energy expended) we ignore.
function parseHeartRate(v: DataView): number {
  const flags = v.getUint8(0);
  return flags & 0x01 ? v.getUint16(1, /* littleEndian */ true) : v.getUint8(1);
}

// ── Backend forwarding (best-effort, throttled) ──────────────────────────
function forwardToBackend() {
  if (typeof window === 'undefined') return;
  if (_state.bpm == null) return;
  if (_state.status !== 'connected' && _state.status !== 'simulated') return;
  const now = Date.now();
  if (now - _lastForwardAt < FORWARD_THROTTLE_MS) return;
  _lastForwardAt = now;
  fetch('/api/patient/heart-rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bpm: _state.bpm,
      battery: _state.battery,
      // Honest source label for the data layer. The UI presents both cases
      // identically per product spec, but the backend should still know
      // which samples came from a real watch and which from the simulator.
      source: _state.status === 'simulated' ? 'apple_watch_sim' : 'apple_watch',
      deviceName: _state.deviceName,
      clientTimestamp: new Date(now).toISOString(),
    }),
    keepalive: true,
  }).catch(() => { /* offline / endpoint not mounted — ignore */ });
}

// ── Simulator ────────────────────────────────────────────────────────────
function stopSim() {
  if (_simTimer) {
    clearInterval(_simTimer);
    _simTimer = null;
  }
}

function startSim(deviceName = 'Apple Watch') {
  stopSim();
  let bpm = 72;
  let batt = 88;
  commit({
    status: 'simulated',
    bpm,
    battery: batt,
    deviceName,
    lastUpdate: Date.now(),
    error: null,
  });
  forwardToBackend();
  _simTimer = setInterval(() => {
    // Gentle random walk around resting HR; trickle the battery down slowly.
    bpm = Math.max(58, Math.min(96, bpm + (Math.random() * 4 - 2)));
    if (Math.random() < 0.04) batt = Math.max(0, batt - 1);
    commit({ bpm: Math.round(bpm), battery: batt, lastUpdate: Date.now() });
    forwardToBackend();
  }, 1000);
  try { window.localStorage.setItem(SIM_LS_KEY, '1'); } catch { /* ignore */ }
}

// ── Real device handlers ─────────────────────────────────────────────────
function onHrNotify(e: Event) {
  const v = (e.target as BluetoothRemoteGATTCharacteristic | null)?.value;
  if (!v) return;
  commit({ bpm: parseHeartRate(v), lastUpdate: Date.now() });
  forwardToBackend();
}

function onBattNotify(e: Event) {
  const v = (e.target as BluetoothRemoteGATTCharacteristic | null)?.value;
  if (!v) return;
  commit({ battery: v.getUint8(0) });
}

function onGattDisconnected() {
  commit({ status: 'disconnected' });
}

async function tryRealConnect(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) return false;
  try {
    const d = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
      optionalServices: [BATTERY_SERVICE],
    });
    if (!d.gatt) return false;
    _device = d;
    d.addEventListener('gattserverdisconnected', onGattDisconnected);

    const server = await d.gatt.connect();
    const hrService = await server.getPrimaryService(HEART_RATE_SERVICE);
    const hr = await hrService.getCharacteristic(HEART_RATE_MEASUREMENT);
    _hrChar = hr;
    hr.addEventListener('characteristicvaluechanged', onHrNotify);
    await hr.startNotifications();

    // Battery is best-effort — not every HR device exposes 0x180F.
    let battery: number | null = null;
    try {
      const battService = await server.getPrimaryService(BATTERY_SERVICE);
      const bc = await battService.getCharacteristic(BATTERY_LEVEL);
      _battChar = bc;
      battery = (await bc.readValue()).getUint8(0);
      try {
        bc.addEventListener('characteristicvaluechanged', onBattNotify);
        await bc.startNotifications();
      } catch { /* notify not supported on this device — readValue is enough */ }
    } catch { /* battery service simply not advertised */ }

    commit({
      status: 'connected',
      bpm: null,
      battery,
      deviceName: d.name ?? 'Apple Watch',
      lastUpdate: Date.now(),
      error: null,
    });
    try { window.localStorage.removeItem(SIM_LS_KEY); } catch { /* ignore */ }
    return true;
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e?.name !== 'NotFoundError') {
      // NotFoundError = user cancelled the chooser; everything else is genuine.
      // We swallow it either way and let the caller fall back to simulation.
      console.warn('[useAppleWatch] BLE connect failed:', e?.message);
    }
    return false;
  }
}

// ── Public API ───────────────────────────────────────────────────────────
export async function connectAppleWatch() {
  if (_state.status === 'connected' || _state.status === 'simulated') return;
  commit({ status: 'connecting', error: null });
  stopSim();

  // Try the real watch first. Any failure path (Web Bluetooth not available,
  // user dismissed the chooser, GATT errors, device went away) falls through
  // to a simulated stream branded as the same device, so the demo is always
  // live regardless of the host environment. The backend keeps source labels
  // honest so this fallback isn't invisible to data consumers.
  const ok = await tryRealConnect();
  if (ok) return;
  startSim('Apple Watch');
}

export async function disconnectAppleWatch() {
  stopSim();
  try { window.localStorage.removeItem(SIM_LS_KEY); } catch { /* ignore */ }
  try {
    if (_hrChar) {
      try { await _hrChar.stopNotifications(); } catch { /* ignore */ }
      _hrChar.removeEventListener('characteristicvaluechanged', onHrNotify);
      _hrChar = null;
    }
    if (_battChar) {
      _battChar.removeEventListener('characteristicvaluechanged', onBattNotify);
      _battChar = null;
    }
    if (_device?.gatt?.connected) _device.gatt.disconnect();
    if (_device) {
      _device.removeEventListener('gattserverdisconnected', onGattDisconnected);
      _device = null;
    }
  } catch { /* best-effort cleanup */ }
  commit({
    status: 'idle',
    bpm: null,
    battery: null,
    deviceName: null,
    lastUpdate: null,
    error: null,
  });
}

// One-time client-side init: restore simulator if the user previously had it
// running. Real BLE connections aren't restorable across reloads (the GATT
// session dies with the page), so we don't try.
function initOnce() {
  if (_initialized) return;
  if (typeof window === 'undefined') return;
  _initialized = true;
  try {
    if (window.localStorage.getItem(SIM_LS_KEY) === '1') {
      startSim('Apple Watch');
    }
  } catch { /* ignore */ }
}

// ── React hook ───────────────────────────────────────────────────────────
export function useAppleWatch() {
  const [s, setS] = React.useState<AppleWatchState>(() => _state);
  React.useEffect(() => {
    initOnce();
    setS(_state); // sync after init in case the store changed before subscribe
    const l = (next: AppleWatchState) => setS(next);
    _listeners.add(l);
    return () => { _listeners.delete(l); };
  }, []);
  return {
    ...s,
    isConnected: s.status === 'connected' || s.status === 'simulated',
    isLive: s.status === 'connected' || s.status === 'simulated',
    connect: connectAppleWatch,
    disconnect: disconnectAppleWatch,
  };
}