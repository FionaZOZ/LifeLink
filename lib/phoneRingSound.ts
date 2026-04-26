/**
 * Synthesized phone-ringer loop (recipient side — what the *called* phone
 * plays, not the caller's ringback). Web Audio API only — no asset to ship.
 *
 * Pattern: classic "ring-ring" double burst — two short trill bursts of
 * alternating 950/1280 Hz (~25 Hz warble, mimics an electromechanical bell),
 * then ~2 s silence, repeated until stopped. Volume defaults low so it
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

const BURST_DURATION = 0.4;
const BURST_GAP = 0.18;
const FULL_CYCLE_SEC = 3.0; // 0.4 + 0.18 + 0.4 + ~2.0 silence

function playOneRing(c: AudioContext, gain: GainNode) {
  const now = c.currentTime;
  // Two short bursts ("ring-ring") with a brief gap between.
  const starts = [now, now + BURST_DURATION + BURST_GAP];

  for (const start of starts) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    // Warble between two pitches at ~25 Hz to mimic an electromechanical
    // bell — feels distinctly like an inbound ringer rather than a steady
    // dial-tone.
    const halfPeriod = 0.020;
    let high = false;
    for (let t = start; t < start + BURST_DURATION; t += halfPeriod) {
      osc.frequency.setValueAtTime(high ? 1280 : 950, t);
      high = !high;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.55, start + 0.025);
    g.gain.setValueAtTime(0.55, start + BURST_DURATION - 0.025);
    g.gain.linearRampToValueAtTime(0, start + BURST_DURATION);
    osc.connect(g);
    g.connect(gain);
    osc.start(start);
    osc.stop(start + BURST_DURATION + 0.05);
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

  // Fire the first ring-ring immediately, then loop every full cycle.
  playOneRing(c, masterGain);
  ringInterval = setInterval(() => {
    if (!ctx || !masterGain) return;
    playOneRing(ctx, masterGain);
  }, FULL_CYCLE_SEC * 1000);
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
