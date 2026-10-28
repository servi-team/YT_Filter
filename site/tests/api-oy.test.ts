import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory'; process.env.IP_HASH_SECRET = 't'; process.env.OY_LIMITI_DAKIKA = '2';
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { PUT } = await import('../app/api/oylar/route.ts');
const { sql } = await import('drizzle-orm');
before(async () => { await (await db()).execute(sql`insert into kanallar (id) values ('UC'||repeat('d',22))`); });
after(async () => { await veritabaniKapat(); });

test('origin yoksa 403, geçersiz gövde 400, üçüncü istek 429', async () => {
  const govde = JSON.stringify({ hedefTuru: 'kanal', hedefId: 'UC' + 'd'.repeat(22), ogeTuru: 'konu', ogeId: 'spor', deger: 'up' });
  const istek = (origin?: string) => new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...(origin ? { origin } : {}) }, body: govde });
  assert.equal((await PUT(istek())).status, 403);
  assert.equal((await PUT(new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://localhost:3000' }, body: '{' }))).status, 400);
  assert.equal((await PUT(istek('http://localhost:3000'))).status, 200);
  assert.equal((await PUT(istek('http://localhost:3000'))).status, 200);
  assert.equal((await PUT(istek('http://localhost:3000'))).status, 429);
});
