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

test('bulanık: engelden bulanıklaştırmaya geçerken oynatıcı ve video kaynağı geri gelir', async () => {
    const html = '<html><body><div id="ytd-player"><video src="https://example.com/video.mp4"></video></div><div class="html5-video-player"></div></body></html>';
    const baslangic = { surum: 2, ayar: { engelEylemi: 'kaldir', listeler: { beyaz: {}, kara: { aaaaaaaaaaa: true }, ozel: [] } } };
    const { dom, belge, chrome } = icerikArayuzuAc({ html, baslangic });
    try {
        await bekle(() => belge.getElementById('yt-filter-engel-banner'));
        const oynatici = belge.getElementById('ytd-player');
        const video = belge.querySelector('video');
        assert.strictEqual(oynatici.style.display, 'none');
        assert.strictEqual(video.getAttribute('src'), null);

        chrome.storage.local.set({ ayar: { ...baslangic.ayar, engelEylemi: 'bulaniklastir' } });
        await bekle(() => belge.querySelector('[data-ytf-bulanik-kalkan]'));

        assert.notStrictEqual(oynatici.style.display, 'none');
        assert.notStrictEqual(video.style.display, 'none');
        assert.strictEqual(video.getAttribute('src'), 'https://example.com/video.mp4');
    } finally { dom.window.close(); }
});

test('bulanık: başka videoya geçince eski engelli kaynak geri yüklenmez', async () => {
    const html = '<html><body><div id="ytd-player"><video src="https://example.com/eski.mp4"></video></div></body></html>';
    const baslangic = {
        surum: 2,
        ayar: {
            engelEylemi: 'kaldir',
            etiketlenmemis: 'ac',
            listeler: { beyaz: {}, kara: { aaaaaaaaaaa: true }, ozel: [] }
        }
    };
    const { dom, belge, pencere } = icerikArayuzuAc({ html, baslangic });
    try {
        await bekle(() => belge.getElementById('yt-filter-engel-banner'));
        const video = belge.querySelector('video');
        assert.strictEqual(video.getAttribute('src'), null);

        pencere.history.pushState({}, '', '/watch?v=bbbbbbbbbbb');
        pencere.checkWatchPage();

        assert.strictEqual(video.getAttribute('src'), null);
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
