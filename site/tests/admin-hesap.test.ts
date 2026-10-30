import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { testDb } from './yardim.ts';
import { ilkAdminOlustur, hesapOlustur, hesapGuncelle, hesaplariListele } from '../lib/hesap-deposu.ts';
import { moderasyonKayitlari } from '../db/schema.ts';
import { girisYap, oturumOku } from '../lib/oturum.ts';

let v: Awaited<ReturnType<typeof testDb>>; let a: any; let b: any;
before(async () => {
  v = await testDb();
  a = await ilkAdminOlustur(v.db, { eposta: 'Admin1@Ornek.com', parola: 'Parola123456' });
  b = (await hesapOlustur(v.db, { eposta: 'admin2@ornek.com', parola: 'Parola123456', rol: 'admin', yapan: a.id })).hesap;
});
after(async () => { await v.kapat(); });

test('hesap listesi parola özeti döndürmez; e-posta büyük/küçük harf tekildir', async () => {
  assert.equal((await hesaplariListele(v.db)).length, 2);
  assert.equal('parolaOzeti' in (await hesaplariListele(v.db))[0], false);
  await assert.rejects(
    hesapOlustur(v.db, { eposta: 'ADMIN1@ornek.com', parola: 'Parola123456', rol: 'editor', yapan: b.id }),
    (e: any) => e.durum === 409,
  );
});

test('kendi rolünü düşürme ve kendi hesabını pasifleştirme reddedilir', async () => {
  await assert.rejects(
    hesapGuncelle(v.db, { hesapId: a.id, rol: 'editor', yapan: a.id, kendiId: a.id }),
    (e: any) => e.durum === 409,
  );
  await assert.rejects(
    hesapGuncelle(v.db, { hesapId: a.id, aktif: false, yapan: a.id, kendiId: a.id }),
    (e: any) => e.durum === 409,
  );
});

test('son aktif admin korunur; pasifleştirme oturumu anında iptal eder', async () => {
  const ga = await girisYap(v.db, { eposta: 'admin1@ornek.com', parola: 'Parola123456', ipOzeti: null });
  await hesapGuncelle(v.db, { hesapId: a.id, aktif: false, yapan: b.id, kendiId: b.id });
  assert.equal(await oturumOku(v.db, ga.token), null);
  await assert.rejects(
    hesapGuncelle(v.db, { hesapId: b.id, aktif: false, yapan: a.id, kendiId: a.id }),
    (e: any) => e.durum === 409,
  );
});

test('geçici parola döndürülür, zorunlu değişim işaretlenir ve günlüğe yazılmaz', async () => {
  const r = await hesapGuncelle(v.db, { hesapId: b.id, geciciParola: 'YeniParola1234', yapan: a.id, kendiId: a.id });
  assert.equal(r.geciciParola, 'YeniParola1234');
  assert.equal(r.hesap.parolaDegistirmeli, true);
  const g = await girisYap(v.db, { eposta: 'admin2@ornek.com', parola: 'YeniParola1234', ipOzeti: null });
  assert.equal(g.kullanici.parolaDegistirmeli, true);
  const kayitlar = await v.db.select().from(moderasyonKayitlari).where(eq(moderasyonKayitlari.islem, 'parola-sifirla'));
  assert.equal(kayitlar.length, 1);
  assert.equal(JSON.stringify(kayitlar).includes('YeniParola1234'), false);
});

test('eşzamanlı iki rol düşürme son aktif admini sıfırlayamaz', async () => {
  const t = await testDb();
  try {
    const x = await ilkAdminOlustur(t.db, { eposta: 'x@ornek.com', parola: 'Parola123456' });
    const y = (await hesapOlustur(t.db, { eposta: 'y@ornek.com', parola: 'Parola123456', rol: 'admin', yapan: x.id })).hesap;
    const sonuc = await Promise.allSettled([
      hesapGuncelle(t.db, { hesapId: x.id, rol: 'editor', yapan: y.id, kendiId: y.id }),
      hesapGuncelle(t.db, { hesapId: y.id, rol: 'editor', yapan: x.id, kendiId: x.id }),
    ]);
    assert.equal(sonuc.filter(s => s.status === 'fulfilled').length, 1);
    assert.equal((await hesaplariListele(t.db)).filter(h => h.rol === 'admin' && h.aktif).length, 1);
  } finally { await t.kapat(); }
});
