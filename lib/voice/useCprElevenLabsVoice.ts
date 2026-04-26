'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhaseInfo } from '@/lib/cpr/cprAssistPhase';
import { IDEAL_HI, IDEAL_LO } from '@/lib/cpr/cprAssistPhase';

const HARDWARE_DEPTH_COOLDOWN_MS = 12_000;
const HARDWARE_RATE_COOLDOWN_MS = 14_000;

type Options = {
  phase: PhaseInfo;
  /** True when LifeLink patch serial is streaming. */
  hardwareActive: boolean;
  /** Live depth in cm from patch, or null if no hardware. */
  depthCm: number | null;
  /** Estimated compression rate when hardware provides counts (BPM). */
  hardwareBpm: number | null;
  /** User tapped "Voice coach on". */
  voiceEnabledByUser: boolean;
};

/**
 * Queued ElevenLabs TTS aligned with CPR assist UI + hardware depth/rate hints.
 * One-way instructions only (no mic / STT).
 */
export function useCprElevenLabsVoice(opts: Options) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const chainRef = useRef(Promise.resolve());
  const prevPhaseRef = useRef<PhaseInfo['phase'] | null>(null);
  const milestonesRef = useRef<{ cycle: number; tens: Set<number> }>({ cycle: -1, tens: new Set() });
  const introStartedRef = useRef(false);
  const lastDepthCueRef = useRef(0);
  const lastRateCueRef = useRef(0);

  useEffect(() => {
    if (opts.voiceEnabledByUser) return;
    introStartedRef.current = false;
    prevPhaseRef.current = null;
    milestonesRef.current = { cycle: -1, tens: new Set() };
    lastDepthCueRef.current = 0;
    lastRateCueRef.current = 0;
  }, [opts.voiceEnabledByUser]);

  const speak = useCallback((text: string) => {
    if (!opts.voiceEnabledByUser || !text.trim()) return;

    chainRef.current = chainRef.current.then(async () => {
      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          const msg = typeof j?.error === 'string' ? j.error : `HTTP ${res.status}`;
          setLastError(msg);
          return;
        }
        setLastError(null);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve) => {
          const audio = new Audio(url);
          const done = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onended = done;
          audio.onerror = done;
          void audio.play().catch(done);
        });
      } catch (e) {
        setLastError(e instanceof Error ? e.message : 'Voice playback failed');
      }
    });
  }, [opts.voiceEnabledByUser]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/voice/tts');
        const j = await r.json();
        if (!cancelled) setConfigured(!!j?.configured);
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Intro once when user enables voice (one-way coach; no user speech).
  useEffect(() => {
    if (!opts.voiceEnabledByUser || introStartedRef.current) return;
    introStartedRef.current = true;
    prevPhaseRef.current = opts.phase.phase;
    milestonesRef.current = { cycle: opts.phase.cyclesCompleted, tens: new Set() };

    speak(
      'Emergency CPR voice guide. You do not need to speak. Check if the person is responsive. Tap them and shout.'
    );
    speak('Look for breathing. Is the chest rising normally?');
    speak(
      'If they are not breathing normally, begin CPR. Firm flat surface. Hands on the center of the chest, between the nipples.'
    );
    speak('Interlock your fingers. Keep your arms straight. Push hard and fast with the beat.');
  }, [opts.voiceEnabledByUser, speak, opts.phase.phase, opts.phase.cyclesCompleted]);

  // Phase edges + compression milestones (ElevenLabs: short clips; full 1 to 30 would be dozens of API calls per cycle).
  useEffect(() => {
    if (!opts.voiceEnabledByUser) return;

    const { phase, cyclesCompleted, compressionInCycle } = opts.phase;
    const prev = prevPhaseRef.current;

    if (prev === 'PUSH' && phase === 'BREATHE') {
      speak('Stop compressions for two rescue breaths. Tilt the head back. Pinch the nose. Watch the chest rise.');
    }
    if (prev === 'BREATHE' && phase === 'PUSH') {
      speak('Resume compressions now. Push hard. Push fast. Stay with the beat.');
    }

    prevPhaseRef.current = phase;

    if (phase !== 'PUSH') return;

    if (milestonesRef.current.cycle !== cyclesCompleted) {
      milestonesRef.current = { cycle: cyclesCompleted, tens: new Set() };
    }

    const tens = milestonesRef.current.tens;
    for (const n of [10, 20, 30] as const) {
      if (compressionInCycle >= n && !tens.has(n)) {
        tens.add(n);
        const word = n === 10 ? 'Ten.' : n === 20 ? 'Twenty.' : 'Thirty.';
        speak(word);
      }
    }
  }, [opts.voiceEnabledByUser, opts.phase, speak]);

  // Hardware-aware coaching (depth + rate), debounced.
  useEffect(() => {
    if (!opts.voiceEnabledByUser || !opts.hardwareActive || opts.depthCm == null) return;

    const now = Date.now();
    const d = opts.depthCm;

    if (d < IDEAL_LO - 0.25) {
      if (now - lastDepthCueRef.current >= HARDWARE_DEPTH_COOLDOWN_MS) {
        lastDepthCueRef.current = now;
        speak('Push harder. Use your body weight. Let the chest come all the way up.');
      }
      return;
    }

    if (d > IDEAL_HI + 0.35) {
      if (now - lastDepthCueRef.current >= HARDWARE_DEPTH_COOLDOWN_MS) {
        lastDepthCueRef.current = now;
        speak('Ease up slightly. You are a little too deep.');
      }
      return;
    }

    const bpm = opts.hardwareBpm;
    if (bpm != null && bpm > 0 && (bpm < 100 || bpm > 125)) {
      if (now - lastRateCueRef.current >= HARDWARE_RATE_COOLDOWN_MS) {
        lastRateCueRef.current = now;
        if (bpm < 100) speak('Speed up. Push faster with the beat.');
        else speak('Slow down slightly. Stay near one hundred ten beats per minute.');
      }
    }
  }, [
    opts.voiceEnabledByUser,
    opts.hardwareActive,
    opts.depthCm,
    opts.hardwareBpm,
    speak,
  ]);

  return { configured, lastError, speak };
}
