const test = require('node:test');
const assert = require('node:assert/strict');
const { puanla } = require('../src/puanlama.js');

const basliklar = [
    ...['teknoloji', 'haber', 'muzik', 'eglence', 'spor', 'oyun'].map(anahtar => ({ anahtar, tur: 'konu' })),
    ...['zararli', 'spam', 'olumsuz-ornek', 'ai', 'argo', 'kufur'].map(anahtar => ({ anahtar, tur: 'etiket' }))
];

// Her başlık için verilen sayıda farklı editörden oy üretir
function oylar(dagilim, baslangic = 0) {
    const gecmis = [];
    let zaman = baslangic;
    for (const [baslik, [yukari, kararsiz, asagi]] of Object.entries(dagilim)) {
        let editor = 1;
        for (let i = 0; i < yukari; i++) gecmis.push({ baslik, editor: editor++, oy: 1, zaman: zaman++ });
        for (let i = 0; i < kararsiz; i++) gecmis.push({ baslik, editor: editor++, oy: 0, zaman: zaman++ });
        for (let i = 0; i < asagi; i++) gecmis.push({ baslik, editor: editor++, oy: -1, zaman: zaman++ });
    }
    return gecmis;
}

test('tasarım notlarındaki örnek oylama', () => {
    const { sayimlar, sonuc, disaAktarilir } = puanla(basliklar, oylar({
        teknoloji: [25, 3, 2],
        haber: [10, 7, 5],
        muzik: [0, 0, 30],
        eglence: [3, 0, 3],
        spor: [0, 0, 30],
        oyun: [30, 3, 10],
        zararli: [0, 0, 30],
        spam: [0, 0, 30],
        'olumsuz-ornek': [0, 0, 30],
        ai: [10, 7, 5],
        argo: [1, 0, 0],
        kufur: [5, 5, 5]
    }));

    assert.deepEqual(sayimlar.teknoloji, { yukari: 25, kararsiz: 3, asagi: 2, net: 23 });
    assert.equal(sayimlar.oyun.net, 20);
    assert.deepEqual(sonuc, {
        anaKonu: 'teknoloji',
        yanKonular: ['haber', 'oyun'],
        kararsizKonular: ['eglence'],
        etiketler: ['ai', 'argo'],
        kararsizEtiketler: ['kufur']
    });
    assert.equal(disaAktarilir, true);
});

test('eşitlikte o puana ilk ulaşan konu ana konu olur', () => {
    const gecmis = [
        { baslik: 'teknoloji', editor: 1, oy: 1, zaman: 10 },
        { baslik: 'oyun', editor: 1, oy: 1, zaman: 5 }
    ];
    assert.equal(puanla(basliklar, gecmis).sonuc.anaKonu, 'oyun');
});

test('puanı düşüp tekrar aynı değere gelen konu için ilk ulaşma zamanı geçerlidir', () => {
    const gecmis = [
        { baslik: 'teknoloji', editor: 1, oy: 1, zaman: 1 },  // teknoloji: 1 (t=1)
        { baslik: 'oyun', editor: 1, oy: 1, zaman: 2 },       // oyun: 1 (t=2)
        { baslik: 'teknoloji', editor: 2, oy: 1, zaman: 3 },  // teknoloji: 2
        { baslik: 'teknoloji', editor: 2, oy: null, zaman: 4 } // teknoloji: tekrar 1
    ];
    const { sonuc, sayimlar } = puanla(basliklar, gecmis);
    assert.equal(sayimlar.teknoloji.net, 1);
    assert.equal(sonuc.anaKonu, 'teknoloji');
    assert.deepEqual(sonuc.yanKonular, ['oyun']);
});

test('editörün değiştirdiği oy yalnızca son hâliyle sayılır', () => {
    const gecmis = [
        { baslik: 'spor', editor: 1, oy: 1, zaman: 1 },
        { baslik: 'spor', editor: 1, oy: -1, zaman: 2 },
        { baslik: 'spor', editor: 2, oy: 1, zaman: 3 }
    ];
    assert.deepEqual(puanla(basliklar, gecmis).sayimlar.spor, { yukari: 1, kararsiz: 0, asagi: 1, net: 0 });
});

test('pozitif konu yoksa ana konu ve kararsız konu yazılmaz', () => {
    const { sonuc, disaAktarilir } = puanla(basliklar, oylar({ eglence: [2, 0, 2], spor: [0, 0, 3] }));
    assert.equal(sonuc.anaKonu, null);
    assert.deepEqual(sonuc.kararsizKonular, []);
    assert.equal(disaAktarilir, false);
});

test('yalnızca etiketi olan içerik dışa aktarılır', () => {
    const { sonuc, disaAktarilir } = puanla(basliklar, oylar({ kufur: [0, 2, 0] }));
    assert.equal(sonuc.anaKonu, null);
    assert.deepEqual(sonuc.kararsizEtiketler, ['kufur']);
    assert.equal(disaAktarilir, true);
});

test('hiç oy yoksa bilinmeyen; pasif başlığa verilen oylar yok sayılır', () => {
    const bos = puanla(basliklar, []);
    assert.equal(bos.disaAktarilir, false);
    assert.deepEqual(bos.sonuc.kararsizEtiketler, []);

    const pasif = puanla(basliklar, [{ baslik: 'silinmis-konu', editor: 1, oy: 1, zaman: 1 }]);
    assert.equal(pasif.sonuc.anaKonu, null);
});
