import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { oturumlar } from '../db/schema.ts';

let pg: PGlite; let db: ReturnType<typeof drizzle>;
before(async () => {
  pg = new PGlite(); db = drizzle(pg);
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../db/gecisler', import.meta.url)) });
});
after(async () => { await pg.close(); });

test('oturum ve hız limiti tabloları ile hesap alanları vardır', async () => {
  const kolonlar = await db.execute(sql`select table_name, column_name from information_schema.columns where table_name in ('oturumlar','hiz_limitleri','hesaplar')`);
  const c = (kolonlar.rows ?? kolonlar).map((r: any) => `${r.table_name}.${r.column_name}`);
  for (const ad of ['oturumlar.token_ozeti','oturumlar.son_kullanma','oturumlar.son_gorulme','hiz_limitleri.anahtar','hiz_limitleri.pencere','hiz_limitleri.sayac','hesaplar.parola_degistirmeli','hesaplar.son_giris']) assert.ok(c.includes(ad), ad);
});

test('oturum token özeti tekildir', async () => {
  const hesapId = String((await db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@b.c','x','editor') returning id`)).rows[0].id);
  await db.insert(oturumlar).values({ tokenOzeti: 'a', hesapId, sonKullanma: new Date(Date.now() + 1e6) });
  await assert.rejects(db.insert(oturumlar).values({ tokenOzeti: 'a', hesapId, sonKullanma: new Date(Date.now() + 1e6) }), (e: any) => (e?.cause?.code ?? e?.code) === '23505');
});
