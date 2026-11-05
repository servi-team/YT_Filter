/**
 * Smoke: gerçek bulanıklaştırma.
 * Tek oynatıcı kökü filtrelenir; kalkan oynatıcının üstünü kapatır ve oynatma durur.
 */
const test = require('node:test');
const assert = require('node:assert');
const { bekle, icerikArayuzuAc } = require('./ortak');

const HTML = '<html><body><div id="ytd-player"><video></video></div><div class="html5-video-player"></div></body></html>';

function bulanikBaslangic() {
    return { surum: 2, ayar: { engelEylemi: 'bulaniklastir', listeler: { beyaz: {}, kara: { aaaaaaaaaaa: true }, ozel: [] } } };
}

test('bulanık: tek kök filtrelenir, kalkan body altında ve oynatıcı gizlenmez', async () => {
    const { dom, belge } = icerikArayuzuAc({ html: HTML, baslangic: bulanikBaslangic() });
    try {
        await bekle(() => belge.querySelector('[data-ytf-bulanik-kalkan]'));
        const kok = belge.getElementById('ytd-player');
        const kalkan = belge.querySelector('[data-ytf-bulanik-kalkan]');
        assert.match(kok.style.filter, /blur\(35px\)/);
        assert.strictEqual(belge.querySelector('.html5-video-player').style.filter, '');
        assert.strictEqual(kalkan.parentElement, belge.body);
        assert.notStrictEqual(kok.style.display, 'none');
        const video = belge.querySelector('video');
        assert.strictEqual(video.muted, true);
        assert.strictEqual(video.paused, true);
    } finally { dom.window.close(); }
});

test('bulanık: 5 saniyelik yeniden kontrol önceki ses değerini ezmez', async () => {
    const { dom, belge, pencere } = icerikArayuzuAc({ html: HTML, baslangic: bulanikBaslangic() });
    try {
        await bekle(() => belge.querySelector('[data-ytf-bulanik-kalkan]'));
        const video = belge.querySelector('video');
        const onceki = video.dataset.ytfOncekiSessiz;
        pencere.checkWatchPage();
        assert.strictEqual(video.dataset.ytfOncekiSessiz, onceki);
    } finally { dom.window.close(); }
});

test('bulanık: engel kalkınca filtre, kalkan ve ses durumu temizlenir', async () => {
    const { dom, belge, pencere } = icerikArayuzuAc({ html: HTML, baslangic: bulanikBaslangic() });
    try {
        await bekle(() => belge.querySelector('[data-ytf-bulanik-kalkan]'));
        pencere.history.pushState({}, '', '/');
        pencere.checkWatchPage();
        assert.strictEqual(belge.querySelector('[data-ytf-bulanik-kalkan]'), null);
        assert.strictEqual(belge.getElementById('ytd-player').style.filter, '');
        const video = belge.querySelector('video');
        assert.strictEqual(video.dataset.ytfOncekiSessiz, undefined);
    } finally { dom.window.close(); }
});
