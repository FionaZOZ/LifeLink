'use client';

import * as React from 'react';
import { derivePhase } from '@/lib/cpr/cprAssistPhase';
import { playCompressionTick } from '@/lib/compressionBeatSound';

/**
 * Plays a percussive tick on each new compression beat during the PUSH phase
 * (110 BPM), aligned with `derivePhase`. Silent during BREATHE or when `beatOn` is false.
 * `getElapsedMsRef` returns session elapsed in ms (may be frozen while AED / ambulance UI is open).
 */
export function useAssistPushMetronome(
  getElapsedMsRef: React.MutableRefObject<() => number>,
  beatOn: boolean,
) {
  const prevSig = React.useRef<string>('');

  React.useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const elapsed = getElapsedMsRef.current();
      const phase = derivePhase(elapsed);
      if (!beatOn) {
        prevSig.current = '';
      } else if (phase.phase === 'PUSH') {
        const sig = `${phase.cyclesCompleted}-${phase.compressionInCycle}`;
        if (sig !== prevSig.current) {
          prevSig.current = sig;
          void playCompressionTick();
        }
      } else {
        prevSig.current = '';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [getElapsedMsRef, beatOn]);
}
