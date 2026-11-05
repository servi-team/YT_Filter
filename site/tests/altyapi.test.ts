import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { HttpHatasi } from '../lib/hata.ts';
import { testDb } from './yardim.ts';

process.env.IP_HASH_SECRET = 'test-anahtar';

let v: Awaited<ReturnType<typeof testDb>>;
before(async () => { v = await testDb(); });
after(async () => { await v.kapat(); });

test('hız sınırı pencereyi sayar ve sıfırlar', async () => {
  const { limitAsildiMi } = await import('../lib/hiz-limiti.ts');
  const kural = { anahtar: 'test', adet: 2, pencereSaniye: 60 };
  const t = new Date('2026-10-27T10:00:00Z');
  assert.equal(await limitAsildiMi(v.db, kural, t), false);
  assert.equal(await limitAsildiMi(v.db, kural, t), false);
  assert.equal(await limitAsildiMi(v.db, kural, t), true);
  assert.equal(await limitAsildiMi(v.db, kural, new Date('2026-10-27T10:01:01Z')), false);
});

test('aynı origin ve IP özeti doğrulanır', async () => {
  process.env.IP_HASH_SECRET = 'test-anahtar';
  const { ayniOriginMi, ipOzeti } = await import('../lib/istek.ts');
  const iyi = new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://localhost:3000', 'x-forwarded-for': '203.0.113.5' } });
  assert.equal(ayniOriginMi(iyi), true);
  assert.equal(ayniOriginMi(new Request('http://localhost:3000/api/oylar', { method: 'PUT', headers: { origin: 'http://kotu.example' } })), false);
  process.env.SITE_ORIGIN = 'https://site.example';
  assert.equal(ayniOriginMi(new Request('http://site:3000/api/oylar', { method: 'PUT', headers: { origin: 'https://site.example' } })), true);
  assert.equal(ayniOriginMi(new Request('https://site.example/api/oylar', { method: 'PUT', headers: { origin: 'https://kotu.example' } })), false);
  delete process.env.SITE_ORIGIN;
  const h = ipOzeti(iyi)!;
  assert.match(h, /^[a-f0-9]{64}$/);
  assert.notEqual(h, '203.0.113.5');
});

test('ziyaretçi çerezi ve takma etiket ham kimliği sızdırmaz', async () => {
  const { yeniZiyaretciKimligi, ziyaretciCerezi, kimlikEtiketi } = await import('../lib/ziyaretci.ts');
  const k = yeniZiyaretciKimligi();
  assert.equal(k.length >= 40, true);
  const c = ziyaretciCerezi(k, false);
  for (const s of ['HttpOnly', 'SameSite=Lax', 'Max-Age=31536000', 'Path=/']) assert.ok(c.includes(s), s);
  assert.equal(c.includes('Secure'), false);
  assert.ok(ziyaretciCerezi(k, true).includes('Secure'));
  const e = kimlikEtiketi('cerez', k);
  assert.match(e, /^çerez:[a-f0-9]{8}$/);
  assert.equal(e.includes(k), false);
});

test('ziyaretçi çerezi imzalıdır ve kurcalanmış değer reddedilir', async () => {
  const { yeniZiyaretciKimligi, ziyaretciCerezi, ziyaretciKimligiCoz } = await import('../lib/ziyaretci.ts');
  const kimlik = yeniZiyaretciKimligi();
  const cerez = ziyaretciCerezi(kimlik, false);
  const deger = cerez.slice(cerez.indexOf('=') + 1, cerez.indexOf(';'));

  assert.ok(deger.includes('.'), 'imza ayracı yok');
  assert.equal(deger.length < 100, true);
  assert.equal(ziyaretciKimligiCoz(deger), kimlik);

  const [id, imza] = deger.split('.');
  const baskaId = id.slice(0, -1) + (id.endsWith('A') ? 'B' : 'A');
  assert.equal(ziyaretciKimligiCoz(`${baskaId}.${imza}`), null);

  const baskaImza = imza.slice(0, -1) + (imza.endsWith('A') ? 'B' : 'A');
  assert.equal(ziyaretciKimligiCoz(`${id}.${baskaImza}`), null);

  assert.equal(ziyaretciKimligiCoz(kimlik), null);
  assert.equal(ziyaretciKimligiCoz('%E0%A4%A'), null);
});

test('hız limiti ortam değerleri geçersizse varsayılana döner', async () => {
  const { sinirDegeri } = await import('../lib/istek.ts');
  const uyarilar: string[] = [];
  const uyar = (mesaj: string) => { uyarilar.push(mesaj); };

  process.env.TEST_LIMIT = '3';
  assert.equal(sinirDegeri('TEST_LIMIT', 7, uyar), 3);

  for (const ham of ['', ' ', 'abc', 'NaN', 'Infinity', '0', '-1', '1.5', '9007199254740992']) {
    process.env.TEST_LIMIT = ham;
    assert.equal(sinirDegeri('TEST_LIMIT', 7, uyar), 7, JSON.stringify(ham));
  }

  delete process.env.TEST_LIMIT;
  assert.equal(sinirDegeri('TEST_LIMIT', 7, uyar), 7);
  assert.equal(uyarilar.length, 9);
});

test('govdeOku 64 KiB üstü gövdeyi 413 ile reddeder', async () => {
  const { govdeOku, AZAMI_GOVDE_BAYT } = await import('../lib/istek.ts');

  const kucuk = new Request('http://localhost/api/test', { method: 'POST', body: '{"a":1}' });
  assert.deepEqual(await govdeOku(kucuk), { a: 1 });

  const buyuk = 'x'.repeat(AZAMI_GOVDE_BAYT + 1);
  const buyukIstek = new Request('http://localhost/api/test', { method: 'POST', body: buyuk });
  await assert.rejects(
    govdeOku(buyukIstek),
    (hata) => hata instanceof HttpHatasi && hata.durum === 413 && hata.kod === 'govde-buyuk',
  );

  const akis = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(AZAMI_GOVDE_BAYT));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  const chunked = new Request('http://localhost/api/test', {
    method: 'POST',
    body: akis,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  await assert.rejects(
    govdeOku(chunked),
    (hata) => hata instanceof HttpHatasi && hata.durum === 413 && hata.kod === 'govde-buyuk',
  );

  const bozuk = new Request('http://localhost/api/test', { method: 'POST', body: '{' });
  await assert.rejects(
    govdeOku(bozuk),
    (hata) => hata instanceof HttpHatasi && hata.durum === 400 && hata.kod === 'gecersiz-govde',
  );
});
