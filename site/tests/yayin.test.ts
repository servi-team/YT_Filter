import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oyVer } from '../lib/oy-deposu.ts';
import { kayitKilitle } from '../lib/moderasyon-deposu.ts';
import { icerikArsivle } from '../lib/arsiv-deposu.ts';
import { yayinAdayiUret, yayinla, sonYayin, yayinGetir, yayinGecmisi } from '../lib/yayin-deposu.ts';

const K = 'UC' + 'u'.repeat(22);
const K2 = 'UC' + 'v'.repeat(22);
const A = 'UC' + 'w'.repeat(22);

test('önizleme yalnızca aktif kaydı alır, kilidi kullanır ve geçersiz taksonomiyi reddeder', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id, ad, arsivlendi) values (${K}, 'Aktif', false), (${A}, 'Arşiv', true)`);
    for (const c of ['p1', 'p2', 'p3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    await v.db.execute(sql`insert into videolar (id) values ('dQw4w9WgXcQ')`);
    await oyVer(v.db, { hedefTuru: 'video', hedefId: 'dQw4w9WgXcQ', ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: 'v1' });
    await oyVer(v.db, { hedefTuru: 'video', hedefId: 'dQw4w9WgXcQ', ogeTuru: 'konu', ogeId: 'muzik', deger: 'up', tarayiciId: 'v2' });
    await kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: K, yapan: admin, gerekce: 'kilit' });
    for (const c of ['p4', 'p5', 'p6']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'muzik', deger: 'down', tarayiciId: c });

    const aday = await yayinAdayiUret(v.db);
    assert.equal(aday.gecerli, true);
    assert.equal(aday.veriSurumu, 1);
    assert.equal(aday.ozet.kanal, 1);
    assert.equal(aday.ozet.video, 0);
    assert.equal(aday.ozet.yazilmayan, 1);
    const kanal = (aday.icerik.kanallar as any[])[0];
    assert.equal(kanal.id, K);
    assert.equal(kanal.anaKonu, 'spor');
    assert.equal((aday.icerik.kanallar as any[]).some(k => k.id === A), false);

    await v.db.execute(sql`insert into kanallar (id) values (${K2})`);
    // Bilinmeyen taksonomi kimliğini oyVer doğrulamada reddeder; bozuk veriyi taklit etmek için ham SQL kullan.
    for (const c of ['b1', 'b2', 'b3']) await v.db.execute(sql`insert into oylar (hedef_turu, hedef_id, oge_turu, oge_id, deger, tarayici_id) values ('kanal', ${K2}, 'konu', 'bilinmeyen', 'up', ${c})`);
    const bozuk = await yayinAdayiUret(v.db);
    assert.equal(bozuk.gecerli, false);
    assert.ok(bozuk.hatalar.length > 0);
    await assert.rejects(yayinla(v.db, { onaylayan: admin }), (e: any) => e.durum === 422);
  } finally { await v.kapat(); }
});

test('yayın sürümü artar, eski sürüm değişmez, arşiv yeni sürümden çıkar', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id) values (${K})`);
    for (const c of ['y1', 'y2', 'y3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    const bir = await yayinla(v.db, { notlar: 'ilk', onaylayan: admin });
    assert.equal(bir.veriSurumu, 1);
    assert.equal(bir.indirmeAdi, 'yt-filter-db-v1.json');
    assert.equal((await sonYayin(v.db))?.veriSurumu, 1);

    await icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'yayın testi' });
    const iki = await yayinla(v.db, { notlar: 'ikinci', onaylayan: admin });
    assert.equal(iki.veriSurumu, 2);
    assert.equal((iki.icerik as any).veriSurumu, 2);
    assert.equal((iki.icerik.kanallar as any[]).length, 0);
    assert.equal((await yayinGetir(v.db, 1))?.icerik.kanallar.length, 1);
    assert.equal((await yayinGetir(v.db, 1))?.icerik.veriSurumu, 1);
    assert.equal((await yayinGecmisi(v.db)).length, 2);
  } finally { await v.kapat(); }
});

test('eşzamanlı iki yayın aynı sürüm numarasını üretmez', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id) values (${K})`);
    for (const c of ['z1', 'z2', 'z3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    const sonuc = await Promise.allSettled([yayinla(v.db, { onaylayan: admin }), yayinla(v.db, { onaylayan: admin })]);
    const basarili = sonuc.filter((s): s is PromiseFulfilledResult<any> => s.status === 'fulfilled').map(s => s.value.veriSurumu);
    assert.ok(basarili.length >= 1);
    assert.equal(new Set(basarili).size, basarili.length);
    const satirlar = await v.db.execute(sql`select veri_surumu, icerik from yayin_surumleri order by veri_surumu`);
    assert.equal(new Set(satirlar.rows.map((r: any) => r.veri_surumu)).size, satirlar.rows.length);
    for (const r of satirlar.rows as any[]) assert.equal(r.icerik.veriSurumu, r.veri_surumu);
  } finally { await v.kapat(); }
});
