import { NextRequest, NextResponse } from 'next/server';

const MAX_CHARS = 900;

function voiceId(): string | null {
  const id = process.env.ELEVENLABS_VOICE_ID?.trim();
  return id && id.length > 0 ? id : null;
}

function apiKey(): string | null {
  const k = process.env.ELEVENLABS_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

/** Client checks whether voice TTS is configured (no secrets exposed). */
export async function GET() {
  const configured = !!(apiKey() && voiceId());
  return NextResponse.json({ configured });
}

/**
 * Server-side ElevenLabs text-to-speech (keeps API key off the client).
 * Body: { text: string }
 */
export async function POST(request: NextRequest) {
  const key = apiKey();
  const vId = voiceId();
  if (!key || !vId) {
    return NextResponse.json(
      {
        error:
          'Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID. Add both to .env.local (voice ID is from ElevenLabs Voices, not the Conversational Agent ID).',
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof body === 'object' && body !== null && 'text' in body
    ? String((body as { text: unknown }).text).trim()
    : '';

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `text exceeds ${MAX_CHARS} characters` }, { status: 400 });
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_turbo_v2_5';

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vId)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
        },
      }),
    }
  );

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: 'ElevenLabs TTS failed', detail: errText.slice(0, 200) },
      { status: upstream.status >= 400 ? upstream.status : 502 }
    );
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}
