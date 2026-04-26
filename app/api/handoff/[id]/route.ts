import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, HANDOFF_COLLECTION } from '@/lib/mongo/client';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  if (!db) return NextResponse.json({ available: false }, { status: 200 });

  let oid: ObjectId;
  try { oid = new ObjectId(id); }
  catch { return NextResponse.json({ error: 'invalid_id' }, { status: 400 }); }

  const doc = await db.collection(HANDOFF_COLLECTION).findOne({ _id: oid });
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json(doc);
}
