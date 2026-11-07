/** Veritabanı bağlantısı: üretimde node-postgres, yerelde/testte PGlite. Bağlantı tembel kurulur. */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as schema from '../db/schema.ts';

export type Veritabani = PgDatabase<any, any, any>;

// Turbopack `new URL('../db/gecisler', import.meta.url)` ifadesini statik varlık
// importu sanıp derlemeyi bozuyor; aynı Windows-güvenli yolu path ile çözüyoruz.
const gecisKlasoru = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/gecisler');

const global_ = globalThis as unknown as {
  __ytfPool?: Pool;
  __ytfPglite?: { close(): Promise<void> };
  __ytfDb?: Promise<Veritabani>;
};

export function pool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil.');
  return (global_.__ytfPool ??= new Pool({ connectionString: url, max: 10 }));
}

async function pgliteDb(): Promise<Veritabani> {
  // Değişkenli dinamik import: üretim imajında PGlite bulunmasa da modül yüklenmez.
  const pgliteModulu = '@electric-sql/pglite';
  const { PGlite } = await import(pgliteModulu);
  const dizin = process.env.PGLITE_DIR ?? '.pglite';
  const pg = new PGlite(dizin === 'memory' ? undefined : dizin);
  global_.__ytfPglite = pg;

  const { drizzle: pgliteDrizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const veritabani = pgliteDrizzle(pg, { schema });
  await migrate(veritabani, { migrationsFolder: gecisKlasoru });
  return veritabani as unknown as Veritabani;
}

export async function db(): Promise<Veritabani> {
  if (global_.__ytfDb) return global_.__ytfDb;

  if (process.env.DATABASE_URL) {
    const veritabani = drizzle(pool(), { schema });
    global_.__ytfDb = Promise.resolve(veritabani);
    return global_.__ytfDb;
  }

  if (process.env.SITE_DB === 'pglite') {
    const baslat = pgliteDb().catch((hata) => {
      global_.__ytfDb = undefined;
      throw hata;
    });
    global_.__ytfDb = baslat;
    return baslat;
  }

  throw new Error('Veritabanı yapılandırılmadı: DATABASE_URL veya SITE_DB=pglite tanımlayın.');
}

export async function veritabaniKapat(): Promise<void> {
  const pglite = global_.__ytfPglite;
  const pgHavuzu = global_.__ytfPool;
  global_.__ytfPglite = undefined;
  global_.__ytfPool = undefined;
  global_.__ytfDb = undefined;

  if (pglite) await pglite.close();
  if (pgHavuzu) await pgHavuzu.end();
}
