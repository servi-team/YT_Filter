import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { talepOlustur } from '../lib/talep-deposu.ts';
import { eklemeTalepleri } from '../db/schema.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('aynı link tek talepte birleşir', async () => {
  const p = { link: 'https://youtu.be/dQw4w9WgXcQ', cozulen: { tur: 'video' as const, id: 'dQw4w9WgXcQ' }, tarayiciId: 'z', ipOzeti: null };
  const a = await talepOlustur(v.db, p);
  const b = await talepOlustur(v.db, p);
  assert.equal(a.durum, 'talep'); assert.equal(b.durum, 'talep');
  if (a.durum === 'talep' && b.durum === 'talep') { assert.equal(a.yeni, true); assert.equal(b.yeni, false); assert.equal(a.talepId, b.talepId); }
  assert.equal((await v.db.select().from(eklemeTalepleri)).length, 1);
  assert.equal((await v.db.select().from(eklemeTalepleri))[0].talepSayisi, 2);
});

test('handle metadata ile UC kimliğine çözülür; çözülemezse hata', async () => {
  const meta = async () => ({ tur: 'kanal' as const, id: 'UC' + 'f'.repeat(22), ad: 'Kanal', handle: '@k', avatar: null });
  const r = await talepOlustur(v.db, { link: 'https://youtube.com/@k', cozulen: { tur: 'kanal', handle: '@k' }, metaCozucu: meta, tarayiciId: 'z2', ipOzeti: null });
  assert.equal(r.durum, 'talep');
  const kayitlar = await v.db.select().from(eklemeTalepleri);
  assert.equal(kayitlar.some(k => k.anahtar === 'UC' + 'f'.repeat(22)), true);
  await assert.rejects(talepOlustur(v.db, { link: 'https://youtube.com/@yok', cozulen: { tur: 'kanal', handle: '@yok' }, metaCozucu: async () => ({ tur: 'hata', neden: 'yok' }), tarayiciId: 'z3', ipOzeti: null }), /Kanal kimliği/);
});
