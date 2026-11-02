import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { oyVer } from '../lib/oy-deposu.ts';
import { kayitKilitle } from '../lib/moderasyon-deposu.ts';
import { icerikGetir, icerikListele } from '../lib/icerik-deposu.ts';
import { adminIcerikListele, icerikArsivle, icerikGeriGetir, metadataGuncelle } from '../lib/arsiv-deposu.ts';

const K = 'UC' + 's'.repeat(22);

test('arşiv kamusal listeden çıkarır, oy ve kilidi korur; geri getirir', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id, ad) values (${K}, 'Arşiv Kanal')`);
    for (const c of ['a1', 'a2', 'a3']) await oyVer(v.db, { hedefTuru: 'kanal', hedefId: K, ogeTuru: 'konu', ogeId: 'spor', deger: 'up', tarayiciId: c });
    await kayitKilitle(v.db, { hedefTuru: 'kanal', hedefId: K, yapan: admin, gerekce: 'test kilidi' });
    await v.db.execute(sql`insert into yayin_surumleri (veri_surumu, kanal_sayisi, video_sayisi, icerik) values (1, 1, 0, '{"sema":1,"veriSurumu":1,"kanallar":[],"videolar":[]}'::jsonb)`);

    await icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'arsiv testi' });
    assert.equal(await icerikGetir(v.db, 'kanal', K), null);
    assert.equal((await icerikListele(v.db, { arama: 'arsiv' })).toplam, 0);
    const arsiv = await adminIcerikListele(v.db, { durum: 'arsiv', arama: 'arsiv' });
    assert.equal(arsiv.length, 1);
    assert.equal(arsiv[0].oySayisi, 3);
    assert.equal(arsiv[0].kilitli, true);
    const oy = (await v.db.execute(sql`select count(*)::int as n from oylar where hedef_id = ${K}`)).rows[0].n;
    assert.equal(oy, 3);
    const yayin = (await v.db.execute(sql`select icerik from yayin_surumleri where veri_surumu = 1`)).rows[0].icerik;
    assert.deepEqual(yayin, { sema: 1, veriSurumu: 1, kanallar: [], videolar: [] });
    await assert.rejects(icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'tekrar' }), (e: any) => e.durum === 409);
    await assert.rejects(icerikArsivle(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: ' ' }), (e: any) => e.durum === 422);

    await icerikGeriGetir(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'geri getir' });
    const aktif = await icerikGetir(v.db, 'kanal', K);
    assert.ok(aktif);
    assert.equal((await adminIcerikListele(v.db, { durum: 'aktif', arama: 'arsiv' }))[0].oySayisi, 3);
    await assert.rejects(icerikGeriGetir(v.db, { tur: 'kanal', id: K, yapan: admin, gerekce: 'tekrar' }), (e: any) => e.durum === 409);
  } finally { await v.kapat(); }
});

test('metadata düzeltme video için kanal satırı açmaz', async () => {
  const v = await testDb();
  try {
    const admin = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('a@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into videolar (id, baslik, kanal_id) values ('dQw4w9WgXcQ', 'Eski', ${'UC' + 't'.repeat(22)})`);
    await metadataGuncelle(v.db, {
      tur: 'video', id: 'dQw4w9WgXcQ', baslik: 'Yeni Video',
      kanalAdi: 'Kanal', kanalHandle: '@kanal', kanalAvatar: 'https://yt3.ggpht.com/a', yapan: admin,
    });
    const video = (await v.db.execute(sql`select baslik, kanal_adi, kanal_handle, kanal_avatar, meta_guncelleme from videolar where id = 'dQw4w9WgXcQ'`)).rows[0];
    assert.equal(video.baslik, 'Yeni Video');
    assert.equal(video.kanal_adi, 'Kanal');
    assert.ok(video.meta_guncelleme);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from kanallar`)).rows[0].n, 0);
  } finally { await v.kapat(); }
});
