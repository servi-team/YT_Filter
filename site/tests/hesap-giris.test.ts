import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { testDb } from './yardim.ts';
import { ilkAdminOlustur } from '../lib/hesap-deposu.ts';
import { girisYap, parolaDegistir } from '../lib/oturum.ts';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('ilk admin yalnızca hiç hesap yokken oluşturulur ve ilk girişte parola değiştirmelidir', async () => {
  const a = await ilkAdminOlustur(v.db, { eposta: 'Admin@Ornek.com', parola: 'GeciciParola123' });
  assert.equal(a.rol, 'admin');
  await assert.rejects(ilkAdminOlustur(v.db, { eposta: 'b@ornek.com', parola: 'GeciciParola123' }), /zaten/i);
  const g = await girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'GeciciParola123', ipOzeti: null });
  assert.equal(g.kullanici.parolaDegistirmeli, true);
  await parolaDegistir(v.db, { hesapId: g.kullanici.id, mevcutParola: 'GeciciParola123', yeniParola: 'YeniParola1234', token: g.token });
  const g2 = await girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'YeniParola1234', ipOzeti: null });
  assert.equal(g2.kullanici.parolaDegistirmeli, false);
});
