const test = require('node:test');
const assert = require('node:assert');
const { dbKur, dbSec } = require('../src/core/db.js');

const KID = 'UC' + 'a'.repeat(22);
const ornek = () => ({
    sema: 1, veriSurumu: 3,
    kanallar: [{ id: KID, handle: '@TrtSpor', ad: 'TRT Spor', avatar: 'https://x/y.jpg', anaKonu: 'spor', yanKonular: [], etiketler: [] }],
    videolar: [{ id: 'abcdefghijk', anaKonu: 'oyun', yanKonular: ['eglence'], etiketler: ['kufur'] }]
});

test('geçerli veritabanı indekslenir; kanal id ve handle (büyük/küçük harf duyarsız) ile bulunur', () => {
    const db = dbKur(ornek());
    assert.deepStrictEqual(db.sayac, { kanal: 1, video: 1, atlanan: 0, yokSayilan: 0 });
    assert.strictEqual(db.veriSurumu, 3);
    assert.strictEqual(db.kanalBul(KID, null).kayit.anaKonu, 'spor');
    assert.strictEqual(db.kanalBul(null, '@trtspor').id, KID);
    assert.strictEqual(db.kanalBul(null, '@TRTSPOR').ad, 'TRT Spor');
    assert.strictEqual(db.kanalBul('UC' + 'z'.repeat(22), '@yok'), null);
    assert.deepStrictEqual(db.videoBul('abcdefghijk'), { anaKonu: 'oyun', yanKonular: ['eglence'], etiketler: ['kufur'], kararsizKonular: [], kararsizEtiketler: [] });
    assert.strictEqual(db.videoBul('yokyokyokyo'), null);
});

test('geçersiz kayıtlar atlanır ve sayılır, diğerleri etkilenmez', () => {
    const j = ornek();
    j.videolar.push({ id: 'kisa', anaKonu: 'oyun' });                        // geçersiz id
    j.videolar.push({ id: 'bbbbbbbbbbb', yanKonular: ['oyun'] });            // ana konu yok
    j.videolar.push({ id: 'ccccccccccc', anaKonu: 'bilinmeyen-konu' });      // bilinmeyen konu
    j.kanallar.push({ id: 'UCkisa', anaKonu: 'spor' });                      // geçersiz kanal id
    j.kanallar.push({ id: 'UC' + 'b'.repeat(22), handle: 'bosluk var', anaKonu: 'spor' }); // geçersiz handle
    const db = dbKur(j);
    assert.strictEqual(db.sayac.video, 1);
    assert.strictEqual(db.sayac.kanal, 1);
    assert.strictEqual(db.sayac.atlanan, 5);
    assert.ok(db.hatalar.length > 0);
});

test('bilinmeyen taksonomi kimlikleri yok sayılır, bilinen alanlar korunur (ileri uyumluluk)', () => {
    const j = {
        sema: 1, veriSurumu: 4,
        kanallar: [],
        videolar: [
            {
                id: 'ddddddddddd',
                anaKonu: 'site-yeni-konu',
                yanKonular: ['oyun'],
                etiketler: ['site-yeni-etiket', 'kufur'],
                kararsizKonular: ['site-yeni-kararsiz'],
                kararsizEtiketler: []
            },
            { id: 'eeeeeeeeeee', anaKonu: 'site-yeni-konu' }
        ]
    };
    const db = dbKur(j);
    assert.strictEqual(db.sayac.video, 1, 'bilinen etiketi kalan kayıt korunur');
    assert.strictEqual(db.sayac.atlanan, 1, 'tamamen bilinmeyen kayıt boş kalınca atlanır');
    assert.ok(db.sayac.yokSayilan >= 4);
    assert.ok(db.uyarilar.some(u => u.includes('yok sayılan')));
    const v = db.videoBul('ddddddddddd');
    assert.strictEqual(v.anaKonu, null);
    assert.deepStrictEqual(v.yanKonular, [], 'ana konu bilinmiyorsa yan konular da düşer');
    assert.deepStrictEqual(v.etiketler, ['kufur']);
    assert.deepStrictEqual(v.kararsizKonular, []);
});

test('desteklenmeyen şema, null ve bozuk alanlar çökmez, boş veritabanı döner', () => {
    assert.strictEqual(dbKur({ sema: 2, kanallar: [] }).sayac.kanal, 0);
    assert.ok(dbKur({ sema: 2 }).hatalar[0].includes('sema'));
    assert.doesNotThrow(() => dbKur(null));
    assert.doesNotThrow(() => dbKur({ sema: 1, kanallar: 'x', videolar: 5 }));
    assert.strictEqual(dbKur(null).videoBul('abcdefghijk'), null);
});

test('aynı id iki kez gelirse sonuncusu geçerli olur', () => {
    const j = ornek();
    j.videolar.push({ id: 'abcdefghijk', anaKonu: 'bilim' });
    assert.strictEqual(dbKur(j).videoBul('abcdefghijk').anaKonu, 'bilim');
});

test('dbSec: veriSurumu büyük olan seçilir, eşitlikte paketli kalır, geçersiz yok sayılır', () => {
    const paketli = { sema: 1, veriSurumu: 5 };
    assert.strictEqual(dbSec(paketli, { sema: 1, veriSurumu: 6 }).veriSurumu, 6);
    assert.strictEqual(dbSec(paketli, { sema: 1, veriSurumu: 5 }), paketli);
    assert.strictEqual(dbSec(paketli, { sema: 1, veriSurumu: 4 }), paketli);
    assert.strictEqual(dbSec(paketli, { sema: 9, veriSurumu: 99 }), paketli);
    assert.strictEqual(dbSec(null, { sema: 1, veriSurumu: 1 }).veriSurumu, 1);
    assert.strictEqual(dbSec(null, null), null);
});
