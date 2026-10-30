import test from 'node:test';
import assert from 'node:assert/strict';
import { metaCoz } from '../lib/youtube-meta.ts';

const yanit = (govde: unknown) => new Response(JSON.stringify(govde), { status: 200, headers: { 'content-type': 'application/json' } });

test('video oEmbed başlık ve kanal adı verir', async () => {
  const f = async (url: string) => { assert.match(url, /oembed/); return yanit({ title: 'Örnek Video', author_name: 'İnci Kanal', author_url: 'https://www.youtube.com/@inci' }); };
  const m = await metaCoz({ tur: 'video', id: 'dQw4w9WgXcQ' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(m.tur, 'video'); if (m.tur === 'video') { assert.equal(m.baslik, 'Örnek Video'); assert.equal(m.kanalAdi, 'İnci Kanal'); assert.equal(m.kanalHandle, '@inci'); }
});

test('handle HTML fallback UC kimliğini bulur', async () => {
  const html = '<meta property="og:title" content="İnci Kanal"><meta property="og:image" content="https://yt3.ggpht.com/a"><link rel="canonical" href="https://www.youtube.com/@inci"><script>"channelId":"UC' + 'e'.repeat(22) + '"</script>';
  const f = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  const m = await metaCoz({ tur: 'kanal', handle: '@inci' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(m.tur, 'kanal'); if (m.tur === 'kanal') { assert.equal(m.id, 'UC' + 'e'.repeat(22)); assert.equal(m.ad, 'İnci Kanal'); }
});

test('ağ hatasında video kimlikle döner, handle hata verir', async () => {
  const f = async () => { throw new Error('ağ yok'); };
  const v = await metaCoz({ tur: 'video', id: 'dQw4w9WgXcQ' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(v.tur, 'video'); if (v.tur === 'video') assert.equal(v.id, 'dQw4w9WgXcQ');
  const k = await metaCoz({ tur: 'kanal', handle: '@yok' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(k.tur, 'hata');
});

test('Data API video ve kanal bilgilerini getirir, her istek kotayı artırır', async () => {
  const cagrilar: string[] = [];
  let kota = 0;
  const f = async (url: string) => {
    cagrilar.push(url);
    if (url.includes('/videos?')) {
      return yanit({ items: [{ id: 'dQw4w9WgXcQ', snippet: { title: 'API Video', channelId: 'UC' + 'g'.repeat(22), channelTitle: 'API Kanal' } }] });
    }
    if (url.includes('/channels?')) {
      return yanit({ items: [{ id: 'UC' + 'g'.repeat(22), snippet: { title: 'API Kanal', customUrl: '@apikanal', thumbnails: { high: { url: 'https://yt3.ggpht.com/api' } } } }] });
    }
    throw new Error('beklenmeyen adres: ' + url);
  };

  const m = await metaCoz(
    { tur: 'video', id: 'dQw4w9WgXcQ' },
    { fetch: f as typeof fetch, apiKey: 'anahtar', kotaArtir: async (adet) => { kota += adet; } },
  );

  assert.equal(m.tur, 'video');
  if (m.tur === 'video') {
    assert.equal(m.baslik, 'API Video');
    assert.equal(m.kanalId, 'UC' + 'g'.repeat(22));
    assert.equal(m.kanalAdi, 'API Kanal');
    assert.equal(m.kanalHandle, '@apikanal');
    assert.equal(m.kanalAvatar, 'https://yt3.ggpht.com/api');
  }
  assert.equal(cagrilar.length, 2);
  assert.equal(kota, 2);
});

test('kanal UC HTML fallback ad ve avatarı okur', async () => {
  const html = '<meta property="og:title" content="UC Kanal"><meta property="og:image" content="https://yt3.ggpht.com/uc">';
  const f = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  const m = await metaCoz({ tur: 'kanal', id: 'UC' + 'h'.repeat(22) }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(m.tur, 'kanal');
  if (m.tur === 'kanal') {
    assert.equal(m.id, 'UC' + 'h'.repeat(22));
    assert.equal(m.ad, 'UC Kanal');
    assert.equal(m.avatar, 'https://yt3.ggpht.com/uc');
  }
});

test('API anahtarı yokken Data API çağrılmaz', async () => {
  let cagri = 0;
  const f = async () => { cagri += 1; throw new Error('ağ yok'); };
  await metaCoz({ tur: 'video', id: 'dQw4w9WgXcQ' }, { fetch: f as typeof fetch, apiKey: null });
  assert.equal(cagri, 1); // yalnızca oEmbed denemesi
});
