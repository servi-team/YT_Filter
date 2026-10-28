import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite';
process.env.PGLITE_DIR = 'memory';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');

test('PGlite sürücüsü geçişleri uygular ve sorgu çalıştırır', async () => {
  const v = await db();
  const r = await v.execute(sql`select 1 as x`);
  assert.equal((r.rows ?? r)[0].x, 1);
  await veritabaniKapat();
});
