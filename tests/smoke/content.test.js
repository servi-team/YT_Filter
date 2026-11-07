/**
 * Smoke: content.js jsdom + sahte chrome.* ile çalışır mı?
 * Banner, beyaz listeye ekleme, kart gizleme ve bulanıklaştırma yollarını denetler.
 */
const test = require('node:test');
const assert = require('node:assert');
const { bekle, icerikArayuzuAc } = require('./ortak');

const IZLE_HTML = '<html><body><div id="ytd-player"><video></video></div></body></html>';
const ANA_SAYFA_HTML = '<html><body><ytd-rich-item-renderer data-yt-exposed-id="bbbbbbbbbbb" data-yt-exposed-channel="@yasakkanal"><a href="/watch?v=bbbbbbbbbbb"></a></ytd-rich-item-renderer></body></html>';

function karaVideo(ekAlanlar = {}) {
    return { surum: 2, ayar: { listeler: { beyaz: {}, kara: { aaaaaaaaaaa: true }, ozel: [] }, ...ekAlanlar } };
}

function karaKanal(ekAlanlar = {}) {
    return { surum: 2, ayar: { listeler: { beyaz: {}, kara: { '@yasakkanal': true }, ozel: [] }, ...ekAlanlar } };
}

test('content: kara listedeki video banner gösterir, oynatıcı gizlenir', async () => {
    const { dom, belge, pencere } = icerikArayuzuAc({ html: IZLE_HTML, baslangic: karaVideo() });
    try {
        await bekle(() => belge.getElementById('yt-filter-engel-banner'));
        const banner = belge.getElementById('yt-filter-engel-banner');
        assert.ok(banner.textContent.includes('Bu video engellendi'));
        assert.ok(banner.textContent.includes('Kara list'));
        assert.strictEqual(belge.getElementById('ytd-player').style.display, 'none');
        assert.deepStrictEqual(pencere.__hatalar, []);
    } finally {
        dom.window.close();
    }
});

test('content: "Beyaz listeye ekle" depoyu günceller, banner kaybolur', async () => {
    const { dom, belge, chrome } = icerikArayuzuAc({ html: IZLE_HTML, baslangic: karaVideo() });
    try {
        await bekle(() => belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz'));
        belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz').click();
        await bekle(() => chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'] === true);
        assert.strictEqual(chrome.__depo.ayar.listeler.kara['aaaaaaaaaaa'], undefined);
        await bekle(() => !belge.getElementById('yt-filter-engel-banner'));
    } finally {
        dom.window.close();
    }
});

test('content: kara listedeki kanalın ana sayfa kartı gizlenir', async () => {
    const { dom, belge, pencere } = icerikArayuzuAc({
        html: ANA_SAYFA_HTML,
        url: 'https://www.youtube.com/',
        baslangic: karaKanal()
    });
    try {
        await bekle(() => belge.querySelector('ytd-rich-item-renderer').classList.contains('yt-filter-hidden'));
        assert.deepStrictEqual(pencere.__hatalar, []);
    } finally {
        dom.window.close();
    }
});

test('content: yt-navigate-finish ile SPA gezinmesinde banner çıkar', async () => {
    const { dom, belge, pencere } = icerikArayuzuAc({
        html: ANA_SAYFA_HTML,
        url: 'https://www.youtube.com/',
        baslangic: karaVideo()
    });
    try {
        await bekle(() => belge.querySelector('ytd-rich-item-renderer'));
        pencere.history.pushState({}, '', '/watch?v=aaaaaaaaaaa');
        belge.dispatchEvent(new pencere.Event('yt-navigate-finish'));
        await bekle(() => belge.getElementById('yt-filter-engel-banner'), { sure: 4000 });
        assert.ok(belge.getElementById('yt-filter-engel-banner').textContent.includes('Bu video engellendi'));
    } finally {
        dom.window.close();
    }
});

test('content: "Bulanıklaştır" eylemi kartı bulanıklaştırır', async () => {
    const { dom, belge } = icerikArayuzuAc({
        html: ANA_SAYFA_HTML,
        url: 'https://www.youtube.com/',
        baslangic: karaKanal({ engelEylemi: 'bulaniklastir' })
    });
    try {
        await bekle(() => belge.querySelector('ytd-rich-item-renderer').dataset.ytFilterBlur === 'true');
        assert.ok(!belge.querySelector('ytd-rich-item-renderer').classList.contains('yt-filter-hidden'));
    } finally {
        dom.window.close();
    }
});

test('content: "Uyarı sayfası" izleme sayfasında oynatıcıyı kapatır, devam düğmesi yok', async () => {
    const { dom, belge, pencere } = icerikArayuzuAc({
        html: IZLE_HTML,
        baslangic: karaVideo({ engelEylemi: 'uyari' })
    });
    try {
        await bekle(() => belge.getElementById('yt-filter-engel-banner'));
        const banner = belge.getElementById('yt-filter-engel-banner');
        assert.ok(banner.textContent.includes('Bu video engellendi'));
        assert.strictEqual(belge.getElementById('ytd-player').style.display, 'none');
        const devam = Array.from(banner.querySelectorAll('button'))
            .some(b => /devam/i.test(b.textContent));
        assert.strictEqual(devam, false);
        assert.deepStrictEqual(pencere.__hatalar, []);
    } finally {
        dom.window.close();
    }
});

test('content: "Uyarı sayfası" akış kartını sebep yazan kapakla kaplar', async () => {
    const { dom, belge } = icerikArayuzuAc({
        html: ANA_SAYFA_HTML,
        url: 'https://www.youtube.com/',
        baslangic: karaKanal({ engelEylemi: 'uyari' })
    });
    try {
        await bekle(() => belge.querySelector('ytd-rich-item-renderer .ytf-uyari-kapak'));
        const kart = belge.querySelector('ytd-rich-item-renderer');
        const kapak = kart.querySelector('.ytf-uyari-kapak');
        assert.ok(kapak.textContent.includes('Engellendi'));
        assert.ok(kapak.textContent.includes('Kara listede'));
        assert.ok(!kart.classList.contains('yt-filter-hidden'));
    } finally {
        dom.window.close();
    }
});
