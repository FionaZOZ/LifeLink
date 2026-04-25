/**
 * Short percussive tick for each compression beat (non-voice, syncs with metronome).
 * Call `await ensureBeatAudioUnlocked()` from a user tap (e.g. allow voice, begin compressions).
 * `playCompressionTick` awaits `resume()` so ticks still work when the context was suspended.
 */

let context: AudioContext | null = null;

function createAudioContext(): AudioContext {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    throw new Error("Web Audio API not available");
  }
  return new AC();
}

function getContext(): AudioContext {
  if (!context) {
    context = createAudioContext();
  }
  return context;
}

export async function ensureBeatAudioUnlocked(): Promise<void> {
  const c = getContext();
  await c.resume();
  if (c.state !== "running") {
    return;
  }
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  osc.frequency.value = 40;
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.02);
}

/** Original metronome character: low thud + short bright click */
export async function playCompressionTick(): Promise<void> {
  try {
    const c = getContext();
    await c.resume();
    if (c.state !== "running") {
      return;
    }
    const t = c.currentTime;
    const master = c.createGain();
    master.gain.value = 0.22;
    master.connect(c.destination);

    const o1 = c.createOscillator();
    const g1 = c.createGain();
    o1.type = "sine";
    o1.frequency.setValueAtTime(200, t);
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(0.5, t + 0.004);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o1.connect(g1);
    g1.connect(master);
    o1.start(t);
    o1.stop(t + 0.1);

    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(1400, t);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.2, t + 0.002);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o2.connect(g2);
    g2.connect(master);
    o2.start(t);
    o2.stop(t + 0.04);
  } catch {
    /* keep metronome state updates if audio fails */
  }
}
