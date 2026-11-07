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
  // Sabit tarih kullanmayın: rolGerekli/oturumOku gerçek "şimdi"yi kullanır.
  const simdi = new Date();
  const birDakikaSonra = new Date(simdi.getTime() + 60_000);
  const otuzBirGunSonra = new Date(simdi.getTime() + 31 * 24 * 60 * 60 * 1000);
  const g = await girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'DogruParola123', ipOzeti: null, simdi });
  const satir = await v.db.execute(sql`select token_ozeti from oturumlar where hesap_id = ${hesapId}`);
  assert.notEqual(satir.rows[0].token_ozeti, g.token);
  assert.equal((await oturumOku(v.db, g.token, birDakikaSonra))?.rol, 'admin');
  assert.equal(await oturumOku(v.db, g.token, otuzBirGunSonra), null);
  const c = oturumCerezi(g.token, g.sonKullanma);
  assert.ok(c.includes('HttpOnly') && c.includes('SameSite=Lax'));
  const req = new Request('http://localhost:3000/panel', { headers: { cookie: `${OTURUM_CEREZI}=${g.token}` } });
  assert.equal((await rolGerekli(v.db, req, ['admin'])).id, hesapId);
  await assert.rejects(rolGerekli(v.db, req, ['editor']), (e: any) => e instanceof HttpHatasi && e.durum === 403);
  const panelSimdi = birDakikaSonra;
  assert.equal((await panelKoruma(v.db, req, ['admin'], { adet: 1, simdi: panelSimdi })).id, hesapId);
  await assert.rejects(panelKoruma(v.db, req, ['admin'], { adet: 1, simdi: panelSimdi }), (e: any) => e instanceof HttpHatasi && e.durum === 429);
  await oturumKapat(v.db, g.token);
  assert.equal(await oturumOku(v.db, g.token, new Date(simdi.getTime() + 2 * 60_000)), null); // çıkış/iptal sonrası
});
