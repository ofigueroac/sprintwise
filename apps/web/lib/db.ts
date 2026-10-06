import { createDb, type Database } from '@repo/db';

const globalForDb = globalThis as unknown as { database?: Database };

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  globalForDb.database ??= createDb(databaseUrl);

  return globalForDb.database;
}
