import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { hesaplar } from '../db/schema.ts';
import { HttpHatasi } from '../lib/hata.ts';
import { parolaDogrula } from '../lib/parola.ts';
import { testDb } from './yardim.ts';
import { ilkAdminOlustur } from '../lib/hesap-deposu.ts';
import {
  SAHTE_PAROLA_OZETI,
  girisDogrulamaOzeti,
  girisYap,
  parolaDegistir,
} from '../lib/oturum.ts';

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

test('bilinmeyen e-posta ve pasif hesap aynı genel 401 hatasını verir', async () => {
  await assert.rejects(
    girisYap(v.db, { eposta: 'yok@ornek.com', parola: 'HerhangiParola123', ipOzeti: null }),
    (hata) => hata instanceof HttpHatasi && hata.durum === 401 && hata.kod === 'giris-hatali',
  );

  await v.db.update(hesaplar).set({ aktif: false }).where(eq(hesaplar.eposta, 'admin@ornek.com'));

  await assert.rejects(
    girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'YeniParola1234', ipOzeti: null }),
    (hata) => hata instanceof HttpHatasi && hata.durum === 401 && hata.kod === 'giris-hatali',
  );
  await assert.rejects(
    girisYap(v.db, { eposta: 'admin@ornek.com', parola: 'yanlis', ipOzeti: null }),
    (hata) => hata instanceof HttpHatasi && hata.durum === 401 && hata.kod === 'giris-hatali',
  );
});

test('giriş doğrulaması bilinmeyen hesapta da geçerli sahte özet kullanır', async () => {
  assert.match(SAHTE_PAROLA_OZETI, /^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.equal(await parolaDogrula('yanlis', SAHTE_PAROLA_OZETI), false);
  assert.equal(girisDogrulamaOzeti(null), SAHTE_PAROLA_OZETI);
  assert.equal(girisDogrulamaOzeti({ parolaOzeti: 'gercek-ozet' }), 'gercek-ozet');
});
