const test = require('node:test');
const assert = require('node:assert');
const T = require('../src/core/taxonomy.js');
const {
    listePaketiOlustur,
    listePaketiCoz,
    listeleriBirlestir,
    LISTE_PAKET_TUR,
    LISTE_PAKET_SURUM
} = require('../src/core/listeler.js');

function ornekAyar() {
    const ayar = T.varsayilanAyar();
    ayar.listeler.beyaz['@a'] = true;
    ayar.listeler.kara['bbbbbbbbbbb'] = true;
    ayar.listeler.ozel.push({ ad: 'Okul', eylem: 'izinver', uyeler: { '@okul': true, '@ders': true } });
    ayar.listeler.ozel.push({ ad: 'Oyun', eylem: 'engelle', uyeler: { '@oyun': true } });
    return ayar;
}

test('listePaketiOlustur: tüm listeler ve tek liste', () => {
    const ayar = ornekAyar();
    const hepsi = listePaketiOlustur(ayar, 'hepsi');
    assert.strictEqual(hepsi.tur, LISTE_PAKET_TUR);
    assert.strictEqual(hepsi.surum, LISTE_PAKET_SURUM);
    assert.deepStrictEqual(hepsi.listeler.beyaz, { '@a': true });
    assert.deepStrictEqual(hepsi.listeler.kara, { bbbbbbbbbbb: true });
    assert.strictEqual(hepsi.listeler.ozel.length, 2);

    const sadeceKara = listePaketiOlustur(ayar, 'kara');
    assert.deepStrictEqual(sadeceKara.listeler, { kara: { bbbbbbbbbbb: true } });

    const sadeceOzel = listePaketiOlustur(ayar, 'ozel:Okul');
    assert.deepStrictEqual(sadeceOzel.listeler.ozel, [{ ad: 'Okul', eylem: 'izinver', uyeler: { '@okul': true, '@ders': true } }]);
    assert.ok(!sadeceOzel.listeler.beyaz);
});

test('listePaketiCoz: geçerli paket temizlenir ve raporlanır', () => {
    const cozum = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        surum: 1,
        listeler: {
            beyaz: { '@TRT': true, '': true, '@x': false },
            kara: ['gecersiz'],
            ozel: [
                { ad: '  Okul  ', eylem: 'izinver', uyeler: { '@A': true } },
                { ad: 'okul', eylem: 'engelle', uyeler: { '@B': true } },
                { ad: 'beyaz liste', uyeler: { '@c': true } },
                { ad: '', uyeler: {} }
            ]
        }
    });
    assert.strictEqual(cozum.gecerli, true);
    assert.deepStrictEqual(cozum.listeler.beyaz, { '@trt': true });
    assert.deepStrictEqual(cozum.listeler.kara, {});
    assert.strictEqual(cozum.listeler.ozel.length, 1);
    assert.strictEqual(cozum.listeler.ozel[0].ad, 'Okul');
    assert.deepStrictEqual(cozum.listeler.ozel[0].uyeler, { '@a': true, '@b': true });
    assert.ok(cozum.atlanan >= 3);
    assert.ok(cozum.hatalar.some(h => h.includes('ayrılmış')));
    assert.ok(cozum.hatalar.some(h => h.includes('birden çok')));
});

test('listePaketiCoz: bozuk ve desteklenmeyen girdiler geçersiz', () => {
    assert.strictEqual(listePaketiCoz(null).gecerli, false);
    assert.strictEqual(listePaketiCoz('metin').gecerli, false);
    assert.strictEqual(listePaketiCoz({ tur: LISTE_PAKET_TUR, surum: 99, listeler: {} }).gecerli, false);
    assert.strictEqual(listePaketiCoz({ foo: 'bar' }).gecerli, false);
});

test('listePaketiCoz: tam yedek dosyasındaki listeleri kabul eder', () => {
    const cozum = listePaketiCoz({ surum: 2, ayar: ornekAyar() });
    assert.strictEqual(cozum.gecerli, true);
    assert.deepStrictEqual(cozum.listeler.beyaz, { '@a': true });
    assert.strictEqual(cozum.listeler.ozel.length, 2);
});

test('listeleriBirlestir (birleştir): üyeler birleşir, mevcut eylem korunur', () => {
    const mevcut = ornekAyar().listeler;
    const gelen = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: { ozel: [{ ad: 'okul', eylem: 'engelle', uyeler: { '@yeni': true } }] }
    }).listeler;
    const { listeler, rapor } = listeleriBirlestir(mevcut, gelen, 'birlestir');
    const okul = listeler.ozel.find(l => l.ad === 'Okul');
    assert.strictEqual(rapor.birlestirilen, 1);
    assert.strictEqual(okul.eylem, 'izinver');
    assert.deepStrictEqual(okul.uyeler, { '@okul': true, '@ders': true, '@yeni': true });
    assert.strictEqual(listeler.ozel.filter(l => l.ad.toLocaleLowerCase('tr-TR') === 'okul').length, 1);
});

test('listeleriBirlestir (üzerine yaz): eski üyeler silinir, eylem ve ad güncellenir', () => {
    const mevcut = ornekAyar().listeler;
    const gelen = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: { ozel: [{ ad: 'Okul', eylem: 'engelle', uyeler: { '@yeni': true } }] }
    }).listeler;
    const { listeler, rapor } = listeleriBirlestir(mevcut, gelen, 'uzerine');
    const okul = listeler.ozel.find(l => l.ad === 'Okul');
    assert.strictEqual(rapor.uzerineYazilan, 1);
    assert.strictEqual(okul.eylem, 'engelle');
    assert.deepStrictEqual(okul.uyeler, { '@yeni': true });
});

test('listeleriBirlestir (yeniden adlandır): çakışan liste korunur, yeni ad açılır', () => {
    const mevcut = ornekAyar().listeler;
    const gelen = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: { ozel: [{ ad: 'Okul', eylem: 'engelle', uyeler: { '@yeni': true } }] }
    }).listeler;
    const { listeler, rapor } = listeleriBirlestir(mevcut, gelen, 'yeniden');
    assert.strictEqual(rapor.yenidenAdlandirilan, 1);
    assert.strictEqual(listeler.ozel.length, 3);
    assert.deepStrictEqual(listeler.ozel.find(l => l.ad === 'Okul').uyeler, { '@okul': true, '@ders': true });
    const yeni = listeler.ozel.find(l => l.ad === 'Okul (2)');
    assert.ok(yeni);
    assert.strictEqual(yeni.eylem, 'engelle');
    assert.deepStrictEqual(yeni.uyeler, { '@yeni': true });
});

test('listeleriBirlestir: bir anahtar tek listede kalır (taşınır)', () => {
    const mevcut = ornekAyar().listeler;
    const gelen = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: { kara: { '@a': true, '@okul': true } }
    }).listeler;
    const { listeler, rapor } = listeleriBirlestir(mevcut, gelen, 'birlestir');
    assert.strictEqual(listeler.beyaz['@a'], undefined);
    assert.strictEqual(listeler.kara['@a'], true);
    assert.strictEqual(listeler.ozel.find(l => l.ad === 'Okul').uyeler['@okul'], undefined);
    assert.strictEqual(listeler.kara['@okul'], true);
    assert.ok(rapor.tasinan >= 2);
});

test('listeleriBirlestir: hedefte zaten olan üye taşındı sayılmaz', () => {
    const mevcut = T.varsayilanAyar().listeler;
    mevcut.beyaz['@a'] = true;
    const gelen = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: { beyaz: { '@a': true } }
    }).listeler;
    const { listeler, rapor } = listeleriBirlestir(mevcut, gelen, 'birlestir');
    assert.strictEqual(rapor.tasinan, 0);
    assert.strictEqual(rapor.eklenen, 0);
    assert.strictEqual(listeler.beyaz['@a'], true);

    const gelen2 = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: { beyaz: { constructor: true } }
    }).listeler;
    const sonuc2 = listeleriBirlestir(mevcut, gelen2, 'birlestir');
    assert.strictEqual(sonuc2.listeler.beyaz.constructor, true);
    assert.strictEqual(sonuc2.rapor.eklenen, 1);
});

test('listeleriBirlestir: aynı paket içinde sonraki liste kazanır', () => {
    const mevcut = T.varsayilanAyar().listeler;
    const gelen = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: {
            beyaz: { '@x': true },
            kara: { '@x': true },
            ozel: [{ ad: 'Grup', uyeler: { '@x': true } }]
        }
    }).listeler;
    const { listeler } = listeleriBirlestir(mevcut, gelen, 'birlestir');
    assert.strictEqual(listeler.beyaz['@x'], undefined);
    assert.strictEqual(listeler.kara['@x'], undefined);
    assert.strictEqual(listeler.ozel.find(l => l.ad === 'Grup').uyeler['@x'], true);
});

test('listeleriBirlestir: geçersiz gelen veri mevcut listeleri değiştirmez', () => {
    const mevcut = ornekAyar().listeler;
    const kopya = JSON.parse(JSON.stringify(mevcut));
    const { listeler, rapor } = listeleriBirlestir(mevcut, null, 'birlestir');
    assert.strictEqual(rapor.gecerli, false);
    assert.deepStrictEqual(listeler, kopya);
    assert.deepStrictEqual(mevcut, kopya);
});

test('listeleriBirlestir: yeniden adlandırmada ayrılmış adlara çarpmaz', () => {
    const mevcut = T.varsayilanAyar().listeler;
    mevcut.ozel.push({ ad: 'Okul', eylem: 'izinver', uyeler: { '@a': true } });
    const gelen = listePaketiCoz({
        tur: LISTE_PAKET_TUR,
        listeler: { ozel: [{ ad: 'Okul', uyeler: { '@b': true } }] }
    }).listeler;
    const { listeler } = listeleriBirlestir(mevcut, gelen, 'yeniden');
    const adlar = listeler.ozel.map(l => l.ad.toLocaleLowerCase('tr-TR'));
    assert.strictEqual(new Set(adlar).size, adlar.length);
    assert.ok(listeler.ozel.some(l => l.ad === 'Okul (2)'));
});
