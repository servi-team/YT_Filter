/**
 * Smoke: options.html arayüzü jsdom + sahte chrome.* ile çalışır mı?
 * Saf mantık testleri değildir; depo köprüsü, PIN kilidi, liste sekmesi ve çakışma modalını denetler.
 */
const test = require('node:test');
const assert = require('node:assert');
const { bekle, DB_JSON, arayuzuAc } = require('./ortak');

const BOS_LISTELER = { beyaz: {}, kara: {}, ozel: [] };

function temelBaslangic() {
    return { surum: 2, ayar: { listeler: BOS_LISTELER }, ayarlar: {} };
}

test('options: ilk açılışta kilit yok, arayüz ve veritabanı durumu görünür', async () => {
    const { dom, belge, pencere } = await arayuzuAc({ baslangic: temelBaslangic() });
    try {
        await bekle(() => belge.getElementById('anaArayuz').style.display === 'block');
        assert.strictEqual(belge.getElementById('pinEkrani').style.display, 'none');
        const dbMetni = belge.getElementById('dbDurum').textContent;
        assert.ok(dbMetni.includes(`Paketli veritabanı: v${DB_JSON.veriSurumu}`), dbMetni);
        assert.ok(dbMetni.includes('1 kanal'), dbMetni);
        assert.ok(belge.getElementById('ozelListelerKonteyner').textContent.includes('Henüz özel liste oluşturmadınız'));
        assert.deepStrictEqual(pencere.__hatalar, []);
    } finally {
        dom.window.close();
    }
});

test('options: PIN kurulumu, kilitleme, yanlış ve doğru giriş', async () => {
    const { dom, belge, chrome } = await arayuzuAc({ baslangic: temelBaslangic() });
    try {
        await bekle(() => belge.getElementById('pinKurulumKarti').style.display === 'block');
        belge.getElementById('kurulumPin').value = '2468';
        belge.getElementById('btnKurulumPinKaydet').click();
        await bekle(() => belge.getElementById('pinKurulumKarti').style.display === 'none');
        assert.match(String(chrome.__depo.pinKodu), /^pbkdf2-sha256\$/); // depoda düz metin yok

        belge.getElementById('btnPinKilitle').click();
        assert.strictEqual(belge.getElementById('pinEkrani').style.display, 'flex');
        assert.strictEqual(belge.getElementById('anaArayuz').style.display, 'none');

        belge.getElementById('pinGiris').value = '0000';
        belge.getElementById('btnPinOnayla').click();
        await bekle(() => belge.getElementById('pinHata').style.display === 'block');
        assert.strictEqual(belge.getElementById('anaArayuz').style.display, 'none');

        belge.getElementById('pinGiris').value = '2468';
        belge.getElementById('btnPinOnayla').click();
        await bekle(() => belge.getElementById('anaArayuz').style.display === 'block');
        assert.strictEqual(belge.getElementById('pinHata').style.display, 'none');
    } finally {
        dom.window.close();
    }
});

test('options: eski düz metin PIN ilk başarılı girişte karma\'ya yükseltilir', async () => {
    const baslangic = temelBaslangic();
    baslangic.pinKodu = '2468';
    baslangic.ilkGirisYapildi = true;
    const { dom, belge, chrome } = await arayuzuAc({ baslangic });
    try {
        await bekle(() => belge.getElementById('pinEkrani').style.display === 'flex');

        belge.getElementById('pinGiris').value = '2468';
        belge.getElementById('btnPinOnayla').click();
        await bekle(() => belge.getElementById('anaArayuz').style.display === 'block');
        assert.match(String(chrome.__depo.pinKodu), /^pbkdf2-sha256\$/);

        // Yükseltilen karma ile yeniden kilit açılabiliyor
        belge.getElementById('btnPinKilitle').click();
        belge.getElementById('pinGiris').value = '2468';
        belge.getElementById('btnPinOnayla').click();
        await bekle(() => belge.getElementById('anaArayuz').style.display === 'block');
    } finally {
        dom.window.close();
    }
});

test('options: içerik ekleme, listeleme ve silme depoyla senkron', async () => {
    const { dom, belge, chrome, pencere } = await arayuzuAc({ baslangic: temelBaslangic() });
    try {
        await bekle(() => belge.getElementById('anaArayuz').style.display === 'block');

        belge.getElementById('yeniEtiketId').value = 'https://www.youtube.com/@testkanal';
        belge.getElementById('yeniEtiketTuru').value = 'kara';
        belge.getElementById('btnEtiketEkle').click();

        await bekle(() => belge.getElementById('itemListContainer').textContent.includes('@testkanal'));
        assert.ok(chrome.__depo.ayar && chrome.__depo.ayar.listeler.kara['@testkanal']);
        assert.strictEqual(belge.getElementById('lblToplamIcerik').textContent, '1 İçerik');

        belge.querySelector('#itemListContainer .btn-delete-item').click();
        await bekle(() => belge.getElementById('lblToplamIcerik').textContent === '0 İçerik');
        assert.ok(!chrome.__depo.ayar.listeler.kara['@testkanal']);
        assert.deepStrictEqual(pencere.__uyarilar, []);
    } finally {
        dom.window.close();
    }
});

test('options: liste çakışma modalı üç stratejiyi de döndürür', async () => {
    const { dom, belge, pencere } = await arayuzuAc({ baslangic: temelBaslangic() });
    try {
        await bekle(() => belge.getElementById('anaArayuz').style.display === 'block');

        const soz1 = pencere.cakismaSor(['Okul']);
        assert.strictEqual(belge.getElementById('listeCakismaModal').style.display, 'flex');
        assert.ok(belge.getElementById('listeCakismaListesi').textContent.includes('Okul'));
        belge.getElementById('btnCakismaUygula').click();
        assert.strictEqual(await soz1, 'birlestir');
        assert.strictEqual(belge.getElementById('listeCakismaModal').style.display, 'none');

        const soz2 = pencere.cakismaSor(['Okul']);
        belge.querySelector('input[name="listeCakisma"][value="yeniden"]').checked = true;
        belge.getElementById('btnCakismaUygula').click();
        assert.strictEqual(await soz2, 'yeniden');

        const soz3 = pencere.cakismaSor(['Okul']);
        belge.getElementById('btnCakismaVazgec').click();
        assert.strictEqual(await soz3, null);
    } finally {
        dom.window.close();
    }
});

test('options: hızlı banttaki kanal eklenince ad/avatar depoya yazılır ve listede görünür', async () => {
    const { dom, belge, chrome } = await arayuzuAc({
        baslangic: temelBaslangic(),
        sekmeler: [{ id: 9, url: 'https://www.youtube.com/@yasakkanal' }],
        mesajYaniti: {
            hazir: true, tur: 'Kanal', tespit: '@yasakkanal', handle: '@yasakkanal',
            videoId: null, kanalId: null, kanalAdi: 'Yasak Kanal',
            avatar: 'https://yt3.ggpht.com/avatar=s88', sebepler: []
        }
    });
    try {
        await bekle(() => belge.getElementById('quickTitle').textContent === '@yasakkanal');
        belge.getElementById('btnQuickBlock').click();
        await bekle(() => chrome.__depo.kanalBilgileri && chrome.__depo.kanalBilgileri['@yasakkanal']);
        assert.strictEqual(chrome.__depo.kanalBilgileri['@yasakkanal'].ad, 'Yasak Kanal');
        assert.match(chrome.__depo.kanalBilgileri['@yasakkanal'].avatar, /^https:\/\/yt3\.ggpht\.com\//);
        await bekle(() => belge.querySelector('.item-avatar'));
        assert.ok(belge.getElementById('itemListContainer').textContent.includes('Yasak Kanal (@yasakkanal)'));
    } finally {
        dom.window.close();
    }
});

test('options: hızlı bant, içerik betiği yanıt vermezse URL yedeğiyle dolar', async () => {
    const baslangic = temelBaslangic();
    baslangic.ayar.etiketlenmemis = 'engelle';
    const { dom, belge } = await arayuzuAc({
        baslangic,
        sekmeler: [{ id: 7, url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA' }]
    });
    try {
        await bekle(() => belge.getElementById('quickTitle').textContent === 'AAAAAAAAAAA');
        assert.strictEqual(belge.getElementById('quickPageType').textContent, 'Video');
        assert.ok(belge.getElementById('quickKarar').textContent.startsWith('Şu an:'));
        assert.ok(belge.getElementById('quickSebep').textContent.length > 0);
        assert.strictEqual(belge.getElementById('quickActionBanner').style.display, 'flex');
    } finally {
        dom.window.close();
    }
});
