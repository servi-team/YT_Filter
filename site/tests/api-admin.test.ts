import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { GET } = await import('../app/api/admin/hesaplar/route.ts');
const { parolaOzetle } = await import('../lib/parola.ts');
const { girisYap, OTURUM_CEREZI } = await import('../lib/oturum.ts');

let v: Awaited<ReturnType<typeof db>>; let editorCookie: string; let adminCookie: string;
before(async () => {
  v = await db();
  const ozet = await parolaOzetle('Parola123456');
  await v.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x', ${ozet}, 'editor'), ('a@x', ${ozet}, 'admin')`);
  editorCookie = `${OTURUM_CEREZI}=${(await girisYap(v, { eposta: 'e@x', parola: 'Parola123456', ipOzeti: null })).token}`;
  adminCookie = `${OTURUM_CEREZI}=${(await girisYap(v, { eposta: 'a@x', parola: 'Parola123456', ipOzeti: null })).token}`;
});
after(async () => { await veritabaniKapat(); });
const istek = (cookie: string) => new Request('http://localhost:3000/api/admin/hesaplar', { headers: { cookie } });

test('editör admin uçlarına 403 alır, admin 200 alır', async () => {
  assert.equal((await GET(istek(editorCookie))).status, 403);
  assert.equal((await GET(istek(adminCookie))).status, 200);
});
