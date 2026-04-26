// SSE endpoint — streams real-time agent events from MongoDB Atlas.
// Replays all existing events for the emergency, then polls for new ones.

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { emergencyId: string } }
) {
  const { emergencyId } = params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      // Try to connect to MongoDB
      const db = await getDb();
      if (!db) {
        send({ error: 'MongoDB not configured', fallback: true });
        controller.close();
        return;
      }

      const coll = db.collection('agent_events');

      try {
        // Replay all existing events for this emergency
        const initial = await coll
          .find({ emergency_id: emergencyId })
          .sort({ ts: 1 })
          .limit(200)
          .toArray();

        for (const doc of initial) {
          send(doc);
        }

        // Poll for new events every 250ms
        let lastTs = initial.at(-1)?.ts ?? '';
        const timer = setInterval(async () => {
          try {
            const docs = await coll
              .find({ emergency_id: emergencyId, ts: { $gt: lastTs } })
              .sort({ ts: 1 })
              .limit(50)
              .toArray();

            for (const d of docs) {
              send(d);
              if (d.ts > lastTs) {
                lastTs = d.ts;
              }
            }
          } catch (err) {
            console.error('[Telemetry SSE] Poll error:', err);
          }
        }, 250);

        // Clean up on disconnect
        req.signal.addEventListener('abort', () => {
          clearInterval(timer);
        });
      } catch (err) {
        console.error('[Telemetry SSE] Error:', err);
        send({ error: 'Failed to read events from MongoDB', details: String(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
