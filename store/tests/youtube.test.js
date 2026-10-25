const test = require('node:test');
const assert = require('node:assert/strict');
const { linkiAyristir, handleCikar, videoBilgisiGetir } = require('../src/youtube.js');

test('video linkleri ayrıştırılır, ID büyük/küçük harfi korunur', () => {
    const beklenen = { tur: 'video', youtubeId: 'dQw4w9WgXcQ' };
    for (const link of [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?list=PL1&v=dQw4w9WgXcQ&t=42s',
        'https://youtu.be/dQw4w9WgXcQ?si=abc',
        'https://m.youtube.com/shorts/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/live/dQw4w9WgXcQ',
        'dQw4w9WgXcQ'
    ]) {
        assert.deepEqual(linkiAyristir(link), beklenen, link);
    }
});

test('kanal linkleri küçük harfli @handle olarak ayrıştırılır', () => {
    assert.deepEqual(linkiAyristir('https://www.youtube.com/@BilimKanali/videos'), { tur: 'kanal', youtubeId: '@bilimkanali' });
    assert.deepEqual(linkiAyristir('@Oyun.Kanali'), { tur: 'kanal', youtubeId: '@oyun.kanali' });
});

test('geçersiz ve /channel/ linkleri anlaşılır hata verir', () => {
    assert.throws(() => linkiAyristir(''), /gerekli/);
    assert.throws(() => linkiAyristir('https://www.youtube.com/channel/UC1234567890'), /@kullanıcıadı/);
    assert.throws(() => linkiAyristir('https://example.com/watch?v=dQw4w9WgXcQ'), /bulunamadı/);
});

test('oEmbed author_url içinden handle çıkarılır', () => {
    assert.equal(handleCikar('https://www.youtube.com/@RickAstleyYT'), '@rickastleyyt');
    assert.equal(handleCikar('https://www.youtube.com/channel/UC1'), null);
});

test('oEmbed yanıtı ve hata durumları', async () => {
    const sahte = (durum, govde) => async () => ({ status: durum, ok: durum === 200, json: async () => govde });

    const bilgi = await videoBilgisiGetir('dQw4w9WgXcQ', sahte(200, {
        title: 'Örnek Video', author_name: 'Örnek Kanal', author_url: 'https://www.youtube.com/@OrnekKanal', thumbnail_url: 'https://i.ytimg.com/vi/x/hq.jpg'
    }));
    assert.deepEqual(bilgi, { baslik: 'Örnek Video', kanalAdi: 'Örnek Kanal', kanalHandle: '@ornekkanal', kapakUrl: 'https://i.ytimg.com/vi/x/hq.jpg' });

    await assert.rejects(videoBilgisiGetir('dQw4w9WgXcQ', sahte(404)), /bulunamadı/);

    const gizli = await videoBilgisiGetir('dQw4w9WgXcQ', sahte(401));
    assert.equal(gizli.baslik, null);
    assert.match(gizli.kapakUrl, /dQw4w9WgXcQ/);

    const agHatasi = await videoBilgisiGetir('dQw4w9WgXcQ', async () => { throw new Error('ağ yok'); });
    assert.equal(agHatasi.baslik, null);
});
