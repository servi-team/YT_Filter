import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oyVer, sayimlariGetir, benimOylarim } from '../lib/oy-deposu.ts';
import { oyKaydet, oyGeriAlZiyaretci } from '../lib/oy-servisi.ts';
import { oylar, engeller } from '../db/schema.ts';

let v: Awaited<ReturnType<typeof testDb>>;
const H = { hedefTuru: 'kanal' as const, hedefId: 'UC' + 'c'.repeat(22) };
before(async () => { v = await testDb(); await v.db.execute((await import('drizzle-orm')).sql`insert into kanallar (id) values (${H.hedefId})`); });
after(async () => { await v.kapat(); });

test('ziyaretçi geri alması sayımdan düşer, yeniden oy verince temizlenir', async () => {
  await oyKaydet(v.db, { ...H, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: 'z1' });
  const r = await oyGeriAlZiyaretci(v.db, { ...H, ogeTuru: 'konu', ogeId: 'spor', tarayiciId: 'z1' });
  assert.deepEqual(r.sayimlar.konular, {});
  assert.equal((await benimOylarim(v.db, 'kanal', H.hedefId, 'z1'))[0].ziyaretciGeriAlindi, true);
  await oyKaydet(v.db, { ...H, ogeTuru: 'konu', ogeId: 'spor', deger: 'down', tarayiciId: 'z1' });
  assert.equal((await benimOylarim(v.db, 'kanal', H.hedefId, 'z1'))[0].ziyaretciGeriAlindi, false);
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.spor, { up: 0, kararsiz: 0, down: 1 });
});

test('moderasyon geri alması kalıcıdır; sahibi yeniden oy veremez', async () => {
  await oyKaydet(v.db, { ...H, ogeTuru: 'etiket', ogeId: 'ai', deger: 'up', tarayiciId: 'z2' });
  const [o] = await v.db.select().from(oylar).where(eq(oylar.tarayiciId, 'z2'));
  await v.db.update(oylar).set({ moderasyonGeriAlindi: true, geriAlmaGerekce: 'test' }).where(eq(oylar.id, o.id));
  await assert.rejects(oyKaydet(v.db, { ...H, ogeTuru: 'etiket', ogeId: 'ai', deger: 'up', tarayiciId: 'z2' }), /moderasyon/i);
});

test('engel aktifken oy sayılmaz, engel kalkınca geri gelir', async () => {
  await v.db.insert(engeller).values({ tur: 'tarayici', deger: 'z3' });
  await oyKaydet(v.db, { ...H, ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId: 'z3' }).catch(() => null);
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.muzik ?? {}, {});
  await v.db.delete(engeller).where(eq(engeller.deger, 'z3'));
  await oyVer(v.db, { ...H, ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId: 'z3' });
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.muzik, { up: 1, kararsiz: 0, down: 0 });
});

test('sayımlar aktif çerez ve IP engelli oyları dışlar, engel kalkınca geri getirir', async () => {
  await oyVer(v.db, { ...H, ogeTuru: 'konu', ogeId: 'bilim', deger: 'up', tarayiciId: 'z4', ipOzeti: 'ip-4' });
  await v.db.insert(engeller).values({ tur: 'tarayici', deger: 'z4' });
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.bilim ?? {}, {});
  await v.db.delete(engeller).where(eq(engeller.deger, 'z4'));
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.bilim, { up: 1, kararsiz: 0, down: 0 });

  await oyVer(v.db, { ...H, ogeTuru: 'konu', ogeId: 'bilim', deger: 'up', tarayiciId: 'z5', ipOzeti: 'ip-5' });
  await v.db.insert(engeller).values({ tur: 'ip', deger: 'ip-5', bitis: new Date(Date.now() + 60_000) });
  assert.deepEqual((await sayimlariGetir(v.db, 'kanal', H.hedefId)).konular.bilim, { up: 1, kararsiz: 0, down: 0 });
});
