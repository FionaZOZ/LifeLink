import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'MongoDB not configured' }, { status: 500 });
  }

  try {
    // Get the 5 most recent "phase: request" events from coordinator (one per emergency)
    const recent = await db
      .collection('agent_events')
      .find({ phase: 'request', agent: 'coordinator' })
      .sort({ ts: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      latest: recent[0]
        ? {
            emergency_id: recent[0].emergency_id,
            summary: recent[0].summary,
            data: recent[0].data, // {lat, lon, address}
            ts: recent[0].ts,
          }
        : null,
      recent: recent.map((r) => ({
        emergency_id: r.emergency_id,
        summary: r.summary,
        ts: r.ts,
      })),
    });
  } catch (err) {
    console.error('[Latest Emergency] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch latest emergency', details: String(err) },
      { status: 500 }
    );
  }
}
