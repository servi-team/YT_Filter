// Store'un ürettiği JSON, eklentinin db:import doğrulamasından ve filtre motorundan geçmeli
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { dogrula, surumKarsilastir } = require('../scripts/db-import.js');
const { kararVer, varsayilanFiltreAyarlari } = require('../src/filtre_motoru.js');
const { puanla } = require('../store/src/puanlama.js');
const { sonrakiSurum, veritabaniJsonuOlustur } = require('../store/src/disa_aktarma.js');

const paketlenmis = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'veritabani.json'), 'utf8'));

test('Store dışa aktarımı eklenti şemasına uyar ve filtre motorunda kullanılabilir', () => {
    const basliklar = [
        ...paketlenmis.konular.map(k => ({ anahtar: k.id, ad: k.ad, tur: 'konu' })),
        ...paketlenmis.etiketler.map(e => ({ anahtar: e.id, ad: e.ad, tur: 'etiket' }))
    ];
    const icerikler = [
        { id: 1, tur: 'video', youtubeId: 'dQw4w9WgXcQ' },
        { id: 2, tur: 'kanal', youtubeId: '@oyunkanali' },
        { id: 3, tur: 'video', youtubeId: 'jNQXAC9IVRw' }
    ];
    const sonuclar = new Map([
        [1, puanla(basliklar, [
            { baslik: 'muzik', editor: 1, oy: 1, zaman: 1 },
            { baslik: 'eglence', editor: 1, oy: 0, zaman: 2 },
            { baslik: 'kufur', editor: 2, oy: 0, zaman: 3 }
        ])],
        [2, puanla(basliklar, [{ baslik: 'oyun', editor: 1, oy: 1, zaman: 1 }, { baslik: 'siddet', editor: 1, oy: 1, zaman: 2 }])],
        [3, puanla(basliklar, [])]
    ]);

    const surum = sonrakiSurum([], new Date('2026-11-01T00:00:00Z'));
    const json = veritabaniJsonuOlustur({ basliklar, icerikler, sonuclar, surum, olusturulma: new Date('2026-11-01T00:00:00Z') });

    assert.deepEqual(dogrula(json), []);
    assert.ok(surumKarsilastir(json.surum, paketlenmis.surum) > 0);

    const filtre = varsayilanFiltreAyarlari(json);
    assert.equal(kararVer({ videoId: 'dQw4w9WgXcQ' }, json, filtre).sonuc, 'izin');
    // Kanal şiddet etiketli, etiketler varsayılan olarak filtrelenir
    const kanalKarari = kararVer({ videoId: 'jNQXAC9IVRw', kanal: '@OyunKanali' }, json, filtre);
    assert.deepEqual([kanalKarari.sonuc, kanalKarari.kaynak, kanalKarari.sebep], ['engel', 'kanal', 'etiket']);
});
