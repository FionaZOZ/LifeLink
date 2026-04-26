'use client';

import { useEffect, useRef, useState } from 'react';

/** Estimate BPM from monotonic compression `count` ticks over a sliding window. */
export function useCompressionRateBpm(count: number): number | null {
  const [rate, setRate] = useState<number | null>(null);
  const samples = useRef<number[]>([]);
  const lastCount = useRef(0);

  useEffect(() => {
    if (count > lastCount.current) {
      samples.current.push(Date.now());
      const cutoff = Date.now() - 6000;
      while (samples.current.length && samples.current[0] < cutoff) samples.current.shift();
      lastCount.current = count;
      if (samples.current.length >= 2) {
        const span = samples.current[samples.current.length - 1] - samples.current[0];
        const bpm = span > 0 ? Math.round((samples.current.length - 1) * 60000 / span) : null;
        setRate(bpm);
      }
    }
  }, [count]);

  return rate;
}
