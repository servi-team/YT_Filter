import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { parolaOzetle, parolaDogrula, parolaGecerliMi } from '../lib/parola.ts';
import { girisYap, oturumOku, oturumKapat, oturumCerezi, OTURUM_CEREZI } from '../lib/oturum.ts';
import { kullaniciGerekli, rolGerekli, panelKoruma } from '../lib/yetki.ts';
import { HttpHatasi } from '../lib/hata.ts';

let v: Awaited<ReturnType<typeof testDb>>; let hesapId: string;
before(async () => {
  v = await testDb();
  const ozet = await parolaOzetle('DogruParola123');
  const r = await v.db.execute(sql`insert into hesaplar (eposta, parola_ozeti, rol) values ('Admin@Ornek.com', ${ozet}, 'admin') returning id`);
  hesapId = r.rows[0].id;
});
after(async () => { await v.kapat(); });

test('scrypt özeti doğrular, yanlış parolayı reddeder', async () => {
  assert.equal(parolaGecerliMi('kisa'), false);
  assert.equal(await parolaDogrula('DogruParola123', await parolaOzetle('DogruParola123')), true);
  assert.equal(await parolaDogrula('yanlis', await parolaOzetle('DogruParola123')), false);
});
test('giriş tokenı yalnızca özet olarak saklanır, süre ve rol kontrol edilir', async () => {
  const g = await girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'DogruParola123', ipOzeti: null, simdi: new Date('2026-10-27T10:00:00Z') });
  const satir = await v.db.execute(sql`select token_ozeti from oturumlar where hesap_id = ${hesapId}`);
  assert.notEqual(satir.rows[0].token_ozeti, g.token);
  assert.equal((await oturumOku(v.db, g.token, new Date('2026-10-27T10:01:00Z')))?.rol, 'admin');
  assert.equal(await oturumOku(v.db, g.token, new Date('2026-12-01T10:00:00Z')), null);
  const c = oturumCerezi(g.token, g.sonKullanma);
  assert.ok(c.includes('HttpOnly') && c.includes('SameSite=Lax'));
  const req = new Request('http://localhost:3000/panel', { headers: { cookie: `${OTURUM_CEREZI}=${g.token}` } });
  assert.equal((await rolGerekli(v.db, req, ['admin'])).id, hesapId);
  await assert.rejects(rolGerekli(v.db, req, ['editor']), (e: any) => e instanceof HttpHatasi && e.durum === 403);
  const panelSimdi = new Date('2026-10-27T10:01:00Z');
  assert.equal((await panelKoruma(v.db, req, ['admin'], { adet: 1, simdi: panelSimdi })).id, hesapId);
  await assert.rejects(panelKoruma(v.db, req, ['admin'], { adet: 1, simdi: panelSimdi }), (e: any) => e instanceof HttpHatasi && e.durum === 429);
  await oturumKapat(v.db, g.token);
  assert.equal(await oturumOku(v.db, g.token, new Date('2026-10-27T10:02:00Z')), null); // çıkış/iptal sonrası
});
