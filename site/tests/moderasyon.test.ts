import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oylar, kanallar } from '../db/schema.ts';
import { oyVer, sayimlariGetir, aktifKilit } from '../lib/oy-deposu.ts';
import { oyKaydet } from '../lib/oy-servisi.ts';
import {
  oySatirlari, oyGeriAlModerasyon, kayitKilitle, kayitKilidiniAc,
  engelle, engelleriListele, engelKaldir, moderasyonGecmisi,
} from '../lib/moderasyon-deposu.ts';

const A = 'UC' + 'm'.repeat(22);
const B = 'UC' + 'n'.repeat(22);
const C = 'UC' + 'o'.repeat(22);
const D = 'UC' + 'p'.repeat(22);
const E = 'UC' + 'q'.repeat(22);
let v: Awaited<ReturnType<typeof testDb>>; let admin: string;

before(async () => {
  v = await testDb();
  admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('m@x','x','admin') returning id`)).rows[0].id;
  await v.db.execute(sql`insert into kanallar (id) values (${A}), (${B}), (${C}), (${D}), (${E})`);
});
after(async () => { await v.kapat(); });

async function oy(hedefId: string, cookie: string, ogeTuru: 'konu' | 'etiket', ogeId: string, ipOzeti: string | null = null) {
  await oyVer(v.db, { hedefTuru: 'kanal', hedefId, ogeTuru, ogeId, deger: 'up', tarayiciId: cookie, ipOzeti });
}

test('panel oy satırları yalnızca kısa etiket ve durum döndürür', async () => {
  await oy(A, 's1', 'konu', 'spor', 'hash-s1');
  await oy(A, 's1', 'etiket', 'ai');
  const satirlar = await oySatirlari(v.db, 'kanal', A);
  assert.equal(satirlar.length, 2);
  assert.ok(satirlar.every(s => s.etiket.startsWith('çerez:')));
  assert.ok(satirlar.some(s => s.ipEtiketi?.startsWith('ağ:')));
  assert.equal(JSON.stringify(satirlar).includes('s1'), false);
  assert.equal(JSON.stringify(satirlar).includes('hash-s1'), false);
  assert.equal(satirlar.every(s => s.durum === 'aktif'), true);
});

test('tek oy geri alma yalnızca seçili satırı kapatır', async () => {
  const [spor] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's1'), eq(oylar.hedefId, A), eq(oylar.ogeId, 'spor')));
  const r = await oyGeriAlModerasyon(v.db, { oyId: spor.id, kapsam: 'tek', yapan: admin, gerekce: 'tek test' });
  assert.equal(r.adet, 1);
  const sonra = await oySatirlari(v.db, 'kanal', A);
  assert.equal(sonra.filter(s => s.durum === 'moderasyon-geri-alindi').length, 1);
  assert.equal(sonra.filter(s => s.ogeId === 'ai' && s.durum === 'aktif').length, 1);
  await assert.rejects(
    oyGeriAlModerasyon(v.db, { oyId: spor.id, kapsam: 'tek', yapan: admin, gerekce: 'tekrar' }),
    (e: any) => e.durum === 409,
  );
});

test('çerezin kayıttaki ve tüm sitedeki oyları ayrı kapsamlarla geri alınır', async () => {
  await oy(A, 's2', 'konu', 'spor'); await oy(A, 's2', 'etiket', 'ai'); await oy(B, 's2', 'konu', 'muzik');
  const [aSatir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's2'), eq(oylar.hedefId, A)));
  const kayit = await oyGeriAlModerasyon(v.db, { oyId: aSatir.id, kapsam: 'cerez-kayit', yapan: admin, gerekce: 'kayıt' });
  assert.equal(kayit.adet, 2);
  assert.equal((await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's2'), eq(oylar.hedefId, B))))[0].moderasyonGeriAlindi, false);

  await oy(A, 's3', 'konu', 'spor'); await oy(A, 's3', 'etiket', 'ai'); await oy(B, 's3', 'konu', 'muzik');
  const [bSatir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 's3'), eq(oylar.hedefId, B)));
  const site = await oyGeriAlModerasyon(v.db, { oyId: bSatir.id, kapsam: 'cerez-site', yapan: admin, gerekce: 'site' });
  assert.equal(site.adet, 3);
  const kayitlar = await moderasyonGecmisi(v.db);
  assert.equal(JSON.stringify(kayitlar).includes('s2'), false);
  assert.equal(JSON.stringify(kayitlar).includes('s3'), false);
  await assert.rejects(
    oyGeriAlModerasyon(v.db, { oyId: bSatir.id, kapsam: 'tek', yapan: admin, gerekce: ' ' }),
    (e: any) => e.durum === 422,
  );
});

test('kilit anındaki sonuç donar, açılınca güncel oylar kullanılır', async () => {
  await oy(C, 'k1', 'konu', 'muzik'); await oy(C, 'k2', 'konu', 'muzik'); await oy(C, 'k3', 'konu', 'muzik');
  await kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: C, yapan: admin, gerekce: 'kilit testi' });
  const kilit = await aktifKilit(v.db, 'kanal', C);
  assert.equal((kilit?.sonuc as any)?.anaKonu, 'muzik');
  await oy(C, 'k4', 'konu', 'muzik');
  assert.equal(((await aktifKilit(v.db, 'kanal', C))?.sonuc as any)?.anaKonu, 'muzik');
  await kayitKilidiniAc(v.db, { hedefTuru: 'kanal', hedefId: C, yapan: admin, gerekce: 'aç' });
  assert.equal(await aktifKilit(v.db, 'kanal', C), null);
});

test('çerez engeli oyları gizler, kaldırınca geri getirir; ağ etiketi ipucu vermez', async () => {
  await oy(D, 'b1', 'konu', 'spor', 'hash-b1');
  const [satir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 'b1'), eq(oylar.hedefId, D)));
  const engel = await engelle(v.db, { oyId: satir.id, kapsam: 'cerez', yapan: admin, gerekce: 'engel testi' });
  assert.match(engel.etiket, /^çerez:/);
  assert.equal((await sayimlariGetir(v.db, 'kanal', D)).konular.spor?.up ?? 0, 0);
  await assert.rejects(
    oyKaydet(v.db, { hedefTuru: 'kanal', hedefId: D, ogeTuru: 'konu', ogeId: 'spor', deger: 'down', tarayiciId: 'b1' }),
    (e: any) => e.durum === 403,
  );
  const liste = await engelleriListele(v.db);
  assert.equal(JSON.stringify(liste).includes('hash-b1'), false);
  assert.equal(JSON.stringify(liste).includes('"deger"'), false);
  await engelKaldir(v.db, { engelId: engel.id, yapan: admin, gerekce: 'kaldır' });
  assert.equal((await sayimlariGetir(v.db, 'kanal', D)).konular.spor.up, 1);
  assert.equal((await engelleriListele(v.db)).length, 0);
});

test('ağ engeli IP özetiyle çalışır; IP özeti yoksa reddedilir', async () => {
  await oy(E, 'b2', 'konu', 'spor', 'hash-b2');
  const [satir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 'b2'), eq(oylar.hedefId, E)));
  const ag = await engelle(v.db, { oyId: satir.id, kapsam: 'ag', yapan: admin, gerekce: 'ağ testi' });
  assert.match(ag.etiket, /^ağ:/);
  assert.equal((await sayimlariGetir(v.db, 'kanal', E)).konular.spor?.up ?? 0, 0);
  await engelKaldir(v.db, { engelId: ag.id, yapan: admin, gerekce: 'ağ kaldır' });
  assert.equal((await sayimlariGetir(v.db, 'kanal', E)).konular.spor.up, 1);

  await oy(E, 'b3', 'konu', 'spor');
  const [ipYok] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 'b3'), eq(oylar.hedefId, E)));
  await assert.rejects(
    engelle(v.db, { oyId: ipYok.id, kapsam: 'ag', yapan: admin, gerekce: 'ip yok' }),
    (e: any) => e.durum === 409,
  );
});

// Ek kapsam: hizmetin reddettiği sınır durumları.
test('geçersiz gerekçe, hedef ve bitiş tarihi reddedilir', async () => {
  const [satir] = await v.db.select().from(oylar).where(and(eq(oylar.tarayiciId, 'b2'), eq(oylar.hedefId, E)));

  await assert.rejects(
    kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: C, yapan: admin, gerekce: '  ' }),
    (e: any) => e.durum === 422,
  );
  await assert.rejects(
    kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: 'UC' + 'z'.repeat(22), yapan: admin, gerekce: 'yok' }),
    (e: any) => e.durum === 404,
  );
  await assert.rejects(
    kayitKilidiniAc(v.db, { hedefTuru: 'kanal', hedefId: C, yapan: admin, gerekce: 'aç' }),
    (e: any) => e.durum === 409,
  );
  await assert.rejects(
    engelle(v.db, {
      oyId: satir.id, kapsam: 'cerez', yapan: admin, gerekce: 'geçmiş',
      bitis: new Date(Date.now() - 60_000),
    }),
    (e: any) => e.durum === 422,
  );
  const engel = await engelle(v.db, {
    oyId: satir.id, kapsam: 'cerez', yapan: admin, gerekce: 'süreli',
    bitis: new Date(Date.now() + 60_000),
  });
  assert.match(engel.etiket, /^çerez:/);
  await engelKaldir(v.db, { engelId: engel.id, yapan: admin, gerekce: 'temizlik' });
  assert.equal((await engelleriListele(v.db)).length, 0);
});
