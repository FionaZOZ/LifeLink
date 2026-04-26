'use client';

import { useEffect, useRef } from 'react';
import type { Lang } from '@/components/lifelink/i18n';
import { playElevenLabsLine, stopElevenLabsPlayback } from '@/lib/voice/playElevenLabsLine';

type ScriptLines = readonly string[];

/** Bumps on every narration effect cleanup or new run — invalidates overlapping async work (e.g. React Strict Mode). */
let narrationEpoch = 0;

/**
 * When `arm` is true (e.g. active SOS session), checks TTS config once then plays lines in order.
 * Stops previous clips before starting; invalidates in-flight work so lines never overlap.
 * `lang` selects ElevenLabs model + should match the language of each `lines` string.
 */
export function useElevenLabsScriptedNarration(scriptId: string, lines: ScriptLines, arm: boolean, lang: Lang = 'en') {
  const scriptIdRef = useRef(scriptId);
  scriptIdRef.current = scriptId;

  useEffect(() => {
    if (!arm) {
      return;
    }

    narrationEpoch += 1;
    const epoch = narrationEpoch;
    stopElevenLabsPlayback();

    const ac = new AbortController();

    void (async () => {
      try {
        const cfg = await fetch('/api/voice/tts', { signal: ac.signal });
        if (epoch !== narrationEpoch) return;
        const j = await cfg.json();
        if (ac.signal.aborted || !j?.configured) return;

        for (const line of lines) {
          if (ac.signal.aborted || epoch !== narrationEpoch) break;
          const ok = await playElevenLabsLine(line, { signal: ac.signal, lang });
          if (!ok || epoch !== narrationEpoch) break;
        }
      } catch {
        /* aborted or network */
      }
    })();

    return () => {
      ac.abort();
      narrationEpoch += 1;
      stopElevenLabsPlayback();
    };
  }, [arm, lines, scriptId, lang]);
}
