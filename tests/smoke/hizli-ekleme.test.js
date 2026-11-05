/**
 * Smoke: isteğe bağlı hızlı ekleme rayı.
 * Yalnızca uygun YouTube sayfalarında görünür ve tek yazma yolunu kullanır.
 */
const test = require('node:test');
const assert = require('node:assert');
const { bekle, icerikArayuzuAc } = require('./ortak');

const IZLE = '<html><body><div id="ytd-player"><video></video></div></body></html>';
const KANAL = '<html><body><ytd-c4-tabbed-header-renderer></ytd-c4-tabbed-header-renderer></body></html>';

function acik(ek = {}) {
    return { surum: 2, ayarlar: { hizliEkleme: true }, ayar: { listeler: { beyaz: {}, kara: {}, ozel: [] }, ...ek } };
}

test('hızlı ekleme: video sayfasında ray görünür ve beyaz/kara yazar', async () => {
    const { dom, belge, chrome } = icerikArayuzuAc({ html: IZLE, baslangic: acik() });
    try {
        await bekle(() => belge.getElementById('ytf-hizli-ray'));
        assert.strictEqual(belge.getElementById('ytf-hizli-ray').getAttribute('aria-label'), 'Hızlı ekleme');
        belge.querySelector('[data-ytf-hedef="beyaz"]').click();
        await bekle(() => chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'] === true);
        belge.querySelector('[data-ytf-hedef="kara"]').click();
        await bekle(() => chrome.__depo.ayar.listeler.kara['aaaaaaaaaaa'] === true);
        assert.strictEqual(chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'], undefined);
    } finally { dom.window.close(); }
});

test('hızlı ekleme: kanal sayfasında kanal kimliğini yazar', async () => {
    const { dom, belge, chrome } = icerikArayuzuAc({
        html: KANAL,
        url: 'https://www.youtube.com/@yasakkanal',
        baslangic: acik()
    });
    try {
        await bekle(() => belge.getElementById('ytf-hizli-ray'));
        belge.querySelector('[data-ytf-hedef="beyaz"]').click();
        await bekle(() => chrome.__depo.ayar.listeler.beyaz['@yasakkanal'] === true);
    } finally { dom.window.close(); }
});

test('hızlı ekleme: ayar kapalı, embed, music/studio ve zorla engellenen Shorts ray göstermez', async () => {
    const durumlar = [
        { url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', baslangic: { surum: 2, ayarlar: { hizliEkleme: false }, ayar: { listeler: { beyaz: {}, kara: {}, ozel: [] } } } },
        { url: 'https://www.youtube.com/embed/aaaaaaaaaaa', baslangic: acik() },
        { url: 'https://music.youtube.com/watch?v=aaaaaaaaaaa', baslangic: acik() },
        { url: 'https://studio.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa', baslangic: acik() },
        { url: 'https://www.youtube.com/shorts/aaaaaaaaaaa', baslangic: { surum: 2, ayarlar: { hizliEkleme: true, shortsGizle: true }, ayar: { listeler: { beyaz: {}, kara: {}, ozel: [] } } } }
    ];
    for (const d of durumlar) {
        const { dom, belge } = icerikArayuzuAc({ html: IZLE, url: d.url, baslangic: d.baslangic });
        try {
            await new Promise(r => setTimeout(r, 80));
            assert.strictEqual(belge.getElementById('ytf-hizli-ray'), null, d.url);
        } finally { dom.window.close(); }
    }
});
