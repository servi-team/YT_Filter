/**
 * Smoke: içerik tarafındaki PIN kapısı.
 * Kilitliyken istisna yazımı PIN penceresi ister; doğru PIN tek yazma yapar.
 */
const test = require('node:test');
const assert = require('node:assert');
const { bekle, icerikArayuzuAc } = require('./ortak');
const { pinKarmala } = require('../../src/core/pin.js');

const IZLE = '<html><body><div id="ytd-player"><video></video></div></body></html>';

async function pinliKaraVideo() {
    return {
        surum: 2,
        pinKodu: await pinKarmala('2468'),
        ayar: { listeler: { beyaz: {}, kara: { aaaaaaaaaaa: true }, ozel: [] } }
    };
}

test('içerik: kilitliyken istisna düğmesi PIN ister, yanlış PIN yazmaz', async () => {
    const { dom, belge, chrome } = icerikArayuzuAc({ html: IZLE, baslangic: await pinliKaraVideo() });
    try {
        await bekle(() => belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz'));
        belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz').click();
        await bekle(() => belge.querySelector('[data-ytf-pin-pencere]'));
        assert.strictEqual(chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'], undefined);

        belge.getElementById('ytf-pin-giris').value = '0000';
        belge.getElementById('ytf-pin-onay').click();
        await bekle(() => belge.getElementById('ytf-pin-hata').textContent.length > 0);
        assert.strictEqual(chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'], undefined);
    } finally { dom.window.close(); }
});

test('içerik: doğru PIN bekleyen yazmayı bir kez çalıştırır', async () => {
    const { dom, belge, chrome } = icerikArayuzuAc({ html: IZLE, baslangic: await pinliKaraVideo() });
    try {
        await bekle(() => belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz'));
        belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz').click();
        await bekle(() => belge.getElementById('ytf-pin-giris'));
        belge.getElementById('ytf-pin-giris').value = '2468';
        belge.getElementById('ytf-pin-onay').click();
        await bekle(() => chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'] === true
            && belge.getElementById('ytf-bildirim'));
        assert.strictEqual(chrome.__depo.ayar.listeler.kara['aaaaaaaaaaa'], undefined);
        assert.ok(chrome.__depo.pinKilitBitis > Date.now());
        const bildirim = belge.getElementById('ytf-bildirim');
        assert.strictEqual(bildirim.getAttribute('role'), 'status');
    } finally { dom.window.close(); }
});

test('içerik: başka sekmedeki oturum yazmayı açar', async () => {
    const baslangic = await pinliKaraVideo();
    baslangic.pinKilitBitis = Date.now() + 600000;
    const { dom, belge, chrome } = icerikArayuzuAc({ html: IZLE, baslangic });
    try {
        await bekle(() => belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz'));
        belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz').click();
        await bekle(() => chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'] === true);
        assert.strictEqual(belge.querySelector('[data-ytf-pin-pencere]'), null);
    } finally { dom.window.close(); }
});

test('içerik: başka sekmede oturum kapanınca PIN penceresi iptal olur', async () => {
    const { dom, belge, chrome } = icerikArayuzuAc({ html: IZLE, baslangic: await pinliKaraVideo() });
    try {
        await bekle(() => belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz'));
        belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz').click();
        await bekle(() => belge.querySelector('[data-ytf-pin-pencere]'));

        chrome.storage.local.set({ pinKilitBitis: Date.now() + 600000 });
        await new Promise(cz => setTimeout(cz, 30));
        assert.ok(belge.querySelector('[data-ytf-pin-pencere]'), 'oturum açılınca pencere kapanmamalı');

        chrome.storage.local.set({ pinKilitBitis: 0 });
        await bekle(() => !belge.querySelector('[data-ytf-pin-pencere]'));
    } finally { dom.window.close(); }
});

test('içerik: bekleme açıkken onay kapalı ve kalan süre görünür', async () => {
    const baslangic = await pinliKaraVideo();
    baslangic.pinHataBitis = Date.now() + 30000;
    const { dom, belge } = icerikArayuzuAc({ html: IZLE, baslangic });
    try {
        await bekle(() => belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz'));
        belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz').click();
        await bekle(() => belge.querySelector('[data-ytf-pin-pencere]'));
        assert.strictEqual(belge.getElementById('ytf-pin-onay').disabled, true);
        assert.match(belge.getElementById('ytf-pin-hata').textContent, /\d+ sn/);
    } finally { dom.window.close(); }
});

test('içerik: beşinci hatalı denemede onay kapanır', async () => {
    const baslangic = await pinliKaraVideo();
    baslangic.pinHataSayisi = 4;
    const { dom, belge, chrome } = icerikArayuzuAc({ html: IZLE, baslangic });
    try {
        await bekle(() => belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz'));
        belge.querySelector('#yt-filter-engel-banner .ytf-btn-beyaz').click();
        await bekle(() => belge.querySelector('[data-ytf-pin-pencere]'));
        belge.getElementById('ytf-pin-giris').value = '0000';
        belge.getElementById('ytf-pin-onay').click();
        await bekle(() => belge.getElementById('ytf-pin-onay').disabled === true
            && /30 sn/.test(belge.getElementById('ytf-pin-hata').textContent));
        assert.match(belge.getElementById('ytf-pin-hata').textContent, /30 sn/);
        assert.strictEqual(chrome.__depo.ayar.listeler.beyaz['aaaaaaaaaaa'], undefined);
    } finally { dom.window.close(); }
});
