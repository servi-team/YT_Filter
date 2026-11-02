import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { GET } = await import('../app/db.json/route.ts');
const { oyVer } = await import('../lib/oy-deposu.ts');
const { yayinla } = await import('../lib/yayin-deposu.ts');

const K = 'UC' + 'x'.repeat(22);
let v: Awaited<ReturnType<typeof db>>; let admin: string;
before(async () => {
  v = await db();
  admin = (await v.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id as string;
  await v.execute(sql`insert into kanallar (id) values (${K})`);
  for (const c of ['r1', 'r2', 'r3']) await oyVer(v, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
});
after(async () => { await veritabaniKapat(); });

test('yayın yokken 404, yayından sonra indirilebilir; eski sürüm ayrı iner', async () => {
  const bos = await GET(new Request('http://localhost:3000/db.json'));
  assert.equal(bos.status, 404);
  const y = await yayinla(v, { onaylayan: admin });
  const r = await GET(new Request('http://localhost:3000/db.json'));
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition') ?? '', new RegExp(`yt-filter-db-v${y.veriSurumu}\\.json`));
  const json = await r.json() as any;
  assert.equal(json.sema, 1);
  assert.equal(json.veriSurumu, y.veriSurumu);
  assert.equal((await GET(new Request('http://localhost:3000/db.json?surum=1'))).status, 200);
  assert.equal((await GET(new Request('http://localhost:3000/db.json?surum=99'))).status, 404);
});
