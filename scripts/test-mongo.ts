// Quick connection check for MongoDB Atlas.
// Run with: npx tsx --env-file=.env.local scripts/test-mongo.ts
//
// No `dotenv` import needed — `tsx --env-file` injects the env vars before
// the script runs, so process.env.MONGODB_URI is already populated.

import { MongoClient } from 'mongodb';

(async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'cardiaclink';

  if (!uri) {
    console.error('✗ MONGODB_URI is not set. Check .env.local.');
    process.exit(1);
  }

  console.log('→ Connecting to MongoDB Atlas...');
  console.log('  cluster:', uri.replace(/:([^@]+)@/, ':***@')); // mask password in log

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000, // fail fast if Network Access blocks us
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    const ping = await db.command({ ping: 1 });
    console.log('✓ Ping OK:', ping);

    // Check we can write — insert and immediately delete a sentinel doc
    const col = db.collection('_connection_test');
    const inserted = await col.insertOne({ at: new Date(), source: 'cardiaclink-test' });
    console.log('✓ Write OK — inserted:', String(inserted.insertedId));
    await col.deleteOne({ _id: inserted.insertedId });
    console.log('✓ Delete OK — cleanup successful');

    console.log('');
    console.log('🎉 MongoDB Atlas is fully connected and writable.');
  } catch (err: any) {
    console.error('');
    console.error('✗ Connection failed:', err.message ?? err);

    if (String(err).includes('IP that isn\'t whitelisted') || String(err).includes('whitelist')) {
      console.error('  → Fix: Atlas → Security → Network Access → ADD IP ADDRESS → Allow Access From Anywhere');
    } else if (String(err).includes('bad auth') || String(err).includes('authentication')) {
      console.error('  → Fix: Check the password in MONGODB_URI matches what you set for qirans3_db_user');
    } else if (String(err).includes('ENOTFOUND') || String(err).includes('querySrv')) {
      console.error('  → Fix: Check the cluster hostname (cluster0.1ic9oxw.mongodb.net) matches Atlas');
    } else if (String(err).includes('ServerSelectionError') || String(err).includes('timed out')) {
      console.error('  → Fix: Network Access not active yet — wait 1-2 minutes after adding 0.0.0.0/0');
    }
    process.exit(1);
  } finally {
    await client.close();
  }
})();
