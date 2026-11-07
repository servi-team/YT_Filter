import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { aramaAnahtari, icerikListele, icerikGetir, sonIcerikler, siteIstatistikleri, videoKapak } from '../lib/icerik-deposu.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => {
  v = await testDb();
  await v.db.execute(sql`insert into kanallar (id, ad, handle, arsivlendi) values ('UC'||repeat('a',22), 'İnci Şölen', '@inci', false), ('UC'||repeat('b',22), 'Arşiv Kanal', '@arsiv', true)`);
  await v.db.execute(sql`insert into videolar (id, baslik, kanal_id, kanal_adi, arsivlendi) values ('dQw4w9WgXcQ', 'Örnek Video', 'UC'||repeat('a',22), 'İnci Şölen', false)`);
});
after(async () => { await v.kapat(); });

test('Türkçe arama katlaması İ/ı/ş/ğ duyarsızdır', () => {
  assert.equal(aramaAnahtari('İNCİ ŞÖLEN'), 'inci solen');
  assert.equal(aramaAnahtari('ığdır'), 'igdir');
});
test('liste arşivi dışlar, tür ve arama filtreler', async () => {
  const hepsi = await icerikListele(v.db, {});
  assert.equal(hepsi.toplam, 2);
  assert.ok(!hepsi.kayitlar.some(k => k.arsivlendi));
  const arama = await icerikListele(v.db, { arama: 'inci' });
  assert.deepEqual(arama.kayitlar.map(k => k.id).sort(), ['UC' + 'a'.repeat(22), 'dQw4w9WgXcQ'].sort());
  const video = await icerikListele(v.db, { tur: 'video' });
  assert.deepEqual(video.kayitlar.map(k => k.id), ['dQw4w9WgXcQ']);
});
test('detay arşivli kaydı gizler, arşiv modunda gösterir', async () => {
  assert.equal(await icerikGetir(v.db, 'kanal', 'UC' + 'b'.repeat(22)), null);
  assert.ok(await icerikGetir(v.db, 'kanal', 'UC' + 'b'.repeat(22), { durum: 'arsiv' }));
});
test('video kapağı YouTube adresidir', () => assert.equal(videoKapak('dQw4w9WgXcQ'), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'));
