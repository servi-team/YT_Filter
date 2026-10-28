import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { testDb } from './yardim.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('hız sınırı pencereyi sayar ve sıfırlar', async () => {
  const { limitAsildiMi } = await import('../lib/hiz-limiti.ts');
  const kural = { anahtar: 'test', adet: 2, pencereSaniye: 60 };
  const t = new Date('2026-10-27T10:00:00Z');
  assert.equal(await limitAsildiMi(v.db, kural, t), false);
  assert.equal(await limitAsildiMi(v.db, kural, t), false);
  assert.equal(await limitAsildiMi(v.db, kural, t), true);
  assert.equal(await limitAsildiMi(v.db, kural, new Date('2026-10-27T10:01:01Z')), false);
});

test('aynı origin ve IP özeti doğrulanır', async () => {
  process.env.IP_HASH_SECRET = 'test-anahtar';
  const { ayniOriginMi, ipOzeti } = await import('../lib/istek.ts');
  const iyi = new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://localhost:3000', 'x-forwarded-for': '203.0.113.5' } });
  assert.equal(ayniOriginMi(iyi), true);
  assert.equal(ayniOriginMi(new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://kotu.example' } })), false);
  process.env.SITE_ORIGIN = 'https://site.example';
  assert.equal(ayniOriginMi(new Request('http://site:3000/api/oylar', { method: 'PUT', headers: { origin: 'https://site.example' } })), true);
  assert.equal(ayniOriginMi(new Request('https://site.example/api/oylar', { method: 'PUT', headers: { origin: 'https://kotu.example' } })), false);
  delete process.env.SITE_ORIGIN;
  const h = ipOzeti(iyi)!;
  assert.match(h, /^[a-f0-9]{64}$/);
  assert.notEqual(h, '203.0.113.5');
});

test('ziyaretçi çerezi ve takma etiket ham kimliği sızdırmaz', async () => {
  const { yeniZiyaretciKimligi, ziyaretciCerezi, kimlikEtiketi } = await import('../lib/ziyaretci.ts');
  const k = yeniZiyaretciKimligi();
  assert.equal(k.length >= 40, true);
  const c = ziyaretciCerezi(k, false);
  for (const s of ['HttpOnly', 'SameSite=Lax', 'Max-Age=31536000', 'Path=/']) assert.ok(c.includes(s), s);
  assert.equal(c.includes('Secure'), false);
  assert.ok(ziyaretciCerezi(k, true).includes('Secure'));
  const e = kimlikEtiketi('cerez', k);
  assert.match(e, /^çerez:[a-f0-9]{8}$/);
  assert.equal(e.includes(k), false);
});
