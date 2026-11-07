import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
process.env.SITE_DB = 'pglite'; process.env.PGLITE_DIR = 'memory'; process.env.IP_HASH_SECRET = 't';
const { sql } = await import('drizzle-orm');
const { db, veritabaniKapat } = await import('../lib/db.ts');
const { POST: geriAl } = await import('../app/api/panel/moderasyon/oy-geri-al/route.ts');
const { POST: kilitle } = await import('../app/api/panel/moderasyon/kilitle/route.ts');
const { POST: kilitAc } = await import('../app/api/panel/moderasyon/kilit-ac/route.ts');
const { POST: engelle } = await import('../app/api/panel/moderasyon/engelle/route.ts');
const { GET: engellerGetir } = await import('../app/api/panel/engeller/route.ts');
const { DELETE: engelSil } = await import('../app/api/panel/engeller/[id]/route.ts');
const { parolaOzetle } = await import('../lib/parola.ts');
const { girisYap, OTURUM_CEREZI } = await import('../lib/oturum.ts');
const { oyVer } = await import('../lib/oy-deposu.ts');

const HEDEF = 'UC' + 'r'.repeat(22);
let v: Awaited<ReturnType<typeof db>>; let cookie: string; let oyId: string;

before(async () => {
  v = await db();
  await v.execute(sql`insert into kanallar (id) values (${HEDEF})`);
  const ozet = await parolaOzetle('Parola123456');
  await v.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x', ${ozet}, 'editor')`);
  await oyVer(v, { hedefTuru: 'kanal', hedefId: HEDEF, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: 'gizli-cerez' });
  oyId = (await v.execute(sql`select id from oylar limit 1`)).rows[0].id as string;
  const g = await girisYap(v, { eposta: 'e@x', parola: 'Parola123456', ipOzeti: null });
  cookie = `${OTURUM_CEREZI}=${g.token}`;
});
after(async () => { await veritabaniKapat(); });

function istek(yol: string, govde?: unknown, yontem = 'POST', oturum = cookie) {
  return new Request('http://localhost:3000' + yol, {
    method: yontem,
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', cookie: oturum },
    body: govde === undefined ? undefined : JSON.stringify(govde),
  });
}

test('moderasyon uçları yetki, origin ve gerekçe ister; ham kimlik sızdırmaz', async () => {
  assert.equal((await geriAl(istek('/api/panel/moderasyon/oy-geri-al', { oyId, kapsam: 'tek', gerekce: 'x' }, 'POST', ''))).status, 401);
  assert.equal((await geriAl(new Request('http://localhost:3000/api/panel/moderasyon/oy-geri-al', { method: 'POST', headers: { cookie }, body: '{}' }))).status, 403);
  assert.equal((await geriAl(istek('/api/panel/moderasyon/oy-geri-al', { oyId, kapsam: 'tek' }))).status, 422);
  const ok = await geriAl(istek('/api/panel/moderasyon/oy-geri-al', { oyId, kapsam: 'tek', gerekce: 'test' }));
  assert.equal(ok.status, 200);
  const metin = await ok.text();
  assert.equal(metin.includes('gizli-cerez'), false);
  assert.match(metin, /çerez:/);
});

test('kilit aç/kapa ve engel listesi akışı çalışır', async () => {
  const k = await kilitle(istek('/api/panel/moderasyon/kilitle', { hedefTuru: 'kanal', hedefId: HEDEF, gerekce: 'kilit' }));
  assert.equal(k.status, 201);
  assert.equal((await kilitle(istek('/api/panel/moderasyon/kilitle', { hedefTuru: 'kanal', hedefId: HEDEF, gerekce: 'tekrar' }))).status, 409);
  assert.equal((await kilitAc(istek('/api/panel/moderasyon/kilit-ac', { hedefTuru: 'kanal', hedefId: HEDEF, gerekce: 'aç' }))).status, 200);

  const e = await engelle(istek('/api/panel/moderasyon/engelle', { oyId, kapsam: 'cerez', gerekce: 'engel' }));
  assert.equal(e.status, 201);
  const liste = await (await engellerGetir(istek('/api/panel/engeller', undefined, 'GET'))).json() as any;
  assert.equal(liste.engeller.length, 1);
  assert.match(liste.engeller[0].etiket, /^çerez:/);
  assert.equal(JSON.stringify(liste).includes('gizli-cerez'), false);
  assert.equal((await engelSil(istek(`/api/panel/engeller/${liste.engeller[0].id}`, { gerekce: 'kaldır' }, 'DELETE'), { params: Promise.resolve({ id: liste.engeller[0].id }) })).status, 204);
  assert.equal((await (await engellerGetir(istek('/api/panel/engeller', undefined, 'GET'))).json() as any).engeller.length, 0);
});

test('geçersiz gövde, kapsam ve bitiş tarihi 400 döner', async () => {
  assert.equal((await geriAl(istek('/api/panel/moderasyon/oy-geri-al', { oyId, kapsam: 'hepsi', gerekce: 'x' }))).status, 400);
  assert.equal((await engelle(istek('/api/panel/moderasyon/engelle', { oyId, kapsam: 'cerez', gerekce: 'x', bitis: 'dün' }))).status, 400);
  assert.equal((await kilitle(istek('/api/panel/moderasyon/kilitle', { hedefTuru: 'liste', hedefId: HEDEF, gerekce: 'x' }))).status, 400);
});
