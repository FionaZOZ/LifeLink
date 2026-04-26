/** Shared CPR assist timing (30:2 @ 110 BPM) — used by UI and voice narration. */

export const TARGET_BPM = 110;
export const COMPRESSIONS_PER_CYCLE = 30;
export const COMPRESSION_PHASE_MS = Math.round((COMPRESSIONS_PER_CYCLE * 60_000) / TARGET_BPM);
export const BREATH_PHASE_MS = 5000;
export const BREATHS_PER_CYCLE = 2;
export const CYCLE_MS = COMPRESSION_PHASE_MS + BREATH_PHASE_MS;

export const DEPTH_MIN = 0;
export const DEPTH_MAX = 7;
export const IDEAL_LO = 5.0;
export const IDEAL_HI = 6.0;

export function pct(v: number): number {
  return ((v - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN)) * 100;
}

/** Map sensor voltage (0–5V on RP-S40-ST) to compression depth (0–7cm). */
export function voltageToDepth(v: number): number {
  return Math.max(0, Math.min(DEPTH_MAX, v * 1.4));
}

export type PhaseInfo = {
  cyclesCompleted: number;
  phase: 'PUSH' | 'BREATHE';
  phaseProgress: number;
  compressionInCycle: number;
  breathInCycle: number;
  totalCompressions: number;
};

export function derivePhase(elapsedMs: number): PhaseInfo {
  if (elapsedMs <= 0) {
    return {
      cyclesCompleted: 0,
      phase: 'PUSH',
      phaseProgress: 0,
      compressionInCycle: 1,
      breathInCycle: 0,
      totalCompressions: 0,
    };
  }
  const cyclesCompleted = Math.floor(elapsedMs / CYCLE_MS);
  const inCycle = elapsedMs % CYCLE_MS;
  if (inCycle < COMPRESSION_PHASE_MS) {
    const progress = inCycle / COMPRESSION_PHASE_MS;
    const compressionInCycle = Math.min(
      COMPRESSIONS_PER_CYCLE,
      Math.floor(progress * COMPRESSIONS_PER_CYCLE) + 1
    );
    return {
      cyclesCompleted,
      phase: 'PUSH',
      phaseProgress: progress,
      compressionInCycle,
      breathInCycle: 0,
      totalCompressions: cyclesCompleted * COMPRESSIONS_PER_CYCLE + compressionInCycle - 1,
    };
  }
  const breathElapsed = inCycle - COMPRESSION_PHASE_MS;
  const progress = breathElapsed / BREATH_PHASE_MS;
  const breathInCycle = Math.min(BREATHS_PER_CYCLE, Math.floor(progress * BREATHS_PER_CYCLE) + 1);
  return {
    cyclesCompleted,
    phase: 'BREATHE',
    phaseProgress: progress,
    compressionInCycle: COMPRESSIONS_PER_CYCLE,
    breathInCycle,
    totalCompressions: cyclesCompleted * COMPRESSIONS_PER_CYCLE + COMPRESSIONS_PER_CYCLE,
  };
}
