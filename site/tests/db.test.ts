/** Gerçek PostgreSQL motoru (pglite, WASM) üzerinde: geçişler, tekillik kuralları, oy/geri alma/kilit akışı. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { hesaplar, oylar, moderasyonKayitlari, kilitler, kanallar } from '../db/schema.ts';
import { oyVer, sayimlariGetir, benimOylarim, oylariGeriAl, kilitle, kilidiAc, aktifKilit } from '../lib/oy-deposu.ts';
import { taksonomi } from '../lib/ortak.ts';
import { sonucHesapla, durumBul } from '../lib/oy-hesabi.ts';

const KS = taksonomi.KONULAR.map(k => k.id);
const ES = taksonomi.ETIKETLER.map(e => e.id);
const KANAL = 'UCfYNqluOf8EbQkL44otydMw';
const H = { hedefTuru: 'kanal' as const, hedefId: KANAL };

let pg: PGlite; let db: ReturnType<typeof drizzle>; let editorId: string;

before(async () => {
  pg = new PGlite();
  db = drizzle(pg);
  await migrate(db, { migrationsFolder: fileURLToPath(new URL('../db/gecisler', import.meta.url)) });
  const [e] = await db.insert(hesaplar).values({ eposta: 'Editor@Ornek.com', parolaOzeti: 'x', rol: 'editor' }).returning();
  editorId = e.id;
  await db.insert(kanallar).values({ id: KANAL, handle: '@TRTSpor', ad: 'TRT Spor', ekleyen: editorId });
});
after(async () => { await pg.close(); });

const tarayici = (n: number) => `tarayici-${n}`;
// Drizzle hatayı sarar; gerçek PostgreSQL hata kodu cause içindedir. 23505 = benzersizlik (unique) ihlali.
const tekillikIhlali = (e: any) => (e?.cause?.code ?? e?.code) === '23505';

test('aynı tarayıcı ikinci kez oy verince yeni satır açılmaz, eski oy güncellenir', async () => {
  await oyVer(db, { ...H, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: tarayici(1) });
  await oyVer(db, { ...H, ogeTuru: 'konu', ogeId: 'spor', deger: 'down', tarayiciId: tarayici(1) });
  const satirlar = await db.select().from(oylar).where(eq(oylar.tarayiciId, tarayici(1)));
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].deger, 'down');
  assert.deepEqual(await benimOylarim(db, 'kanal', KANAL, tarayici(1)), [{ ogeTuru: 'konu', ogeId: 'spor', deger: 'down' }]);
});

test('veritabanı da tekilliği zorlar (uygulamayı atlayan çift yazma reddedilir)', async () => {
  const satir = { hedefTuru: 'kanal' as const, hedefId: KANAL, ogeTuru: 'konu' as const, ogeId: 'spor', deger: 'up' as const, tarayiciId: tarayici(1) };
  await assert.rejects(db.insert(oylar).values(satir), tekillikIhlali);
});

test('bilinmeyen konu/etiket kimliği ve geçersiz değer oy olarak YAZILMAZ', async () => {
  await assert.rejects(oyVer(db, { ...H, ogeTuru: 'konu', ogeId: 'olmayan', deger: 'up', tarayiciId: tarayici(2) }), /Bilinmeyen/);
  await assert.rejects(oyVer(db, { ...H, ogeTuru: 'etiket', ogeId: 'spor', deger: 'up', tarayiciId: tarayici(2) }), /Bilinmeyen/); // spor bir konudur
  await assert.rejects(oyVer(db, { ...H, ogeTuru: 'konu', ogeId: 'spor', deger: 'sevdim' as any, tarayiciId: tarayici(2) }), /Geçersiz oy/);
});

test('kanal oyları videoya yansımaz (hedef türü + kimlik ayrı)', async () => {
  await oyVer(db, { hedefTuru: 'video', hedefId: 'dQw4w9WgXcQ', ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId: tarayici(3) });
  assert.deepEqual((await sayimlariGetir(db, 'video', 'dQw4w9WgXcQ')).konular, { muzik: { up: 1, kararsiz: 0, down: 0 } });
  assert.deepEqual((await sayimlariGetir(db, 'kanal', 'dQw4w9WgXcQ')).konular, {});
});

test('uçtan uca: veritabanı sayımı + oy hesabı = beklenen sonuç, geri alma sonucu değiştirir', async () => {
  // Temiz hedef: 4 tarayıcı spor'a up, 1 down, 1 kararsız; 3 tarayıcı AI etiketine up.
  const hedef = { hedefTuru: 'kanal' as const, hedefId: 'UC' + 'x'.repeat(22) };
  await db.insert(kanallar).values({ id: hedef.hedefId });
  const ver = (n: number, ogeTuru: 'konu' | 'etiket', ogeId: string, deger: 'up' | 'kararsiz' | 'down') =>
    oyVer(db, { ...hedef, ogeTuru, ogeId, deger, tarayiciId: `u${n}` });
  for (const n of [1, 2, 3, 4]) await ver(n, 'konu', 'spor', 'up');
  await ver(5, 'konu', 'spor', 'down'); await ver(6, 'konu', 'spor', 'kararsiz');
  for (const n of [1, 2, 3]) await ver(n, 'etiket', 'ai', 'up');

  let s = await sayimlariGetir(db, hedef.hedefTuru, hedef.hedefId);
  assert.deepEqual(s.konular.spor, { up: 4, kararsiz: 1, down: 1 });
  let r = sonucHesapla(s.konular, s.etiketler, KS, ES);
  assert.equal(r.anaKonu, 'spor'); assert.deepEqual(r.etiketler, ['ai']);

  // Editör u1, u2 ve u3'ün oylarını geri alır (manipülasyon): AI etiketi eşik altına düşer.
  for (const n of [1, 2]) assert.equal(await oylariGeriAl(db, { ...hedef, tarayiciId: `u${n}`, yapan: editorId, gerekce: 'şüpheli oy' }), 2);
  s = await sayimlariGetir(db, hedef.hedefTuru, hedef.hedefId);
  assert.equal(durumBul(s.etiketler.ai), 'esik-alti');
  r = sonucHesapla(s.konular, s.etiketler, KS, ES);
  assert.deepEqual(r.etiketler, []);
  // Geri alınan oy silinmedi, işaretlendi; moderasyon kaydı yazıldı.
  assert.equal((await db.select().from(oylar).where(eq(oylar.geriAlindi, true))).length, 4);
  assert.equal((await db.select().from(moderasyonKayitlari)).filter(m => m.islem === 'oy-geri-al').length, 2);
  // Geri alınmış oyun sahibi tekrar oy verse de oy geri alınmış kalır.
  await ver(1, 'konu', 'spor', 'up');
  assert.equal((await db.select().from(oylar).where(eq(oylar.tarayiciId, 'u1'))).every(o => o.geriAlindi), true);
  s = await sayimlariGetir(db, hedef.hedefTuru, hedef.hedefId);
  assert.deepEqual(s.konular.spor, { up: 2, kararsiz: 1, down: 1 });
});

test('geri alma gerekçesiz yapılamaz', async () => {
  await assert.rejects(oylariGeriAl(db, { ...H, tarayiciId: 'u1', yapan: editorId, gerekce: '  ' }), /Gerekçe/);
});

test('kilit: aynı hedefte tek aktif kilit, açılınca yenisi konabilir, kilit anındaki sonuç saklanır', async () => {
  const sonuc = { anaKonu: 'spor', yanKonular: [], etiketler: [], kararsizKonular: [], kararsizEtiketler: [] };
  assert.equal(await aktifKilit(db, 'kanal', KANAL), null);
  await kilitle(db, { ...H, yapan: editorId, gerekce: 'saldırı', sonuc });
  assert.deepEqual((await aktifKilit(db, 'kanal', KANAL))?.sonuc, sonuc);
  await assert.rejects(kilitle(db, { ...H, yapan: editorId, gerekce: 'ikinci', sonuc }), tekillikIhlali);
  assert.equal(await kilidiAc(db, { ...H, yapan: editorId, gerekce: 'saldırı bitti' }), true);
  assert.equal(await aktifKilit(db, 'kanal', KANAL), null);
  assert.equal(await kilidiAc(db, { ...H, yapan: editorId, gerekce: 'tekrar' }), false);   // zaten açık
  await kilitle(db, { ...H, yapan: editorId, gerekce: 'yeni saldırı', sonuc });             // yeni kilit mümkün
  assert.equal((await db.select().from(kilitler).where(eq(kilitler.hedefId, KANAL))).length, 2);
});

test('hesap e-postası büyük/küçük harf duyarsız tekildir', async () => {
  await assert.rejects(db.insert(hesaplar).values({ eposta: 'EDITOR@ornek.com', parolaOzeti: 'y', rol: 'admin' }), tekillikIhlali);
});
