import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { talepOlustur, talepIsle } from '../lib/talep-deposu.ts';

let v: Awaited<ReturnType<typeof testDb>>; let editor: string;
before(async () => { v = await testDb(); editor = (await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('e@x','x','editor') returning id`)).rows[0].id; });
after(async () => { await v.kapat(); });

test('kabul video kaydı oluşturur, kanal satırı açmaz; red gerekçe ister', async () => {
  const t = await talepOlustur(v.db, { link: 'https://youtu.be/dQw4w9WgXcQ', cozulen: { tur: 'video', id: 'dQw4w9WgXcQ' }, tarayiciId: 'z', ipOzeti: null });
  if (t.durum !== 'talep') throw new Error('talep bekleniyordu');
  const meta = async () => ({ tur: 'video' as const, id: 'dQw4w9WgXcQ', baslik: 'V', kanalId: 'UC' + 'i'.repeat(22), kanalAdi: 'K', kanalHandle: null, kanalAvatar: null });
  const r = await talepIsle(v.db, { talepId: t.talepId, karar: 'kabul', yapan: editor, metaCozucu: meta });
  assert.equal(r.durum, 'kabul');
  assert.equal((await v.db.execute(sql`select count(*)::int as n from kanallar`)).rows[0].n, 0);
  await assert.rejects(talepIsle(v.db, { talepId: t.talepId, karar: 'red', yapan: editor }), (e: any) => e?.durum === 409 && e?.kod === 'islenmis');
});
