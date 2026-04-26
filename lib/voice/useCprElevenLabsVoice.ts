'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IDEAL_HI, IDEAL_LO } from '@/lib/cpr/cprAssistPhase';
import { t, type Lang } from '@/components/lifelink/i18n';
import { playElevenLabsLine, stopElevenLabsPlayback } from '@/lib/voice/playElevenLabsLine';

type VoiceHwKey =
  | 'voice.cpr.hw.pushHarder'
  | 'voice.cpr.hw.easeDeep'
  | 'voice.cpr.hw.speedUp'
  | 'voice.cpr.hw.slowDown'
  | 'voice.cpr.hw.keepGoing';

const HARDWARE_DEPTH_COOLDOWN_MS = 12_000;
const HARDWARE_RATE_COOLDOWN_MS = 14_000;
const HARDWARE_KEEP_GOING_MS = 22_000;

type Options = {
  /** True when LifeLink patch serial is streaming. */
  hardwareActive: boolean;
  /** Live depth in cm from patch, or null if no hardware. */
  depthCm: number | null;
  /** Estimated compression rate when hardware provides counts (BPM). */
  hardwareBpm: number | null;
  /** User can mute ElevenLabs on the CPR screen. */
  voiceEnabledByUser: boolean;
  /** While on helper call, stop TTS and do not enqueue new lines. */
  voiceMutedForCall: boolean;
  /** Matches UI language for TTS text and model. */
  lang: Lang;
};

/**
 * CPR assist: ElevenLabs only for patch-based coaching — "push harder", "keep going", rate hints.
 * Push-phase metronome ticks are driven by `useAssistPushMetronome`; this hook does not play them.
 */
export function useCprElevenLabsVoice(opts: Options) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const chainRef = useRef(Promise.resolve());
  const lastDepthCueRef = useRef(0);
  const lastRateCueRef = useRef(0);
  const lastKeepGoingRef = useRef(0);

  const enabledRef = useRef(opts.voiceEnabledByUser);
  const hardwareRef = useRef(opts.hardwareActive);
  const mutedForCallRef = useRef(opts.voiceMutedForCall);
  enabledRef.current = opts.voiceEnabledByUser;
  hardwareRef.current = opts.hardwareActive;
  mutedForCallRef.current = opts.voiceMutedForCall;

  const langRef = useRef(opts.lang);
  langRef.current = opts.lang;

  useEffect(() => {
    if (opts.voiceEnabledByUser) return;
    stopElevenLabsPlayback();
    chainRef.current = Promise.resolve();
    lastDepthCueRef.current = 0;
    lastRateCueRef.current = 0;
    lastKeepGoingRef.current = 0;
  }, [opts.voiceEnabledByUser]);

  useEffect(() => {
    if (!opts.voiceMutedForCall) return;
    stopElevenLabsPlayback();
    chainRef.current = Promise.resolve();
  }, [opts.voiceMutedForCall]);

  const speak = useCallback((key: VoiceHwKey) => {
    chainRef.current = chainRef.current.then(async () => {
      if (!enabledRef.current || !hardwareRef.current || mutedForCallRef.current) return;
      const text = t(key, langRef.current).trim();
      if (!text) return;
      try {
        const ok = await playElevenLabsLine(text, { lang: langRef.current });
        if (!ok) {
          setLastError('Voice request failed');
          return;
        }
        setLastError(null);
      } catch (e) {
        setLastError(e instanceof Error ? e.message : 'Voice playback failed');
      }
    });
  }, []);

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

  // Depth / rate / encouragement — patch only.
  useEffect(() => {
    if (!opts.voiceEnabledByUser || opts.voiceMutedForCall || !opts.hardwareActive || opts.depthCm == null) return;

    const now = Date.now();
    const d = opts.depthCm;

    if (d < IDEAL_LO - 0.25) {
      if (now - lastDepthCueRef.current >= HARDWARE_DEPTH_COOLDOWN_MS) {
        lastDepthCueRef.current = now;
        speak('voice.cpr.hw.pushHarder');
      }
      return;
    }

    if (d > IDEAL_HI + 0.35) {
      if (now - lastDepthCueRef.current >= HARDWARE_DEPTH_COOLDOWN_MS) {
        lastDepthCueRef.current = now;
        speak('voice.cpr.hw.easeDeep');
      }
      return;
    }

    const bpm = opts.hardwareBpm;
    if (bpm != null && bpm > 0 && (bpm < 100 || bpm > 125)) {
      if (now - lastRateCueRef.current >= HARDWARE_RATE_COOLDOWN_MS) {
        lastRateCueRef.current = now;
        if (bpm < 100) speak('voice.cpr.hw.speedUp');
        else speak('voice.cpr.hw.slowDown');
      }
      return;
    }

    if (d >= IDEAL_LO && d <= IDEAL_HI && now - lastKeepGoingRef.current >= HARDWARE_KEEP_GOING_MS) {
      lastKeepGoingRef.current = now;
      speak('voice.cpr.hw.keepGoing');
    }
  }, [
    opts.voiceEnabledByUser,
    opts.voiceMutedForCall,
    opts.hardwareActive,
    opts.depthCm,
    opts.hardwareBpm,
    speak,
  ]);

  useEffect(() => {
    return () => {
      stopElevenLabsPlayback();
      chainRef.current = Promise.resolve();
    };
  }, []);

  return { configured, lastError, speak };
}
