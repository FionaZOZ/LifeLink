// lib/mongo/client.ts
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'cardiaclink';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient(): Promise<MongoClient> | null {
  if (!uri) {
    // Graceful degradation — handoff persistence is optional
    return null;
  }
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb() {
  const promise = getMongoClient();
  if (!promise) return null;
  const client = await promise;
  return client.db(dbName);
}

export const HANDOFF_COLLECTION = 'handoff_bundles';
