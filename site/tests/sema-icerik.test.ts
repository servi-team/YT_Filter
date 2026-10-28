import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('oy geri alma alanları ve arşiv alanları vardır', async () => {
  const r = await v.db.execute(sql`select table_name, column_name from information_schema.columns where table_name in ('oylar','kanallar','videolar','ekleme_talepleri','yayin_surumleri')`);
  const c = (r.rows ?? r).map((x: any) => `${x.table_name}.${x.column_name}`);
  for (const ad of ['oylar.ziyaretci_geri_alindi','oylar.moderasyon_geri_alindi','oylar.geri_alan','oylar.geri_alma_gerekce','oylar.geri_alma_zamani','kanallar.avatar','kanallar.meta_guncelleme','kanallar.arsivlendi','kanallar.arsivleyen','videolar.kanal_adi','videolar.kanal_handle','videolar.kanal_avatar','videolar.meta_guncelleme','videolar.arsivlendi','videolar.arsivleyen','ekleme_talepleri.red_gerekce','yayin_surumleri.notlar']) assert.ok(c.includes(ad), ad);
  assert.ok(!c.includes('oylar.geri_alindi'));
});

test('videolar.kanal_id foreign key değildir', async () => {
  const r = await v.db.execute(sql`select count(*)::int as n from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey) where c.conrelid='videolar'::regclass and c.contype='f' and a.attname='kanal_id'`);
  assert.equal((r.rows ?? r)[0].n, 0);
});
