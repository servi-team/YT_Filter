const test = require('node:test');
const assert = require('node:assert/strict');
const { sonrakiSurum, veritabaniJsonuOlustur } = require('../src/disa_aktarma.js');
const { puanla } = require('../src/puanlama.js');

test('sürüm numarası ay içinde artar, yeni ayda 1\'den başlar', () => {
    const ekim = new Date('2026-10-25T12:00:00Z');
    assert.equal(sonrakiSurum([], ekim), '2026.10.1');
    assert.equal(sonrakiSurum(['2026.10.1', '2026.10.2', '2026.09.7'], ekim), '2026.10.3');
    assert.equal(sonrakiSurum(['2026.10.9'], new Date('2026-11-01T00:00:00Z')), '2026.11.1');
    assert.equal(sonrakiSurum(['2026.10.9', '2026.10.10'], ekim), '2026.10.11');
});

test('yalnızca sonucu olan içerikler, şemadaki alanlarla dışa aktarılır', () => {
    const basliklar = [
        { anahtar: 'teknoloji', ad: 'Teknoloji', tur: 'konu' },
        { anahtar: 'oyun', ad: 'Oyun', tur: 'konu' },
        { anahtar: 'kufur', ad: 'Küfürlü içerik', tur: 'etiket' }
    ];
    const icerikler = [
        { id: 1, tur: 'video', youtubeId: 'dQw4w9WgXcQ' },
        { id: 2, tur: 'kanal', youtubeId: '@oyunkanali' },
        { id: 3, tur: 'video', youtubeId: 'jNQXAC9IVRw' }
    ];
    const sonuclar = new Map([
        [1, puanla(basliklar, [{ baslik: 'teknoloji', editor: 1, oy: 1, zaman: 1 }, { baslik: 'kufur', editor: 1, oy: 0, zaman: 2 }])],
        [2, puanla(basliklar, [{ baslik: 'oyun', editor: 1, oy: 1, zaman: 1 }])],
        [3, puanla(basliklar, [{ baslik: 'oyun', editor: 1, oy: -1, zaman: 1 }])]
    ]);

    const json = veritabaniJsonuOlustur({ basliklar, icerikler, sonuclar, surum: '2026.10.1', olusturulma: new Date('2026-10-25T12:00:00Z') });

    assert.equal(json.semaSurumu, 1);
    assert.equal(json.olusturulma, '2026-10-25T12:00:00.000Z');
    assert.deepEqual(json.konular, [{ id: 'teknoloji', ad: 'Teknoloji' }, { id: 'oyun', ad: 'Oyun' }]);
    assert.deepEqual(json.etiketler, [{ id: 'kufur', ad: 'Küfürlü içerik' }]);
    assert.deepEqual(json.videolar, {
        dQw4w9WgXcQ: { anaKonu: 'teknoloji', yanKonular: [], kararsizKonular: [], etiketler: [], kararsizEtiketler: ['kufur'] }
    });
    assert.deepEqual(Object.keys(json.kanallar), ['@oyunkanali']);
});
