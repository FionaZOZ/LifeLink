'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Browser-side compression detector. Watches the patch voltage stream and
 * counts rising-edge crossings of `threshold`, releasing the latch only when
 * voltage drops below `release` (hysteresis — same idea as the Arduino's
 * pressLatched logic). Defaults are 3.55 V peak / 3.25 V release — looser
 * than the firmware's 4.0/3.7 so demo presses around 3.6–3.9 V register
 * (firmware threshold caused observed presses to never count).
 *
 * Returns:
 *   count — total compressions detected since the hook mounted
 *   bpm   — rolling BPM over the last 6 s, or null until ≥ 2 peaks recorded
 */
export function useJsCompressionMetrics(
  voltage: number | null,
  options: { threshold?: number; release?: number; windowMs?: number } = {},
): { count: number; bpm: number | null } {
  const threshold = options.threshold ?? 3.55;
  const release = options.release ?? 3.25;
  const windowMs = options.windowMs ?? 6000;

  const [count, setCount] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const latched = useRef(false);
  const peakTimes = useRef<number[]>([]);

  useEffect(() => {
    if (voltage == null) return;
    if (!latched.current && voltage >= threshold) {
      latched.current = true;
      const now = Date.now();
      peakTimes.current.push(now);
      const cutoff = now - windowMs;
      while (peakTimes.current.length && peakTimes.current[0] < cutoff) {
        peakTimes.current.shift();
      }
      setCount((c) => c + 1);
      if (peakTimes.current.length >= 2) {
        const span =
          peakTimes.current[peakTimes.current.length - 1] - peakTimes.current[0];
        if (span > 0) {
          setBpm(Math.round(((peakTimes.current.length - 1) * 60000) / span));
        }
      }
    } else if (latched.current && voltage < release) {
      latched.current = false;
    }
  }, [voltage, threshold, release, windowMs]);

  return { count, bpm };
}
