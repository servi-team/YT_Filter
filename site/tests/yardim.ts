import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import type { Veritabani } from '../lib/db.ts';

export async function testDb(): Promise<{ db: Veritabani; kapat: () => Promise<void> }> {
  const pg = new PGlite();
  const db = drizzle(pg) as Veritabani;
  await migrate(db as any, { migrationsFolder: fileURLToPath(new URL('../db/gecisler', import.meta.url)) });
  return { db, kapat: () => pg.close() };
}
