/**
 * Regresyon: "Bir kanalı engelleyince başka kanallar da etkileniyor" hatası.
 * Neden: kanal bağlamı saklanıyordu, tek sayfa geçişinde bayat kalıyordu ve ilgisiz video/kartlar
 * engellenen kanal sanılıyordu. Artık bağlam her seferinde güncel adresten hesaplanır.
 */
const test = require('node:test');
const assert = require('node:assert');
const { bekle, icerikArayuzuAc } = require('./ortak');

const ayar = () => ({ surum: 2, ayar: { etiketlenmemis: 'ac', listeler: { beyaz: {}, kara: { '@yasakkanal': true }, ozel: [] } } });
const bekleMs = (ms) => new Promise(r => setTimeout(r, ms));

// Kanal sayfasındaki bir video ızgarası kartı: kartın kendi kanal bilgisi yok (kanal sayfası bağlamı geçerli).
const KANAL_SAYFASI_HTML = '<html><body><ytd-grid-video-renderer><a href="/watch?v=ccccccccccc"></a></ytd-grid-video-renderer></body></html>';

test('kanal bağlamı (koruma): engelli kanalın sayfasından çıkınca kart o kanal sayılmaz', async () => {
    const { dom, belge, pencere } = icerikArayuzuAc({ html: KANAL_SAYFASI_HTML, url: 'https://www.youtube.com/@yasakkanal/videos', baslangic: ayar() });
    try {
        const kart = belge.querySelector('ytd-grid-video-renderer');
        // Kanal sayfasında kart o kanala ait sayılır (doğru davranış).
        await bekle(() => kart.classList.contains('yt-filter-hidden'));
        // Ana sayfaya SPA geçişi: kart artık o kanalın sayılmamalı.
        pencere.history.pushState({}, '', '/');
        belge.dispatchEvent(new pencere.Event('yt-navigate-finish'));
        await bekleMs(1800); // sayfa geçişindeki 1 sn'lik yeniden işleme tamamlansın
        assert.strictEqual(kart.classList.contains('yt-filter-hidden'), false);
        assert.deepStrictEqual(pencere.__hatalar, []);
    } finally {
        dom.window.close();
    }
});

test('kanal bağlamı: izleme sayfasında bir önceki videonun kalan sahip bağlantısı yeni videoya uygulanmaz', async () => {
    const html = '<html><body><div id="ytd-player"><video></video></div>'
        + '<ytd-watch-flexy video-id="aaaaaaaaaaa"></ytd-watch-flexy>'                       // sayfada hâlâ ESKİ video
        + '<ytd-watch-metadata><div id="owner"><a href="/@yasakkanal">Yasak Kanal</a></div></ytd-watch-metadata>'
        + '</body></html>';
    const { dom, belge, pencere } = icerikArayuzuAc({ html, url: 'https://www.youtube.com/watch?v=ddddddddddd', baslangic: ayar() });
    try {
        await bekleMs(800);
        assert.strictEqual(belge.getElementById('yt-filter-engel-banner'), null);
        assert.notStrictEqual(belge.getElementById('ytd-player').style.display, 'none');
        assert.deepStrictEqual(pencere.__hatalar, []);
    } finally {
        dom.window.close();
    }
});

test('kanal bağlamı: sahip bağlantısı doğru videoya aitse engelli kanal yine engellenir', async () => {
    const html = '<html><body><div id="ytd-player"><video></video></div>'
        + '<ytd-watch-flexy video-id="ddddddddddd"></ytd-watch-flexy>'
        + '<ytd-watch-metadata><div id="owner"><a href="/@yasakkanal">Yasak Kanal</a></div></ytd-watch-metadata>'
        + '</body></html>';
    const { dom, belge } = icerikArayuzuAc({ html, url: 'https://www.youtube.com/watch?v=ddddddddddd', baslangic: ayar() });
    try {
        await bekle(() => belge.getElementById('yt-filter-engel-banner'));
    } finally {
        dom.window.close();
    }
});

// ---- Geri dönüştürülen kart (YouTube aynı öğeyi başka videoya yeniden kullanır) ----
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const UC1 = 'UC' + 'a'.repeat(22);
const UC2 = 'UC' + 'b'.repeat(22);
const veri = (videoId, handle, uc) => ({ videoId, ownerText: { runs: [{ navigationEndpoint: { browseEndpoint: { canonicalBaseUrl: '/' + handle, browseId: uc } } }] } });

test('yardımcı betik: geri dönüştürülen kartın video/kanal öznitelikleri güncellenir', async () => {
    const dom = new JSDOM('<html><body><ytd-rich-item-renderer></ytd-rich-item-renderer></body></html>', { runScripts: 'outside-only', url: 'https://www.youtube.com/' });
    try {
        const w = dom.window;
        const kart = w.document.querySelector('ytd-rich-item-renderer');
        kart.data = { videoId: 'aaaaaaaaaaa', ownerText: veri('aaaaaaaaaaa', '@yasakkanal', UC1).ownerText };
        w.eval(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'inject_helper.js'), 'utf8'));
        await bekle(() => kart.getAttribute('data-yt-exposed-channel') === '@yasakkanal');
        assert.strictEqual(kart.getAttribute('data-yt-exposed-id'), 'aaaaaaaaaaa');
        // YouTube aynı öğeyi başka kanalın başka videosu için yeniden kullanıyor:
        kart.data = { videoId: 'eeeeeeeeeee', ownerText: veri('eeeeeeeeeee', '@baskakanal', UC2).ownerText };
        w.document.dispatchEvent(new w.Event('yt-navigate-finish'));
        await bekle(() => kart.getAttribute('data-yt-exposed-channel') === '@baskakanal', { sure: 4000 });
        assert.strictEqual(kart.getAttribute('data-yt-exposed-id'), 'eeeeeeeeeee');
        assert.strictEqual(kart.getAttribute('data-yt-exposed-channel-id'), UC2);
    } finally {
        dom.window.close();
    }
});

test('content: kartın kanal özniteliği değişince kart yeniden değerlendirilir (gizli kart açılır)', async () => {
    const html = '<html><body><ytd-rich-item-renderer data-yt-exposed-id="bbbbbbbbbbb" data-yt-exposed-channel="@yasakkanal"><a href="/watch?v=bbbbbbbbbbb"></a></ytd-rich-item-renderer></body></html>';
    const { dom, belge } = icerikArayuzuAc({ html, url: 'https://www.youtube.com/', baslangic: ayar() });
    try {
        const kart = belge.querySelector('ytd-rich-item-renderer');
        await bekle(() => kart.classList.contains('yt-filter-hidden'));
        kart.setAttribute('data-yt-exposed-channel', '@baskakanal');
        kart.setAttribute('data-yt-exposed-id', 'fffffffffff');
        await bekle(() => !kart.classList.contains('yt-filter-hidden'), { sure: 3000 });
    } finally {
        dom.window.close();
    }
});
