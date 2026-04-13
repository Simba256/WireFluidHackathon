import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb(connectionString: string = requireEnv()) {
  if (_db) return _db;
  const client = postgres(connectionString, { max: 10, prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

function requireEnv(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return url;
}

export type Database = ReturnType<typeof getDb>;
