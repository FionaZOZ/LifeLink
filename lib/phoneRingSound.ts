/**
 * Synthesized phone-ring loop. Web Audio API only — no asset to ship.
 * Pattern: classic North-American ringback (440 Hz + 480 Hz combined),
 * 2 s on / 4 s off, repeated until stopped. Volume defaults low so it
 * coexists with ambient sound without dominating.
 *
 * Caller must invoke `startPhoneRing()` from inside (or shortly after) a
 * user gesture so the AudioContext can resume — browsers block playback
 * otherwise. `stopPhoneRing()` is idempotent and safe to call from
 * unmount cleanup.
 */

let ctx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

function playOneRing(c: AudioContext, gain: GainNode, durationSec = 2) {
  const t = c.currentTime;
  // Two-tone superposed sine — the perceptual signature of "phone ringing".
  for (const freq of [440, 480]) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = c.createGain();
    // Soft attack/release so it doesn't click at burst boundaries.
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.04);
    g.gain.setValueAtTime(0.5, t + durationSec - 0.04);
    g.gain.linearRampToValueAtTime(0, t + durationSec);
    osc.connect(g);
    g.connect(gain);
    osc.start(t);
    osc.stop(t + durationSec + 0.05);
  }
}

export async function startPhoneRing(volume = 0.15): Promise<void> {
  const c = getCtx();
  if (!c) return;
  if (ringInterval) return; // already running — idempotent
  try {
    await c.resume();
  } catch {
    /* resume may reject if not user-gesture-driven; just bail */
    return;
  }
  if (c.state !== 'running') return;

  masterGain = c.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(c.destination);

  // Fire the first ring immediately, then every 6 s (2 s tone + 4 s silence).
  playOneRing(c, masterGain);
  ringInterval = setInterval(() => {
    if (!ctx || !masterGain) return;
    playOneRing(ctx, masterGain);
  }, 6000);
}

export function stopPhoneRing(): void {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  const c = ctx;
  const g = masterGain;
  if (g && c) {
    try {
      // Quick fade-out so we don't click on abrupt cut.
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      const toDisconnect = g;
      setTimeout(() => {
        try { toDisconnect.disconnect(); } catch { /* already gone */ }
      }, 220);
    } catch {
      try { g.disconnect(); } catch { /* ignore */ }
    }
  }
  masterGain = null;
}
