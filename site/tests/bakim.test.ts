import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { bakimYap } from '../lib/bakim.ts';

const K = 'UC' + 'y'.repeat(22);

test('bakım 30 günlük IP özetini siler, süresi dolmuş oturum/engel/hız penceresini temizler', async () => {
  const v = await testDb();
  try {
    const hesap = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('bakim@x','x','admin') returning id`)).rows[0].id;
    await v.db.execute(sql`insert into kanallar (id) values (${K})`);
    await v.db.execute(sql`
      insert into oylar (hedef_turu, hedef_id, oge_turu, oge_id, deger, tarayici_id, ip_ozeti, olusturma, guncelleme) values
        ('kanal', ${K}, 'konu', 'spor', 'up', 'eski', 'eski-hash', now() - interval '31 days', now() - interval '31 days'),
        ('kanal', ${K}, 'konu', 'muzik', 'up', 'yeni', 'yeni-hash', now(), now())
    `);
    await v.db.execute(sql`
      insert into oturumlar (token_ozeti, hesap_id, son_kullanma, son_gorulme) values
        ('eski-token', ${hesap}, now() - interval '1 day', now() - interval '2 days'),
        ('yeni-token', ${hesap}, now() + interval '1 day', now())
    `);
    await v.db.execute(sql`
      insert into engeller (tur, deger, bitis) values
        ('tarayici', 'eski-engel', now() - interval '1 hour'),
        ('tarayici', 'suresiz-engel', null)
    `);
    await v.db.execute(sql`
      insert into hiz_limitleri (anahtar, pencere, sayac) values
        ('eski-pencere', now() - interval '3 days', 1),
        ('yeni-pencere', now(), 1)
    `);

    const sonuc = await bakimYap(v.db);
    assert.deepEqual(sonuc, { ipOzeti: 1, oturum: 1, engel: 1, hizLimiti: 1 });

    const oylar = (await v.db.execute(sql`select tarayici_id, ip_ozeti from oylar order by tarayici_id`)).rows as any[];
    assert.equal(oylar.find(o => o.tarayici_id === 'eski').ip_ozeti, null);
    assert.equal(oylar.find(o => o.tarayici_id === 'yeni').ip_ozeti, 'yeni-hash');
    assert.equal((await v.db.execute(sql`select count(*)::int as n from oturumlar where token_ozeti = 'eski-token'`)).rows[0].n, 0);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from oturumlar where token_ozeti = 'yeni-token'`)).rows[0].n, 1);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from engeller where deger = 'eski-engel'`)).rows[0].n, 0);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from engeller where deger = 'suresiz-engel'`)).rows[0].n, 1);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from hiz_limitleri where anahtar = 'eski-pencere'`)).rows[0].n, 0);
    assert.equal((await v.db.execute(sql`select count(*)::int as n from hiz_limitleri where anahtar = 'yeni-pencere'`)).rows[0].n, 1);

    assert.deepEqual(await bakimYap(v.db), { ipOzeti: 0, oturum: 0, engel: 0, hizLimiti: 0 });
  } finally { await v.kapat(); }
});
