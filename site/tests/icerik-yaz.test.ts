import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { icerikEkle } from '../lib/icerik-yaz.ts';
import { kanallar, videolar, oylar } from '../db/schema.ts';

let v: Awaited<ReturnType<typeof testDb>>; let editor: string;
before(async () => { v = await testDb(); editor = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x','x','editor') returning id`)).rows[0].id; });
after(async () => { await v.kapat(); });

test('video eklemek kanal satırı oluşturmaz; kanal bilgisi videoda durur', async () => {
  const r = await icerikEkle(v.db, { cozulen: { tur: 'video', id: 'dQw4w9WgXcQ' }, meta: { tur: 'video', id: 'dQw4w9WgXcQ', baslik: 'V', kanalId: 'UC' + 'g'.repeat(22), kanalAdi: 'K', kanalHandle: '@k', kanalAvatar: null }, ekleyen: editor });
  assert.equal(r.durum, 'eklendi');
  assert.equal((await v.db.select().from(kanallar)).length, 0);
  assert.equal((await v.db.select().from(videolar))[0].kanalAdi, 'K');
});

test('metadata boşken video yalnızca kimlikle eklenir, alanlar null kalır', async () => {
  const r = await icerikEkle(v.db, { cozulen: { tur: 'video', id: 'aaaaaaaaaaa' }, meta: { tur: 'video', id: 'aaaaaaaaaaa', baslik: null, kanalId: null, kanalAdi: null, kanalHandle: null, kanalAvatar: null }, ekleyen: editor });
  assert.equal(r.durum, 'eklendi');
  const s = (await v.db.select().from(videolar)).find(x => x.id === 'aaaaaaaaaaa')!;
  assert.equal(s.baslik, null);
  assert.equal(s.kanalId, null);
  assert.equal(s.kanalAdi, null);
});

test('arşivli kayıt aynı linkle geri gelir, oylar korunur', async () => {
  const id = 'UC' + 'h'.repeat(22);
  await v.db.execute(sql`insert into kanallar (id, ad, arsivlendi) values (${id}, 'Eski', true)`);
  await v.db.execute(sql`insert into oylar (hedef_turu, hedef_id, oge_turu, oge_id, deger, tarayici_id) values ('kanal', ${id}, 'konu', 'spor', 'up', 'z')`);
  const r = await icerikEkle(v.db, { cozulen: { tur: 'kanal', id }, meta: { tur: 'kanal', id, ad: 'Yeni', handle: '@y', avatar: null }, ekleyen: editor });
  assert.equal(r.durum, 'arsivden');
  const k = (await v.db.select().from(kanallar)).find(x => x.id === id)!;
  assert.equal(k.arsivlendi, false); assert.equal(k.ad, 'Yeni');
  assert.equal((await v.db.select().from(oylar)).length, 1);
});
