'use client';

let killToken = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
/** Resolves the in-flight `playElevenLabsLine` wait when we pause/stop mid-clip. */
let settlePlayWait: (() => void) | null = null;

function disposeActiveClip() {
  settlePlayWait?.();
  settlePlayWait = null;
  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch {
      /* ignore */
    }
    activeAudio = null;
  }
  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch {
      /* ignore */
    }
    activeObjectUrl = null;
  }
}

/**
 * Stop any current clip and bump the kill token so in-flight `playElevenLabsLine`
 * calls exit before starting playback (voice coach OFF, navigation, etc.).
 */
export function stopElevenLabsPlayback() {
  killToken += 1;
  disposeActiveClip();
}

type PlayOpts = {
  signal?: AbortSignal;
};

/**
 * Fetch one TTS clip from the server and play it. Only one clip plays at a time.
 * Returns false if aborted, misconfigured, or request failed.
 */
export async function playElevenLabsLine(text: string, opts?: PlayOpts): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  disposeActiveClip();
  killToken += 1;
  const token = killToken;

  let res: Response;
  try {
    res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
      signal: opts?.signal,
    });
  } catch {
    return false;
  }

  if (token !== killToken) return false;
  if (!res.ok) return false;

  let blob: Blob;
  try {
    blob = await res.blob();
  } catch {
    return false;
  }
  if (token !== killToken) return false;
  if (opts?.signal?.aborted) return false;

  const url = URL.createObjectURL(blob);
  activeObjectUrl = url;
  const audio = new Audio(url);
  activeAudio = audio;

  await new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      settlePlayWait = null;
      if (activeAudio === audio) {
        activeAudio = null;
        activeObjectUrl = null;
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      } else {
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* ignore */
        }
      }
      resolve();
    };
    settlePlayWait = settle;
    audio.onended = settle;
    audio.onerror = settle;
    void audio.play().catch(settle);
  });

  return token === killToken;
}
