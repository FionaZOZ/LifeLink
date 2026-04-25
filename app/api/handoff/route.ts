import { NextResponse } from 'next/server';
import { getDb, HANDOFF_COLLECTION } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';

interface PostBody {
  bundle: object;
  scenario: string;
  receivingHospital?: string;
}

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.bundle || typeof body.bundle !== 'object') {
    return NextResponse.json({ error: 'missing_bundle' }, { status: 400 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({
      stored: false,
      reason: 'mongo_unconfigured',
      hint: 'Set MONGODB_URI in .env.local to enable persistence',
    }, { status: 200 });
  }

  const doc = {
    bundle: body.bundle,
    scenario: body.scenario,
    receivingHospital: body.receivingHospital ?? null,
    storedAt: new Date(),
  };

  const result = await db.collection(HANDOFF_COLLECTION).insertOne(doc);

  return NextResponse.json({
    stored: true,
    id: String(result.insertedId),
    storedAt: doc.storedAt.toISOString(),
  });
}

export async function GET() {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ available: false, count: 0, recent: [] });
  }

  const total = await db.collection(HANDOFF_COLLECTION).countDocuments();
  const recent = await db.collection(HANDOFF_COLLECTION)
    .find({}, { projection: { 'bundle.id': 1, scenario: 1, receivingHospital: 1, storedAt: 1 } })
    .sort({ storedAt: -1 })
    .limit(10)
    .toArray();

  return NextResponse.json({
    available: true,
    count: total,
    recent: recent.map(r => ({
      id: String(r._id),
      bundleId: (r as any).bundle?.id,
      scenario: r.scenario,
      receivingHospital: r.receivingHospital,
      storedAt: r.storedAt,
    })),
  });
}
